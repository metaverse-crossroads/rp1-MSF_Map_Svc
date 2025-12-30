#!/bin/bash
mkdir -p temp/ssl
if [ ! -f temp/ssl/server.key ]; then
    echo "Generating self-signed SSL certificates..."
    openssl req -new -newkey rsa:2048 -days 365 -nodes -x509 \
        -keyout temp/ssl/server.key -out temp/ssl/server.cert \
        -subj "/C=US/ST=State/L=City/O=MockOrg/CN=localhost"
    echo "Certificates generated in temp/ssl/"
else
    echo "Certificates already exist in temp/ssl/"
fi
