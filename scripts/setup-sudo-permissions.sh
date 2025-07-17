#!/bin/bash

# Setup Sudo Permissions for Apache Configuration
# This script configures passwordless sudo for specific Apache-related commands
# Run this once on the VM to enable automatic Apache configuration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Function to check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        print_error "This script must be run as root (use sudo)"
        print_error "Run: sudo $0"
        exit 1
    fi
}

# Function to setup Apache sudo permissions
setup_apache_sudo() {
    local username=$1
    
    print_status "Setting up Apache sudo permissions for user: $username"
    
    # Create sudoers.d file for Apache configuration
    cat > "/etc/sudoers.d/apache-config-$username" << EOF
# Allow $username to manage Apache configuration without password
# This is required for CI/CD automatic deployment

# Apache service management
$username ALL=(root) NOPASSWD: /bin/systemctl reload apache2
$username ALL=(root) NOPASSWD: /bin/systemctl restart apache2
$username ALL=(root) NOPASSWD: /bin/systemctl reload httpd
$username ALL=(root) NOPASSWD: /bin/systemctl restart httpd
$username ALL=(root) NOPASSWD: /bin/systemctl status apache2
$username ALL=(root) NOPASSWD: /bin/systemctl status httpd

# Apache configuration management
$username ALL=(root) NOPASSWD: /bin/cp /tmp/apache-config/sites-available/mistral-app.conf /etc/apache2/sites-available/mistral-app.conf
$username ALL=(root) NOPASSWD: /bin/cp /tmp/apache-config/sites-available/mistral-app.conf /etc/httpd/conf.d/mistral-app.conf
$username ALL=(root) NOPASSWD: /bin/cp /tmp/apache-config-prepared/mistral-app.conf /etc/apache2/sites-available/mistral-app.conf
$username ALL=(root) NOPASSWD: /bin/cp /tmp/apache-config-prepared/mistral-app.conf /etc/httpd/conf.d/mistral-app.conf

# Apache site management (Debian/Ubuntu)
$username ALL=(root) NOPASSWD: /usr/sbin/a2ensite mistral-app.conf
$username ALL=(root) NOPASSWD: /usr/sbin/a2dissite 000-default.conf
$username ALL=(root) NOPASSWD: /usr/sbin/a2enmod *

# Apache configuration testing
$username ALL=(root) NOPASSWD: /usr/sbin/apache2ctl configtest
$username ALL=(root) NOPASSWD: /usr/sbin/httpd -t

# Allow running the Apache setup scripts
$username ALL=(root) NOPASSWD: /tmp/apache-config/setup-apache-https.sh
$username ALL=(root) NOPASSWD: /tmp/apache-config-prepared/install-apache-config.sh

# Allow installing Apache if not present
$username ALL=(root) NOPASSWD: /usr/bin/apt update
$username ALL=(root) NOPASSWD: /usr/bin/apt install -y apache2
$username ALL=(root) NOPASSWD: /usr/bin/apt install -y libapache2-mod-shib2
$username ALL=(root) NOPASSWD: /usr/bin/yum install -y httpd mod_ssl

# SSL certificate management (if using Let's Encrypt)
$username ALL=(root) NOPASSWD: /usr/bin/certbot --apache *
$username ALL=(root) NOPASSWD: /usr/bin/certbot renew
EOF

    # Set proper permissions on sudoers file
    chmod 440 "/etc/sudoers.d/apache-config-$username"
    
    # Validate sudoers file
    if visudo -c -f "/etc/sudoers.d/apache-config-$username"; then
        print_status "✅ Apache sudo permissions configured successfully"
    else
        print_error "❌ Sudoers file validation failed"
        rm "/etc/sudoers.d/apache-config-$username"
        exit 1
    fi
}

