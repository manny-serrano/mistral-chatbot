#!/bin/bash

# Configuration comparison script
# Run this locally to compare your repository files with the working VM configuration

# Set your VM details - use environment variables if set, otherwise use defaults
VM_USER="${VM_USER:-ubuntu}"  # Use environment variable or default to 'ubuntu'
VM_HOST="${VM_HOST:-vcm-48156.vm.duke.edu}"  # Use environment variable or default

echo "🔍 Comparing local repository files with working VM configuration..."
echo ""

# Create temp directory for VM files
mkdir -p /tmp/vm_comparison

echo "📋 1. Comparing Shibboleth main configuration..."
ssh $VM_USER@$VM_HOST "sudo cat /etc/shibboleth/shibboleth2.xml" > /tmp/vm_comparison/vm_shibboleth2.xml
if diff -q shibboleth-config/shibboleth2.xml /tmp/vm_comparison/vm_shibboleth2.xml > /dev/null; then
    echo "✅ Shibboleth configuration matches"
else
    echo "❌ Shibboleth configuration differs"
    echo "   Run: diff shibboleth-config/shibboleth2.xml /tmp/vm_comparison/vm_shibboleth2.xml"
fi

echo ""
echo "📋 2. Comparing Duke metadata..."
ssh $VM_USER@$VM_HOST "sudo cat /etc/shibboleth/duke-metadata-3-signed.xml" > /tmp/vm_comparison/vm_duke_metadata.xml
if diff -q shibboleth-config/duke-metadata-3-signed.xml /tmp/vm_comparison/vm_duke_metadata.xml > /dev/null; then
    echo "✅ Duke metadata matches"
else
    echo "❌ Duke metadata differs"
    echo "   Run: diff shibboleth-config/duke-metadata-3-signed.xml /tmp/vm_comparison/vm_duke_metadata.xml"
fi

echo ""
echo "📋 3. Comparing Apache configuration..."
ssh $VM_USER@$VM_HOST "sudo cat /etc/apache2/sites-available/mistral-app-https.conf" > /tmp/vm_comparison/vm_apache_config.conf
if diff -q apache-config/sites-available/mistral-app-https-fixed.conf /tmp/vm_comparison/vm_apache_config.conf > /dev/null; then
    echo "✅ Apache configuration matches"
else
    echo "❌ Apache configuration differs"
    echo "   Run: diff apache-config/sites-available/mistral-app-https-fixed.conf /tmp/vm_comparison/vm_apache_config.conf"
fi

echo ""
echo "🔐 4. Comparing SSL certificate fingerprints..."
ssh $VM_USER@$VM_HOST "sudo openssl x509 -noout -fingerprint -sha256 -in /etc/shibboleth/sp-signing-cert.pem" > /tmp/vm_comparison/vm_cert_fingerprint.txt
# Note: SSL certificate comparison requires GitLab CI/CD variables, skipping for local comparison
echo "⚠️  SSL certificate comparison requires GitLab variables (will be verified in pipeline)"

echo ""
echo "📊 5. Checking critical Shibboleth components on VM..."
echo "   Certificate files:"
ssh $VM_USER@$VM_HOST "sudo ls -la /etc/shibboleth/sp-*.pem | grep -E '(signing|encrypt)'"
echo "   Certificate ownership:"
ssh $VM_USER@$VM_HOST "sudo stat -c '%U:%G %n' /etc/shibboleth/sp-*.pem"
echo "   Service status:"
ssh $VM_USER@$VM_HOST "sudo systemctl is-active shibd apache2"

echo ""
echo "🎯 Summary:"
echo "Files in your local repository that will be deployed:"
echo "   📁 shibboleth-config/ - $(ls shibboleth-config/ | wc -l) files"
echo "   📁 apache-config/sites-available/ - $(ls apache-config/sites-available/ | wc -l) files"
echo ""
echo "If any configurations show as different, you need to either:"
echo "   1. Update your local files to match the working VM, OR"
echo "   2. Verify your local changes are intentional improvements"
echo ""
echo "✅ Run this script after setting VM_USER and VM_HOST variables!"
