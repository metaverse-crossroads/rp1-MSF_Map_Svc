#!/bin/bash
set -euo pipefail

FABRIC_URL="${1:-https://cdn2.rp1.com/config/enter.msf}"

# Extract the base Origin for valid cross-origin requests
ORIGIN=$(echo "$FABRIC_URL" | awk -F/ '{print $1"//"$3}')

echo "Fetching MSF config from: $FABRIC_URL"
CONNECT_STRING=$(curl -s "$FABRIC_URL" | jq -r '.map.sConnect')

if [ "$CONNECT_STRING" = "null" ]; then
  echo "Error: Could not find .map.sConnect in MSF config"
  exit 1
fi

WS_URL=$(echo "$CONNECT_STRING" | \
  sed -n 's/.*server=\([^;]*\).*/\1/p' | \
  awk '{print "wss://" $0 "/socket.io/?EIO=4&transport=websocket"}'
)

echo "Declaring Origin: $ORIGIN"
echo "Connecting to: $WS_URL"

(
  # Wait for initial 0{"sid"...} connection
  sleep 1 
  
  # Step 1: Connect to Socket.io default namespace
  echo '40'
  sleep 0.5
  
  # Step 2: Request the Root Object (RMRoot ID 0)
  echo '420["RMRoot:update",{"twRMRootIx":0}]'
  
  # Keep pipe open to catch the JSON firehose
  sleep 15
) | websocat -k -t \
    "$WS_URL" \
    -H "Origin: $ORIGIN" \
    -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36"
