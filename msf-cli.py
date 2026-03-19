#!/usr/bin/env python3
import sys
import json
import re
import urllib.request
from urllib.parse import urlparse
import time
import websocket
import ssl

# Set to keep track of requested IDs to avoid duplicate requests
requested_objects = set()

def fetch_msf_config(url):
    """Fetches the MSF configuration JSON."""
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    print(f"[*] Fetching MSF config from: {url}")
    with urllib.request.urlopen(req) as response:
        if response.status != 200:
            print(f"[!] Error: HTTP {response.status}")
            sys.exit(1)
        data = response.read().decode('utf-8')
        return json.loads(data)

def get_websocket_url(msf_data):
    """Extracts the WebSocket URL from the .map.sConnect string."""
    try:
        connect_string = msf_data['map']['sConnect']
        # e.g., 'server=spatial.patchedreality.com/socket.io/?EIO=4&transport=websocket'
        match = re.search(r'server=([^;]+)', connect_string)
        if match:
            host_path = match.group(1)
            return f"wss://{host_path}/socket.io/?EIO=4&transport=websocket"
        else:
            print("[!] Could not extract server from sConnect string.")
            sys.exit(1)
    except KeyError as e:
        print(f"[!] Missing expected key in MSF config: {e}")
        sys.exit(1)

def on_message(ws, message):
    global requested_objects

    # Engine.IO connect message: 0{"sid":"..."}
    if message.startswith('0'):
        print("[<] Engine.IO Connect received")
        print("[>] Sending Socket.IO connect (40)")
        ws.send('40')

    # Socket.IO connect message: 40{"sid":"..."}
    elif message.startswith('40'):
        print("[<] Socket.IO Connected")
        print("[>] Requesting RMRoot:update (ID 0)")
        request_cmd = '420["RMRoot:update",{"twRMRootIx":0}]'
        ws.send(request_cmd)
        requested_objects.add("RMRoot:update:0")

    # Engine.IO ping message: 2
    elif message == '2':
        ws.send('3')  # send pong
        print("[<] Ping received, [>] sent Pong")

    # Socket.IO event message: 42[...]
    elif message.startswith('42'):
        try:
            # Parse the JSON array part of the message
            payload = json.loads(message[2:])
            event_name = payload[0]
            event_data = payload[1] if len(payload) > 1 else {}

            print(f"\n[<] Received Event: {event_name}")
            print(json.dumps(event_data, indent=2))

            # Simple automatic traversal logic.
            # Look for common arrays of child IDs or nested child objects.
            traverse_children(ws, event_data)

        except json.JSONDecodeError:
            print(f"[!] Failed to parse Socket.IO payload: {message}")

    # Socket.IO ack message: 43[...]
    elif message.startswith('43'):
        try:
            # Format: 43<ack_id>[payload]
            match = re.match(r'^43(\d+)(.*)$', message)
            if match:
                ack_id = match.group(1)
                payload_str = match.group(2)
                payload = json.loads(payload_str) if payload_str else {}
                print(f"\n[<] Received Ack (ID {ack_id}):")
                print(json.dumps(payload, indent=2))

                # Check for errors in Ack response
                if isinstance(payload, list) and len(payload) > 0:
                    first_item = payload[0]
                    if isinstance(first_item, dict) and first_item.get('nResult') == -2:
                        print(f"[!] Ack indicates error: {json.dumps(first_item)}")

                        # Fallback heuristic: If RMRoot 0 is invalid, try RMTObject 1
                        if ack_id == "0":
                            print("[>] Fallback: RMRoot:update failed, trying RMTObject:update (ID 1)")
                            fallback_cmd = '421["RMTObject:update",{"twRMTObjectIx":1}]'
                            ws.send(fallback_cmd)
                            requested_objects.add("RMTObject:update:1")

                # Also try traversal on ack payloads, as they might contain children
                traverse_children(ws, payload)
            else:
                print(f"\n[<] Received Ack (unparsed): {message}")

        except json.JSONDecodeError:
            print(f"[!] Failed to parse Socket.IO Ack payload: {message}")

