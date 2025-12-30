# Mocked Metaverse Server Setup Guide

This guide provides instructions for setting up a **fully functional Mock Metaverse Server**. This server replaces the standard database dependency with an in-memory mock driver, allowing you to test integration with the RP1 grid without setting up MySQL or SQL Server.

## Prerequisites

*   Node.js installed.
*   Git.
*   `openssl` (for generating self-signed certificates).

## Step 1: Install Dependencies

1.  Navigate to the repository root.
2.  Install dependencies:
    ```bash
    npm install
    ```
    *Note: You do not need to run any `build:...` or `install:svc` scripts used in the standard tutorial.*

## Step 2: Generate SSL Certificates

The service requires SSL certificates to communicate. We will generate self-signed certificates for testing.

1.  Run the generation script:
    ```bash
    bash mock_svc/scripts/generate_certs.sh
    ```
    This creates `server.key` and `server.cert` in `temp/ssl/`.

## Step 3: Start the Mock Server

Instead of running from the `dist` folder, we run the mock server directly using a specialized entry point that mimics the production environment.

1.  Start the server:
    ```bash
    node mock_svc/server.js
    ```
2.  You should see:
    ```
    SQL Server READY
    Server running on port 8080
    ```

## Step 4: Configure `sample.msf`

The mock server serves the `web/public` directory just like the production server. You must configure the public definition file to point to your local instance.

1.  Edit `web/public/fabric/sample.msf`.
2.  Replace `<PUBLIC_DOMAIN>` with `localhost:8080`.
3.  Replace `<MY_COMPANY_ID>` with your Company ID (or a test ID like `MockCorp`).

    *Example:*
    ```json
    {
       "map": {
          "namespace": "MockCorp/map",
          "service": "MVIO",
          "require": "MVRP_Map",
          "connect": "secure=true;server=localhost:8080;session=RP1",
          "bAuth":   false,
          "RootUrl": "https://localhost:8080",
          "Scene":   1
       }
    }
    ```

## Step 5: Verification

We have provided a verification script to ensure your mock server is responding correctly and serving the configuration required for RP1 attachment.

1.  With the server running (Step 3), open a new terminal.
2.  Run the verification script:
    ```bash
    node mock_svc/verify_integration.js
    ```
3.  Success Output:
    ```
    PASS: sample.msf valid.
    ALL TESTS PASSED.
    ```

## Step 6: Attach to RP1

You can now use the URL `https://localhost:8080/fabric/sample.msf` to attach your fabric in the RP1 developer portal. The mock server will handle the handshake and simulate a running spatial fabric.
