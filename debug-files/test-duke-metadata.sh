#!/bin/bash

echo "🔍 Duke Metadata Diagnostic Script"
echo "=================================="

echo "📥 Downloading Duke metadata..."
if curl -s -f -o /tmp/duke-metadata-test.xml "https://shib.oit.duke.edu/duke-metadata-3-signed.xml"; then
    echo "✅ Metadata download successful"
    
    echo "📊 Metadata file size:"
    ls -lh /tmp/duke-metadata-test.xml
    
    echo "🔍 Looking for Duke IdP entity..."
    if grep -q "https://shib.oit.duke.edu/shibboleth-idp" /tmp/duke-metadata-test.xml; then
        echo "✅ Found Duke IdP in metadata!"
    else
        echo "❌ Duke IdP NOT found in metadata"
        echo "🔍 Available entities in metadata:"
        grep -o 'entityID="[^"]*"' /tmp/duke-metadata-test.xml | head -10
    fi
    
    echo "🔍 Checking metadata validity period..."
    if grep -o 'validUntil="[^"]*"' /tmp/duke-metadata-test.xml; then
        echo "✅ Metadata has validity period"
    else
        echo "⚠️ No validity period found"
    fi
    
    echo "🔍 Checking for XML signature..."
    if grep -q "ds:Signature" /tmp/duke-metadata-test.xml; then
        echo "✅ Metadata is signed"
    else
        echo "⚠️ Metadata does not appear to be signed"
    fi
    
    echo "📋 First 20 lines of metadata:"
    head -20 /tmp/duke-metadata-test.xml
    
    rm -f /tmp/duke-metadata-test.xml
    echo "✅ Diagnostic complete"
else
    echo "❌ Failed to download metadata from Duke"
fi 