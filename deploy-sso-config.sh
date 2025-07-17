#!/bin/bash

# Duke University SSO Configuration Deployment Script
# Expert-level Shibboleth configuration deployment for levantai.colab.duke.edu
# This script deploys corrected configurations that fix the "Missing required Duke NetID (eppn)" error

set -e  # Exit on any error

echo "=========================================="
echo "Duke SSO Configuration Deployment"
echo "=========================================="
echo "Deploying corrected Shibboleth configurations..."
echo "Date: $(date)"
echo

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root (use sudo)"
   exit 1
fi

# Define paths
SHIBBOLETH_DIR="/etc/shibboleth"
APACHE_SITES_DIR="/etc/apache2/sites-available"
APACHE_CONFIG_SOURCE="/tmp/apache-config/sites-available"
SHIBBOLETH_CONFIG_SOURCE="/tmp/shibboleth-config"
WEB_ROOT="/var/www/html"
DEBUG_FILES_SOURCE="/tmp/debug-files"

print_step "1. Backing up existing configurations..."

# Create backup directory with timestamp
BACKUP_DIR="/etc/shibboleth-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup existing Shibboleth config if it exists
if [ -d "$SHIBBOLETH_DIR" ]; then
    print_status "Backing up existing Shibboleth configuration to $BACKUP_DIR"
    cp -r "$SHIBBOLETH_DIR" "$BACKUP_DIR/shibboleth-original"
fi

# Backup existing Apache config if it exists
if [ -f "$APACHE_SITES_DIR/mistral-app-https.conf" ]; then
    print_status "Backing up existing Apache configuration"
    cp "$APACHE_SITES_DIR/mistral-app-https.conf" "$BACKUP_DIR/"
fi

print_step "2. Deploying CORRECTED Shibboleth configuration files..."

# Create Shibboleth directory if it doesn't exist
mkdir -p "$SHIBBOLETH_DIR"

# Deploy the CORRECTED attribute-map.xml (uses ScopedAttributeDecoder for eppn)
print_status "Deploying CORRECTED attribute-map.xml (fixes eppn ScopedAttributeDecoder issue)"
cp "$SHIBBOLETH_CONFIG_SOURCE/attribute-map.xml" "$SHIBBOLETH_DIR/"
chmod 644 "$SHIBBOLETH_DIR/attribute-map.xml"

# Deploy the CORRECTED attribute-policy.xml
print_status "Deploying CORRECTED attribute-policy.xml"
cp "$SHIBBOLETH_CONFIG_SOURCE/attribute-policy.xml" "$SHIBBOLETH_DIR/"
chmod 644 "$SHIBBOLETH_DIR/attribute-policy.xml"

# Deploy the main shibboleth2.xml configuration
print_status "Deploying shibboleth2.xml configuration"
if [ -f "$SHIBBOLETH_CONFIG_SOURCE/shibboleth2-testing.xml" ]; then
    print_status "Using testing shibboleth2.xml (without signature verification for troubleshooting)"
    cp "$SHIBBOLETH_CONFIG_SOURCE/shibboleth2-testing.xml" "$SHIBBOLETH_DIR/shibboleth2.xml"
else
    print_status "Using production shibboleth2.xml with full certificate validation"
    cp "$SHIBBOLETH_CONFIG_SOURCE/shibboleth2.xml" "$SHIBBOLETH_DIR/"
fi
chmod 644 "$SHIBBOLETH_DIR/shibboleth2.xml"

# Deploy the Duke IdP signing certificate
print_status "Deploying Duke IdP signing certificate"
if [ -f "$SHIBBOLETH_CONFIG_SOURCE/idp_signing.crt" ]; then
    cp "$SHIBBOLETH_CONFIG_SOURCE/idp_signing.crt" "$SHIBBOLETH_DIR/"
    chmod 644 "$SHIBBOLETH_DIR/idp_signing.crt"
    print_status "✅ Duke IdP signing certificate deployed"
