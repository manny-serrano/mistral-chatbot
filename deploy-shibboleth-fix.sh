#!/bin/bash

# Shibboleth Configuration Deployment Script
# This script deploys the fixes for the "Missing required Duke NetID (eppn)" error

set -e

DOMAIN="levantai.colab.duke.edu"
SHIB_DIR="/etc/shibboleth"
APACHE_SITES_DIR="/etc/apache2/sites-available"
BACKUP_DIR="/etc/shibboleth/backup-$(date +%Y%m%d-%H%M%S)"

echo "🔧 Deploying Shibboleth fixes for $DOMAIN..."

# Function to print status messages
print_status() {
    echo "▶ $1"
}

print_error() {
    echo "❌ ERROR: $1" >&2
}

print_success() {
    echo "✅ $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root (use sudo)"
   exit 1
fi

# 1. Backup existing configuration
print_status "Creating backup of existing configuration..."
mkdir -p "$BACKUP_DIR"
if [ -f "$SHIB_DIR/shibboleth2.xml" ]; then
    cp "$SHIB_DIR/shibboleth2.xml" "$BACKUP_DIR/"
fi
if [ -f "$SHIB_DIR/attribute-map.xml" ]; then
    cp "$SHIB_DIR/attribute-map.xml" "$BACKUP_DIR/"
fi
if [ -f "$APACHE_SITES_DIR/mistral-app-https.conf" ]; then
    cp "$APACHE_SITES_DIR/mistral-app-https.conf" "$BACKUP_DIR/"
fi
print_success "Backup created at $BACKUP_DIR"

# 2. Deploy updated Shibboleth configuration
print_status "Deploying updated shibboleth2.xml..."
cp Web_UI/app/shibboleth2.xml "$SHIB_DIR/shibboleth2.xml"
chown shibd:shibd "$SHIB_DIR/shibboleth2.xml"
chmod 600 "$SHIB_DIR/shibboleth2.xml"
print_success "shibboleth2.xml deployed"

# 3. Deploy attribute map
print_status "Deploying attribute-map.xml..."
cp Web_UI/attribute-map.xml "$SHIB_DIR/attribute-map.xml"
chown shibd:shibd "$SHIB_DIR/attribute-map.xml"
chmod 644 "$SHIB_DIR/attribute-map.xml"
print_success "attribute-map.xml deployed"

# 4. Deploy Apache configuration
print_status "Deploying Apache HTTPS configuration..."
cp apache-config/sites-available/mistral-app-https.conf "$APACHE_SITES_DIR/"
print_success "Apache configuration deployed"

# 5. Test Shibboleth configuration
print_status "Testing Shibboleth configuration..."
if shibd -t; then
    print_success "Shibboleth configuration test passed"
else
    print_error "Shibboleth configuration test failed"
    echo "💡 Check the configuration files and try again"
    exit 1
fi

# 6. Test Apache configuration
print_status "Testing Apache configuration..."
if apache2ctl configtest; then
    print_success "Apache configuration test passed"
else
    print_error "Apache configuration test failed"
    echo "💡 Check the Apache configuration and try again"
    exit 1
fi

# 7. Restart services
print_status "Restarting Shibboleth daemon..."
systemctl restart shibd
if systemctl is-active --quiet shibd; then
    print_success "Shibboleth daemon restarted successfully"
else
    print_error "Failed to restart Shibboleth daemon"
    systemctl status shibd
    exit 1
fi

print_status "Reloading Apache configuration..."
systemctl reload apache2
if systemctl is-active --quiet apache2; then
    print_success "Apache reloaded successfully"
else
    print_error "Failed to reload Apache"
    systemctl status apache2
    exit 1
fi

# 8. Final status check
print_status "Checking service status..."
echo "📊 Service Status:"
echo "  • Shibboleth: $(systemctl is-active shibd)"
echo "  • Apache: $(systemctl is-active apache2)"

print_success "Deployment completed successfully!"
echo ""
echo "🔍 Next steps to test:"
echo "1. Visit https://$DOMAIN/dashboard (should redirect to Duke SSO)"
echo "2. Log in with your Duke NetID"
echo "3. Check logs if issues persist:"
echo "   • Shibboleth: tail -f /var/log/shibboleth/shibd.log"
echo "   • Apache: tail -f /var/log/apache2/mistral-app-ssl-error.log"
echo "   • Application: Check Next.js logs"
echo ""
echo "🐛 If you still get the EPPN error:"
echo "1. Check that your SP is registered with Duke IdP"
echo "2. Verify the eduPersonPrincipalName attribute is requested"
echo "3. Ensure users are being routed through Shibboleth authentication"
echo "4. Test the debug endpoint (only works AFTER authentication):"
echo "   https://$DOMAIN/api/auth/shibboleth?debug=true"
echo ""
echo "💡 Key fixes applied:"
echo "• Fixed EPPN format (Duke EPPN is NetID only, no @duke.edu)"
echo "• Updated middleware to redirect directly to SSO (not login page)"
echo "• Enhanced Apache Location directives for proper authentication"
echo "• Improved attribute mapping for Duke's SAML attributes" 