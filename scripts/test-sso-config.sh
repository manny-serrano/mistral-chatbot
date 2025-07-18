#!/bin/bash

# Duke University SSO Configuration Testing Script
# Tests the complete Shibboleth SP configuration for levantai.colab.duke.edu

echo "🧪 Duke SSO Configuration Testing"
echo "=================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

test_pass() {
    echo -e "${GREEN}✅ PASS:${NC} $1"
}

test_fail() {
    echo -e "${RED}❌ FAIL:${NC} $1"
}

test_warn() {
    echo -e "${YELLOW}⚠️ WARN:${NC} $1"
}

test_info() {
    echo -e "${BLUE}ℹ️ INFO:${NC} $1"
}

# Test 1: Service Status
echo
echo "Test 1: Service Status"
echo "----------------------"

if systemctl is-active --quiet shibd; then
    test_pass "Shibboleth daemon is running"
else
    test_fail "Shibboleth daemon is not running"
    echo "Try: sudo systemctl start shibd"
fi

if systemctl is-active --quiet apache2; then
    test_pass "Apache2 is running"
else
    test_fail "Apache2 is not running"
    echo "Try: sudo systemctl start apache2"
fi

# Test 2: Configuration Files
echo
echo "Test 2: Configuration Files"
echo "---------------------------"

SHIBBOLETH_DIR="/etc/shibboleth"

# Check main config files
for file in "shibboleth2.xml" "attribute-map.xml" "attribute-policy.xml"; do
    if [ -f "$SHIBBOLETH_DIR/$file" ]; then
        if xmllint --noout "$SHIBBOLETH_DIR/$file" 2>/dev/null; then
            test_pass "$file exists and is valid XML"
        else
            test_fail "$file exists but has XML syntax errors"
        fi
    else
        test_fail "$file is missing"
    fi
done

# Check certificates
if [ -f "$SHIBBOLETH_DIR/idp_signing.crt" ]; then
    if openssl x509 -in "$SHIBBOLETH_DIR/idp_signing.crt" -text -noout > /dev/null 2>&1; then
        test_pass "Duke IdP signing certificate is valid"
        # Check if it's the correct Duke certificate
        DUKE_SUBJECT=$(openssl x509 -in "$SHIBBOLETH_DIR/idp_signing.crt" -subject -noout | grep "duke.edu")
        if [ -n "$DUKE_SUBJECT" ]; then
            test_pass "Certificate is from Duke University"
        else
            test_warn "Certificate may not be from Duke University"
        fi
    else
        test_fail "Duke IdP signing certificate is invalid"
    fi
else
    test_fail "Duke IdP signing certificate is missing"
fi

# Check SP certificates
for cert in "sp-signing-cert.pem" "sp-encrypt-cert.pem"; do
    if [ -f "$SHIBBOLETH_DIR/$cert" ]; then
        if openssl x509 -in "$SHIBBOLETH_DIR/$cert" -text -noout > /dev/null 2>&1; then
            test_pass "$cert is valid"
        else
            test_fail "$cert is invalid"
        fi
    else
        test_warn "$cert is missing (will be auto-generated)"
    fi
done

# Test 3: Network Connectivity
echo
echo "Test 3: Network Connectivity"
echo "----------------------------"

# Test Duke metadata download
if curl -s -f -o /tmp/test-duke-metadata.xml "https://shib.oit.duke.edu/duke-metadata-3-signed.xml"; then
    test_pass "Duke metadata is accessible"
    
    # Check if metadata contains Duke IdP
    if grep -q "https://shib.oit.duke.edu/shibboleth-idp" /tmp/test-duke-metadata.xml 2>/dev/null; then
        test_pass "Duke IdP found in metadata"
    else
        test_warn "Duke IdP not found in metadata"
    fi
    
    rm -f /tmp/test-duke-metadata.xml
else
    test_fail "Cannot download Duke metadata"
fi

# Test 4: Shibboleth Endpoints
echo
echo "Test 4: Shibboleth Endpoints"
echo "----------------------------"

BASE_URL="https://levantai.colab.duke.edu"

