# Mock Database Driver Setup

## Overview

The `MVSQL_MOCK` driver allows the `MSF_Map_Svc` to run without a real MySQL database connection. It mocks the necessary `Compose`, `ComposeETL`, and `Exec` methods required by the service's `utils.js` and provides ephemeral in-memory storage for data persistence during the server's lifecycle.

## File Structure

All files related to the mock service are located in the `mock_svc/` directory:

*   `server.js`: The entry point for running the mock server.
*   `settings.json`: Configuration file using the `MOCK` database type and pointing to temporary SSL keys.
*   `MVSQL_Mock.js`: The mock database driver implementation.

## Running the Server with Mock

1. Ensure dependencies are installed:
   ```bash
   npm install
   ```
   (Note: You do not need to run `npm run install:svc` which sets up the real DB).

2. Create dummy SSL keys in `temp/ssl/` (this directory is git-ignored):
   ```bash
   mkdir -p temp/ssl
   touch temp/ssl/server.key temp/ssl/server.cert
   ```

3. Start the server using the mock entry point:
   ```bash
   node mock_svc/server.js
   ```

## Implementation Details

*   **ETL Support:** The mock simulates the `etl_Events` loop by returning empty event lists, keeping the server's event loop alive.
*   **Persistence:** `get_` and `set_` procedures store data in a simple in-memory JavaScript object. Data is lost when the process terminates.
*   **Hybrid Return Object:** The `Exec` method returns an array (recordsets) with attached `output` properties, mimicking the behavior of the real `MVSQL_MYSQL` driver to ensure compatibility with `utils.js`.
