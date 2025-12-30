# Jules Session Context: MSF_Map_Svc Mock Database Driver

## ⚠️ CRITICAL WARNING FOR NEXT AGENT

**DO NOT POLLUTE THE REPO ROOT OR SOURCE FOLDERS WITH TEMPORARY FILES.**

*   **Work Directory:** Always create a temporary directory (e.g., `temp/` or `.work/`) for your experiments, test scripts, and logs.
*   **Git Ignore:** Ensure this temporary directory is in `.gitignore`.
*   **Source Integrity:** Only touch source files (`svc/`) when you are implementing the actual solution.
*   **Auto-Staging Hazard:** The environment may auto-stage new files. Keep your footprint small and explicit.

---

## 1. Task Overview & Requirements

**Goal:** Create a robust "Mock Database Driver" (`MVSQL_Mock`) for the `MSF_Map_Svc` that allows the service to run fully functionally without a real database connection.

**Key Requirements:**
1.  **Architecture:** Implement a class `MVSQL_Mock` that adheres to the interface used in `svc/utils.js` (specifically `Compose`, `ComposeETL`, and `Exec`).
2.  **Robustness:** The Mock must not just be a code-pass; it must support the actual application flow (handlers, ETL loop, startup).
3.  **Data Persistence:** Store data in a local JavaScript object (memory) so it survives for the life of the server process.
4.  **Bypass Install:** The Mock workflow should skip `npm run install:svc` (which uses `install.js` and requires a real DB).
5.  **Documentation:** Create `MOCK_SETUP.md` explaining how to use and verify the mock.
6.  **Verification:** Prove it works by running the actual server (`node server.js`) and verifying it starts and accepts requests.

---

## 2. Technical Insights & Lessons Learned

### The `MVSQL` Interface Contract
Investigation of the real `MVSQL_MYSQL` driver via `test_baseline_debug.js` revealed a hybrid return type for `Exec`.

*   **Observed Behavior:** `Exec` returns an **Array** (containing the recordsets/rows) BUT it also has attached properties:
    *   `result.output`: An object like `{ nResult: 0 }`.
    *   `result.recordsets`: Likely a reference to the array content or a specific structure required by `utils.js`.
*   **`utils.js` Logic:**
    *   Uses `result.output.nResult`.
    *   Iterates `result.recordsets`.
    *   Expects `result.recordsets[0][0].Object` to be a JSON string.

**Implication for Mock:**
Your `MVSQL_Mock.js` `Exec` method must return a structure that satisfies this.
```javascript
// Suggested Mock Return Structure
const result = []; // The array (can be empty or contain rows)
result.output = { nResult: 0 };
result.recordsets = [
    [ { Object: JSON.stringify({...}) } ], // Main data
    [], // Children/Other sets
    // ... matches real DB structure
];
return result;
```

### `ComposeETL`
The server calls `ComposeETL('etl_Events')` on startup. The Mock **must** handle this case. The real DB returns a specific structure for this call (seen in baseline logs):
*   Recordset 0: Events/Objects (or empty).
*   Recordset 1: `[{ nCount: 0 }]`.
*   Recordset 2: Status/Result code.

---

## 3. Current Game Plan (Resume from here)

1.  **Environment Setup**:
    *   Ensure `temp/` is created and ignored.
    *   (Optional) If you need to re-verify against real DB, you can use the `test_baseline_debug.js` below, but `MVSQL_MYSQL` requires a real MySQL instance.

2.  **Implement `svc/config/MySQL/MVSQL_Mock.js`**:
    *   Class `MVSQL_MOCK`.
    *   Constructor: Initialize `this.store`. Call `cbReady`.
    *   `Compose(sProc, ...)`: Return a query object `{ proc: sProc, args: ... }`.
    *   `ComposeETL(sProc)`: Return a query object `{ proc: sProc, isETL: true }`.
    *   `Exec(query)`:
        *   If `isETL` (e.g., `etl_Events`), return the specific mocked ETL structure (usually empty events to start).
        *   If `set_...`: Parse args, store in `this.store`, return success.
        *   If `get_...`: Retrieve from `this.store`, return formatted recordset.
        *   **Crucial:** Return the hybrid object/structure described in "Technical Insights".

3.  **Integrate**:
    *   Update `svc/config/MySQL/server.js`: Add `case 'MOCK': this.#pSQL = new MVSQL_MOCK(...);`.
    *   Update `svc/config/MySQL/settings.json`: Set `SQL.type` to `MOCK`.

4.  **Verify**:
    *   Start the server: `node svc/config/MySQL/server.js`.
    *   Watch logs for "SQL Server READY" and no crashes in the ETL loop.
    *   (Bonus) Simulate a client request if possible.

5.  **Documentation**:
    *   Write `MOCK_SETUP.md`.

---

## 4. Code Artifacts

### `temp/test_baseline_debug.js` (Preserved)
Use this to verify `MVSQL_MYSQL` behavior if you have a real DB connection.

```javascript
const { MVSQL_MYSQL } = require('@metaversalcorp/mvsql_mysql');
const Settings = require('../svc/config/MySQL/settings.json'); // Adjust path

async function run() {
    console.log("Initializing Real MySQL Driver...");

    let pSQL;

    await new Promise((resolve, reject) => {
        pSQL = new MVSQL_MYSQL(Settings.SQL.config, (instance, err) => {
            if (err) reject(err);
            else resolve(instance);
        });
    });

    console.log("\n--- Testing ComposeETL ---");
    const etlQuery = pSQL.ComposeETL('etl_Events');

    if (etlQuery) {
        const result = await pSQL.Exec(etlQuery);
        console.log("Result Type:", typeof result);
        console.log("Is Array:", Array.isArray(result));
        console.log("Result Keys:", Object.keys(result));
        console.log("result.output:", result.output);

        if (Array.isArray(result)) {
             console.log("Last element:", result[result.length - 1]);
        }
    }
    process.exit(0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
```

### `svc/utils.js` Snippet (Usage Reference)

```javascript
// How Exec result is used
function MemResult (pResult, result)
{
   pResult.nResult = result.output.nResult; // Expects .output.nResult

   if (pResult.nResult == 0)
   {
      pResult.Parent = JSON.parse (result.recordsets[0][0].Object); // Expects .recordsets
      // ...
   }
}
```
