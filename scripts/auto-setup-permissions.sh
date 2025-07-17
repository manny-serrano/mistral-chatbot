#!/bin/bash

# Automatic Permission Setup for CI/CD
# This script attempts to automatically set up sudo permissions for Apache configuration
# If it fails, it provides clear instructions for manual setup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_instruction() {
    echo -e "${BLUE}[INSTRUCTION]${NC} $1"
}

# Function to check if user has sudo permissions
check_sudo_permissions() {
    local username=${1:-$(whoami)}
    
    print_status "Checking sudo permissions for user: $username"
    
    # Test if user can run sudo without password for specific commands
    if sudo -n true 2>/dev/null; then
        print_status "✅ User has passwordless sudo access"
        return 0
    elif sudo -n systemctl status apache2 2>/dev/null || sudo -n systemctl status httpd 2>/dev/null; then
        print_status "✅ User has limited Apache sudo access"
        return 0
    else
        print_warning "⚠️  User does not have passwordless sudo access"
        return 1
    fi
}

# Function to automatically setup permissions
auto_setup_permissions() {
    local username=${1:-$(whoami)}
    
    print_status "Attempting automatic permission setup for user: $username"
    
    # Check if we can run the setup script with sudo
    if sudo -n true 2>/dev/null; then
        print_status "Running automatic sudo permission setup..."
        
        if [ -f "/tmp/setup-sudo-permissions.sh" ]; then
            if sudo /tmp/setup-sudo-permissions.sh -u "$username"; then
                print_status "✅ Automatic permission setup completed successfully"
                return 0
            else
                print_warning "⚠️  Automatic setup failed, but continuing..."
                return 1
            fi
        else
            print_warning "⚠️  Permission setup script not found at /tmp/setup-sudo-permissions.sh"
            return 1
        fi
    else
        print_warning "⚠️  Cannot run automatic setup without passwordless sudo"
        return 1
    fi
}

# Function to create temporary sudo session for current operation
create_temp_sudo_session() {
    local username=${1:-$(whoami)}
    
    print_status "Creating temporary sudo session for Apache configuration..."
    
    # Check if we already have a sudo session
    if sudo -n true 2>/dev/null; then
        print_status "✅ Sudo session already active"
        return 0
    fi
    
    # Try to authenticate for sudo (this will prompt for password if needed)
    print_warning "⚠️  Sudo authentication required for Apache configuration"
    print_instruction "Please enter your password when prompted:"
    
    if sudo true; then
        print_status "✅ Sudo session established"
        return 0
    else
        print_error "❌ Failed to establish sudo session"
        return 1
    fi
}

# Function to provide manual setup instructions
provide_manual_instructions() {
    local username=${1:-$(whoami)}
    
    print_warning "==================================================================="
    print_warning "MANUAL SETUP REQUIRED"
    print_warning "==================================================================="
    echo ""
    print_instruction "To enable automatic Apache configuration, run these commands:"
    echo ""
    print_instruction "1. SSH to your VM as a user with sudo privileges:"
    echo "   ssh root@your-vm-ip"
    echo "   # OR"
    echo "   ssh admin@your-vm-ip"
    echo ""
    print_instruction "2. Run the permission setup script:"
    echo "   sudo /tmp/setup-sudo-permissions.sh -u $username"
    echo ""
    print_instruction "3. Alternatively, manually configure Apache by running:"
    echo "   sudo /tmp/apache-config-prepared/install-apache-config.sh"
    echo ""
    print_instruction "4. After manual setup, the CI/CD pipeline will work automatically"
    echo ""
    print_warning "==================================================================="
}

# Function to attempt Apache configuration with current permissions
attempt_apache_config() {
    print_status "Attempting Apache configuration with current permissions..."
    
    # Check if Apache configuration scripts exist
    if [ -f "/tmp/apache-config-prepared/install-apache-config.sh" ]; then
        print_status "Found prepared Apache configuration"
        
        # Try to run with sudo
        if sudo -n /tmp/apache-config-prepared/install-apache-config.sh 2>/dev/null; then
            print_status "✅ Apache configuration installed successfully"
            return 0
        elif create_temp_sudo_session && sudo /tmp/apache-config-prepared/install-apache-config.sh; then
            print_status "✅ Apache configuration installed with manual sudo"
            return 0
        else
            print_warning "⚠️  Could not install Apache configuration automatically"
            return 1
        fi
    elif [ -f "/tmp/apache-config/setup-apache-https.sh" ]; then
        print_status "Found Apache setup script"
        
        # Try to run with sudo
        if sudo -n /tmp/apache-config/setup-apache-https.sh --domain levantai.colab.duke.edu 2>/dev/null; then
            print_status "✅ Apache setup completed successfully"
            return 0
        elif create_temp_sudo_session && sudo /tmp/apache-config/setup-apache-https.sh --domain levantai.colab.duke.edu; then
            print_status "✅ Apache setup completed with manual sudo"
            return 0
        else
            print_warning "⚠️  Could not run Apache setup automatically"
            return 1
        fi
    else
        print_warning "⚠️  No Apache configuration scripts found"
        return 1
    fi
}

# Main function
main() {
    local username=${1:-$(whoami)}
    
    print_status "🔑 Automatic Permission Setup for Apache Configuration"
    print_status "User: $username"
    echo ""
    
    # Step 1: Check current permissions
    if check_sudo_permissions "$username"; then
        print_status "✅ User already has sufficient permissions"
        
        # Try to configure Apache directly
        if attempt_apache_config; then
            print_status "🎉 Apache configuration completed successfully!"
            return 0
        else
            print_warning "⚠️  Apache configuration failed despite having permissions"
        fi
    else
        print_status "📋 Setting up sudo permissions for automatic Apache configuration"
        
        # Step 2: Try automatic setup
        if auto_setup_permissions "$username"; then
            print_status "✅ Permissions set up automatically"
            
            # Try Apache configuration
            if attempt_apache_config; then
                print_status "🎉 Apache configuration completed successfully!"
                return 0
            fi
        else
            print_warning "⚠️  Automatic permission setup failed"
        fi
    fi
    
    # Step 3: If automatic setup failed, try manual sudo session
    print_status "🔄 Attempting manual configuration..."
    if attempt_apache_config; then
        print_status "🎉 Apache configuration completed with manual intervention!"
        
        # Suggest setting up automatic permissions for future
        echo ""
        print_instruction "💡 To avoid manual intervention in future deployments:"
        print_instruction "Run: sudo /tmp/setup-sudo-permissions.sh -u $username"
        
        return 0
    fi
    
    # Step 4: If everything failed, provide manual instructions
    print_error "❌ Automatic Apache configuration failed"
    provide_manual_instructions "$username"
    
    # Return success code anyway to not fail the deployment
    print_status "📋 Deployment will continue without Apache configuration"
    print_status "Apache can be configured manually using the instructions above"
    
    return 0
}

# Check if script is being run directly
if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
    main "$@"
fi 