# Test Status endpoint
if curl -k -s -f "$BASE_URL/Shibboleth.sso/Status" > /dev/null; then
    STATUS_RESPONSE=$(curl -k -s "$BASE_URL/Shibboleth.sso/Status")
    if echo "$STATUS_RESPONSE" | grep -q "OK"; then
        test_pass "Shibboleth Status endpoint is working"
    else
        test_warn "Shibboleth Status endpoint responds but may have issues"
        test_info "Response: $(echo "$STATUS_RESPONSE" | head -3)"
    fi
else
    test_fail "Shibboleth Status endpoint is not accessible"
fi

# Test Metadata endpoint
if curl -k -s -f "$BASE_URL/Shibboleth.sso/Metadata" > /dev/null; then
    METADATA_RESPONSE=$(curl -k -s "$BASE_URL/Shibboleth.sso/Metadata")
    if echo "$METADATA_RESPONSE" | grep -q "EntityDescriptor"; then
        test_pass "Shibboleth Metadata endpoint is working"
        
        # Check if our entity ID is correct
        if echo "$METADATA_RESPONSE" | grep -q "entityID=\"https://levantai.colab.duke.edu\""; then
            test_pass "Entity ID is correctly configured"
        else
            test_warn "Entity ID may not be correctly configured"
        fi
    else
        test_warn "Shibboleth Metadata endpoint responds but content may be invalid"
    fi
else
    test_fail "Shibboleth Metadata endpoint is not accessible"
fi

# Test 5: Configuration Validation
echo
echo "Test 5: Configuration Validation"
echo "--------------------------------"

# Check if the entity ID matches in config vs metadata
CONFIG_ENTITY_ID=$(grep -o 'entityID="[^"]*"' "$SHIBBOLETH_DIR/shibboleth2.xml" | cut -d'"' -f2)
if [ "$CONFIG_ENTITY_ID" = "https://levantai.colab.duke.edu" ]; then
    test_pass "Entity ID in configuration is correct"
else
    test_fail "Entity ID in configuration is incorrect: $CONFIG_ENTITY_ID"
fi

# Check REMOTE_USER attribute
if grep -q 'REMOTE_USER="eppn"' "$SHIBBOLETH_DIR/shibboleth2.xml"; then
    test_pass "REMOTE_USER is set to eppn (Duke NetID)"
else
    test_warn "REMOTE_USER may not be set correctly for Duke NetID"
fi

# Test 6: Log File Check
echo
echo "Test 6: Log File Analysis"
echo "------------------------"

SHIBD_LOG="/var/log/shibboleth/shibd.log"
if [ -f "$SHIBD_LOG" ]; then
    test_pass "Shibboleth log file exists"
    
    # Check for recent errors
    RECENT_ERRORS=$(tail -100 "$SHIBD_LOG" | grep -i error | wc -l)
    if [ "$RECENT_ERRORS" -eq 0 ]; then
        test_pass "No recent errors in Shibboleth logs"
    else
        test_warn "Found $RECENT_ERRORS recent errors in Shibboleth logs"
        echo "Recent errors:"
        tail -100 "$SHIBD_LOG" | grep -i error | tail -3
    fi
    
    # Check for metadata loading
    if tail -100 "$SHIBD_LOG" | grep -q "loaded metadata"; then
        test_pass "Metadata appears to be loading successfully"
    else
        test_warn "No recent metadata loading messages found"
    fi
else
    test_warn "Shibboleth log file not found"
fi

# Test Summary
echo
echo "Test Summary"
echo "============"
echo "🔗 Test the SSO login at: $BASE_URL/login"
echo "📊 Check Shibboleth status: $BASE_URL/Shibboleth.sso/Status"
echo "📋 View SP metadata: $BASE_URL/Shibboleth.sso/Metadata"
echo
echo "If tests pass but login still fails, check:"
echo "1. Duke NetID service status"
echo "2. Network connectivity to shib.oit.duke.edu"
echo "3. Apache virtual host configuration"
echo "4. Shibboleth log files in /var/log/shibboleth/"

echo
echo "SSO Configuration Testing Complete" 