# Function to setup general CI/CD sudo permissions
setup_cicd_sudo() {
    local username=$1
    
    print_status "Setting up general CI/CD sudo permissions for user: $username"
    
    # Create sudoers.d file for CI/CD operations
    cat > "/etc/sudoers.d/cicd-$username" << EOF
# Allow $username to perform CI/CD operations without password

# Docker management
$username ALL=(root) NOPASSWD: /usr/bin/docker *
$username ALL=(root) NOPASSWD: /usr/local/bin/docker-compose *
$username ALL=(root) NOPASSWD: /usr/bin/docker-compose *

# Service management
$username ALL=(root) NOPASSWD: /bin/systemctl daemon-reload
$username ALL=(root) NOPASSWD: /bin/systemctl enable mistral-web-ui
$username ALL=(root) NOPASSWD: /bin/systemctl start mistral-web-ui
$username ALL=(root) NOPASSWD: /bin/systemctl stop mistral-web-ui
$username ALL=(root) NOPASSWD: /bin/systemctl restart mistral-web-ui
$username ALL=(root) NOPASSWD: /bin/systemctl status mistral-web-ui

# File operations for deployment
$username ALL=(root) NOPASSWD: /bin/mkdir -p /var/www/*
$username ALL=(root) NOPASSWD: /bin/chown -R $username\\:$username /var/www/*
$username ALL=(root) NOPASSWD: /bin/chmod +x /tmp/*.sh
$username ALL=(root) NOPASSWD: /bin/chmod +x /tmp/apache-config/*.sh

# Package management (limited)
$username ALL=(root) NOPASSWD: /usr/bin/apt update
$username ALL=(root) NOPASSWD: /usr/bin/apt install -y curl netcat-openbsd

# Allow updating environment
$username ALL=(root) NOPASSWD: /usr/bin/update-ca-certificates
EOF

    # Set proper permissions
    chmod 440 "/etc/sudoers.d/cicd-$username"
    
    # Validate sudoers file
    if visudo -c -f "/etc/sudoers.d/cicd-$username"; then
        print_status "✅ CI/CD sudo permissions configured successfully"
    else
        print_error "❌ CI/CD sudoers file validation failed"
        rm "/etc/sudoers.d/cicd-$username"
        exit 1
    fi
}

# Function to test sudo permissions
test_sudo_permissions() {
    local username=$1
    
    print_status "Testing sudo permissions for user: $username"
    
    # Test Apache permissions
    print_status "Testing Apache permissions..."
    if sudo -u "$username" sudo -n systemctl status apache2 >/dev/null 2>&1 || sudo -u "$username" sudo -n systemctl status httpd >/dev/null 2>&1; then
        print_status "✅ Apache service commands work"
    else
        print_warning "⚠️  Apache service commands may not work (Apache might not be installed)"
    fi
    
    # Test general permissions
    print_status "Testing general CI/CD permissions..."
    if sudo -u "$username" sudo -n docker --version >/dev/null 2>&1; then
        print_status "✅ Docker commands work"
    else
        print_warning "⚠️  Docker commands may not work"
    fi
    
    print_status "✅ Permission testing completed"
}

# Function to show setup summary
show_summary() {
    local username=$1
    
    print_status "Setup Summary"
    echo "========================="
    echo "User: $username"
    echo "Apache sudo config: /etc/sudoers.d/apache-config-$username"
    echo "CI/CD sudo config: /etc/sudoers.d/cicd-$username"
    echo ""
    print_status "The user can now:"
    echo "• Manage Apache configuration without password"
    echo "• Restart Apache services"
    echo "• Run Apache setup scripts"
    echo "• Perform basic CI/CD operations"
    echo ""
    print_status "Security Note:"
    echo "• These permissions are limited to specific commands"
    echo "• Files are validated before creation"
    echo "• Permissions can be revoked by deleting the sudoers.d files"
}

# Main function
main() {
    print_status "Apache CI/CD Sudo Permission Setup"
    
    # Check if running as root
    check_root
    
    # Parse command line arguments
    USERNAME=""
    APACHE_ONLY=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            -u|--user)
                USERNAME="$2"
                shift 2
                ;;
            --apache-only)
                APACHE_ONLY=true
                shift
                ;;
            -h|--help)
                echo "Usage: $0 -u USERNAME [OPTIONS]"
                echo "Options:"
                echo "  -u, --user USERNAME    Username to grant sudo permissions"
                echo "  --apache-only         Only setup Apache permissions (not CI/CD)"
                echo "  -h, --help            Show this help message"
                echo ""
                echo "Examples:"
                echo "  sudo $0 -u vcm                    # Full setup for user 'vcm'"
                echo "  sudo $0 -u ubuntu --apache-only  # Apache only for user 'ubuntu'"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                echo "Use -h for help"
                exit 1
                ;;
        esac
    done
    
    # Validate username
    if [ -z "$USERNAME" ]; then
        print_error "Username is required. Use -u USERNAME"
        echo "Use -h for help"
        exit 1
    fi
    
    # Check if user exists
    if ! id "$USERNAME" &>/dev/null; then
        print_error "User '$USERNAME' does not exist"
        exit 1
    fi
    
    print_status "Setting up sudo permissions for user: $USERNAME"
    
    # Setup permissions
    setup_apache_sudo "$USERNAME"
    
    if [ "$APACHE_ONLY" = false ]; then
        setup_cicd_sudo "$USERNAME"
    fi
    
    # Test permissions
    test_sudo_permissions "$USERNAME"
    
    # Show summary
    show_summary "$USERNAME"
    
    print_status "✅ Setup completed successfully!"
    echo ""
    print_status "Next steps:"
    echo "1. Your CI/CD pipeline will now be able to configure Apache automatically"
    echo "2. Test the deployment to verify everything works"
    echo "3. Monitor the deployment logs for any remaining issues"
}

# Run main function
main "$@" 