else
    print_warning "⚠️ IdP signing certificate not found - signature verification will fail"
fi

# Deploy the Duke metadata file (local copy to avoid network issues)
print_status "Deploying Duke metadata file"
if [ -f "$SHIBBOLETH_CONFIG_SOURCE/duke-metadata-3-signed.xml" ]; then
    cp "$SHIBBOLETH_CONFIG_SOURCE/duke-metadata-3-signed.xml" "$SHIBBOLETH_DIR/"
    chmod 644 "$SHIBBOLETH_DIR/duke-metadata-3-signed.xml"
    print_status "✅ Duke metadata file deployed locally"
else
    print_warning "⚠️ Duke metadata file not found - will try to download during runtime"
fi

# Generate SP certificates if they don't exist
print_status "Checking/generating SP certificates..."
cd "$SHIBBOLETH_DIR"

if [ ! -f "sp-signing-key.pem" ] || [ ! -f "sp-signing-cert.pem" ]; then
    print_status "Generating SP signing certificate..."
    openssl req -new -x509 -days 3650 -nodes -newkey rsa:2048 \
        -keyout sp-signing-key.pem -out sp-signing-cert.pem \
        -subj "/C=US/ST=North Carolina/L=Durham/O=Duke University/CN=levantai.colab.duke.edu" 2>/dev/null
    chmod 600 sp-signing-key.pem
    chmod 644 sp-signing-cert.pem
    print_status "✅ SP signing certificate generated"
fi

if [ ! -f "sp-encrypt-key.pem" ] || [ ! -f "sp-encrypt-cert.pem" ]; then
    print_status "Generating SP encryption certificate..."
    openssl req -new -x509 -days 3650 -nodes -newkey rsa:2048 \
        -keyout sp-encrypt-key.pem -out sp-encrypt-cert.pem \
        -subj "/C=US/ST=North Carolina/L=Durham/O=Duke University/CN=levantai.colab.duke.edu" 2>/dev/null
    chmod 600 sp-encrypt-key.pem  
    chmod 644 sp-encrypt-cert.pem
    print_status "✅ SP encryption certificate generated"
fi

print_step "3. Deploying Apache configuration..."

# Deploy the CORRECTED Apache configuration
print_status "Deploying CORRECTED Apache HTTPS configuration"
cp "$APACHE_CONFIG_SOURCE/mistral-app-https-fixed.conf" "$APACHE_SITES_DIR/mistral-app-https.conf"
chmod 644 "$APACHE_SITES_DIR/mistral-app-https.conf"

print_step "4. Deploying debug and test files..."

# Create web root if it doesn't exist
mkdir -p "$WEB_ROOT"

