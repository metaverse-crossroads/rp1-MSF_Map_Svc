const https = require('https');
const fs = require('fs');
const path = require('path');

// Allow self-signed certs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const PORT = 8080;
const HOST = 'localhost';

async function verify() {
    console.log("Starting Integration Verification...");

    // 1. Verify sample.msf
    const sampleUrl = `https://${HOST}:${PORT}/fabric/sample.msf`;
    console.log(`Fetching ${sampleUrl}...`);

    try {
        const data = await fetchUrl(sampleUrl);
        const json = JSON.parse(data);
        console.log("sample.msf Content:", json);

        if (json.map && json.map.service === "MVIO") {
             console.log("PASS: sample.msf valid.");
        } else {
             console.error("FAIL: sample.msf invalid structure.");
             process.exit(1);
        }
    } catch (e) {
        console.error("FAIL: Could not fetch sample.msf", e.message);
        process.exit(1);
    }

    // 2. Mock Socket Connection (Optional but recommended)
    // For now, just confirming HTTP is up and serving files is a huge step.

    console.log("ALL TESTS PASSED.");
}

function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`Status Code: ${res.statusCode}`));
                return;
            }
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

verify();