def traverse_children(ws, data):
    """Inspects event data and sends requests for child objects recursively."""
    global requested_objects

    # Class ID mapping to object update event strings
    # 70: RMRoot, 71: RMCObject, 72: RMTObject, 73: RMPObject
    class_to_event = {
        71: 'RMCObject:update',
        72: 'RMTObject:update',
        73: 'RMPObject:update'
    }

    if isinstance(data, dict):
        # Handle "aChild" arrays or known arrays containing "pObjectHead" structures
        if "pObjectHead" in data:
            head = data["pObjectHead"]
            class_id = head.get("wClass_Object")
            obj_id = head.get("twObjectIx")

            if class_id in class_to_event and obj_id is not None:
                event_type = class_to_event[class_id]

                # Based on MSF schema, the request parameter name depends on the class
                param_name = "twID"
                if class_id == 71: param_name = "twRMCObjectIx"
                elif class_id == 72: param_name = "twRMTObjectIx"
                elif class_id == 73: param_name = "twRMPObjectIx"

                obj_key = f"{event_type}:{obj_id}"
                if obj_key not in requested_objects:
                    print(f"[>] Discovered child {obj_key} (Class {class_id}), sending request...")
                    requested_objects.add(obj_key)
                    # Use ack ID 422+ for dynamic traversals to separate them from init
                    ack_num = len(requested_objects) + 420
                    req = f'{ack_num}["{event_type}",{{"{param_name}":{obj_id}}}]'
                    ws.send(req)

        # Specific known arrays representing children in MSF architecture (fallback keys)
        child_types = {
            'RMCChildren': 'RMCObject:update',
            'RMTChildren': 'RMTObject:update',
            'RMPChildren': 'RMPObject:update'
        }

        for key, event_type in child_types.items():
            if key in data and isinstance(data[key], list):
                for child in data[key]:
                    child_id = None
                    if isinstance(child, dict) and 'twID' in child:
                        child_id = child['twID']
                    elif isinstance(child, int):
                        child_id = child

                    if child_id is not None:
                        obj_key = f"{event_type}:{child_id}"
                        if obj_key not in requested_objects:
                            print(f"[>] Discovered child via {key}: {obj_key}, sending request...")
                            requested_objects.add(obj_key)
                            ack_num = len(requested_objects) + 420
                            req = f'{ack_num}["{event_type}",{{"twID":{child_id}}}]'
                            ws.send(req)

        # Recursively traverse other dictionary items to look for nested structures.
        for k, v in data.items():
            if isinstance(v, (dict, list)):
                traverse_children(ws, v)

    elif isinstance(data, list):
        for item in data:
            if isinstance(item, (dict, list)):
                traverse_children(ws, item)

def on_error(ws, error):
    print(f"[!] WebSocket Error: {error}")

def on_close(ws, close_status_code, close_msg):
    print("[*] WebSocket Closed")

def on_open(ws):
    print("[*] WebSocket connection opened")

def main():
    if len(sys.argv) < 2:
        print("Usage: msf-cli.py <msf_url>")
        sys.exit(1)

    url = sys.argv[1]
    parsed_url = urlparse(url)
    origin = f"{parsed_url.scheme}://{parsed_url.netloc}"

    # 1. Fetch HTTP config
    msf_config = fetch_msf_config(url)

    # 2. Extract WebSocket URL
    ws_url = get_websocket_url(msf_config)
    print(f"[*] Connecting to WebSocket: {ws_url}")
    print(f"[*] Origin: {origin}")

    # 3. Connect via raw WebSocket
    headers = [
        f"Origin: {origin}",
        "User-Agent: Mozilla/5.0 (Console msf-cli.py)"
    ]

    ws = websocket.WebSocketApp(
        ws_url,
        header=headers,
        on_open=on_open,
        on_message=on_message,
        on_error=on_error,
        on_close=on_close
    )

    # Run the WebSocket loop forever until interrupted, disabling SSL verification
    # because some endpoints use self-signed certs or standard Python envs lack certs.
    sslopt = {"cert_reqs": ssl.CERT_NONE}

    # import sys removed because it conflicts with module-level import
    sys.stdout.reconfigure(line_buffering=True)
    sys.stderr.reconfigure(line_buffering=True)

    try:
        ws.run_forever(sslopt=sslopt, ping_interval=25, ping_timeout=10, ping_payload="2")
    except KeyboardInterrupt:
        print("\n[*] Interrupted by user, exiting...")

if __name__ == "__main__":
    main()