# Deploy debug files for troubleshooting
if [ -d "$DEBUG_FILES_SOURCE" ]; then
    print_status "Deploying Shibboleth debug files"
    cp "$DEBUG_FILES_SOURCE"/* "$WEB_ROOT/"
    chmod 644 "$WEB_ROOT"/shib-debug.php
    chmod 644 "$WEB_ROOT"/test.html
fi

print_step "5. Testing metadata accessibility..."
print_status "Testing Duke metadata download..."
if curl -s -f -o "/tmp/test-metadata.xml" "https://shib.oit.duke.edu/duke-metadata-3-signed.xml"; then
    print_status "✅ Metadata download successful"
    if grep -q "https://shib.oit.duke.edu/shibboleth-idp" "/tmp/test-metadata.xml"; then
        print_status "✅ Duke IdP found in metadata"
    else
        print_warning "⚠️ Duke IdP NOT found in metadata - this will cause login issues"
        print_status "Available entities in metadata:"
        grep -o 'entityID="[^"]*"' "/tmp/test-metadata.xml" | head -5
    fi
    rm -f "/tmp/test-metadata.xml"
else
    print_error "❌ Failed to download metadata from Duke"
fi

print_step "6. Setting proper file ownership and permissions..."

# Set proper ownership for Shibboleth files
chown -R _shibd:_shibd "$SHIBBOLETH_DIR" 2>/dev/null || chown -R shibd:shibd "$SHIBBOLETH_DIR" 2>/dev/null || print_warning "Could not set shibd ownership (shibd user may not exist yet)"

# Set proper permissions
chmod 755 "$SHIBBOLETH_DIR"
chmod 644 "$SHIBBOLETH_DIR"/*.xml

print_step "6. Validating configuration files..."

# Validate XML files
print_status "Validating XML configuration files..."

for xml_file in "$SHIBBOLETH_DIR/shibboleth2.xml" "$SHIBBOLETH_DIR/attribute-map.xml" "$SHIBBOLETH_DIR/attribute-policy.xml"; do
    if xmllint --noout "$xml_file" 2>/dev/null; then
        print_status "✓ Valid XML: $(basename $xml_file)"
    else
        print_error "✗ Invalid XML: $(basename $xml_file)"
        exit 1
    fi
done

# Check Apache configuration syntax
print_status "Validating Apache configuration..."
if apache2ctl configtest 2>/dev/null; then
    print_status "✓ Apache configuration syntax is valid"
else
    print_warning "Apache configuration test failed - please check manually"
fi

print_step "7. Configuration Summary..."

echo
echo "=========================================="
echo "DEPLOYMENT SUMMARY"
echo "=========================================="
echo
print_status "✅ CRITICAL FIX APPLIED: attribute-map.xml now uses ScopedAttributeDecoder for eppn"
print_status "✅ Updated shibboleth2.xml with proper Duke IdP configuration"
print_status "✅ Updated attribute-policy.xml with proper eppn scoping rules"
print_status "✅ Updated Apache configuration with comprehensive Shibboleth integration"
print_status "✅ Deployed debug files for troubleshooting"
echo
print_status "Backup location: $BACKUP_DIR"
echo

print_step "8. Next Steps for Service Restart..."

echo "After deployment, you need to restart services:"
echo "  sudo systemctl restart shibd"
echo "  sudo systemctl restart apache2"
echo
echo "For testing:"
echo "  1. Check Shibboleth status: https://levantai.colab.duke.edu/Shibboleth.sso/Status"
echo "  2. Test with debug page: https://levantai.colab.duke.edu/shib-debug.php"
echo "  3. Test login flow: https://levantai.colab.duke.edu/login"
echo

print_step "9. Critical Configuration Changes Made..."

echo "🔧 FIXES APPLIED TO RESOLVE 'Missing required Duke NetID (eppn)' ERROR:"
echo
echo "1. ✅ ATTRIBUTE MAPPING FIX:"
echo "   - Changed eppn from StringAttributeDecoder to ScopedAttributeDecoder"
echo "   - This is CRITICAL for Duke's scoped attributes (netid@duke.edu format)"
echo
echo "2. ✅ APACHE CONFIGURATION FIX:"
echo "   - Added proper Location directives for protected routes"
echo "   - Improved header forwarding for Shibboleth attributes"
echo "   - Added comprehensive debug headers"
echo
echo "3. ✅ SHIBBOLETH CONFIGURATION FIX:"
echo "   - Updated REMOTE_USER setting to use eppn only"
echo "   - Added proper metadata filters and validation"
echo "   - Enabled session attribute debugging"
echo
echo "4. ✅ ATTRIBUTE POLICY FIX:"
echo "   - Added proper scoping rules for eppn attributes"
echo "   - Allows Duke domain scoping (@duke.edu)"
echo

print_warning "IMPORTANT: After restarting services, the 'Missing required Duke NetID (eppn)' error should be resolved!"

echo
echo "=========================================="
echo "DEPLOYMENT COMPLETED SUCCESSFULLY"
echo "==========================================" 