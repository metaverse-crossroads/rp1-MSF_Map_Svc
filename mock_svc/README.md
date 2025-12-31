# Mocked Metaverse Server

This directory contains a self-contained, idempotent environment for running a Mock Metaverse Server. It replaces the standard database with an in-memory mock driver (`MVSQL_Mock.js`), allowing for rapid testing and protocol analysis without external dependencies like MySQL or SQL Server.

## Principles

*   **Self-Contained:** All logic, configuration, and patches required to run the mock environment reside within this `mock_svc` directory (with the exception of the shared `web` assets).
*   **Idempotent:** The environment allows for "clean room" experimentation. It can be reset and re-instrumented easily using the provided patches.
*   **Observation:** The primary goal of this mock service is to provide "glass box" visibility into the protocol negotiation between the server and clients (RP1), utilizing structured NDJSON logging.

## Instrumentation & Patches

To enable detailed encounter logging (NDJSON) within the core dependencies (which are normally black boxes), we provide a set of micropatches.

*   **Location:** `mock_svc/patches/`
*   **Instructions:** See `mock_svc/patches/README.md` for details on how to apply these patches to `node_modules`.

## Setup & Running

### 1. Install Dependencies
Navigate to the repository root and run:
```bash
npm install
```

### 2. Generate SSL Certificates
The service requires SSL. Generate self-signed certificates:
```bash
bash mock_svc/scripts/generate_certs.sh
```

### 3. Apply Instrumentation (Optional but Recommended)
To see detailed traffic logs:
1.  Backup `node_modules` (optional).
2.  Apply the patch:
    ```bash
    patch -p0 < mock_svc/patches/mvsf_instrumentation.patch
    ```

### 4. Start the Server
```bash
node mock_svc/server.js
```
You will see `{"at":...}` logs indicating server activity.

### 5. Configure Client
Edit `web/public/fabric/sample.msf` to point to `localhost:8080`.

## Directory Structure

*   `MVSQL_Mock.js`: The in-memory database driver.
*   `server.js`: The entry point for the mock service.
*   `settings.json`: Configuration for the mock environment.
*   `scripts/`: Helper scripts (e.g., certificate generation).
*   `patches/`: Micropatches for `node_modules` to enable deep logging.
