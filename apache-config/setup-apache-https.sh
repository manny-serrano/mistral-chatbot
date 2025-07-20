#!/bin/bash

# Apache HTTPS Setup Script for Mistral Network Security Analysis
# This script automates the setup of Apache as an HTTPS reverse proxy

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Function to detect OS
detect_os() {
    if [ -f /etc/debian_version ]; then
        echo "debian"
    elif [ -f /etc/redhat-release ]; then
        echo "redhat"
    else
        echo "unknown"
    fi
}

# Function to check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        print_error "This script must be run as root (use sudo)"
        print_error "Please run: sudo $0 $*"
        exit 1
    fi
}

# Function to install Apache and required modules
install_apache() {
    local os=$1
    
    print_status "Installing Apache and required modules..."
    
    if [ "$os" = "debian" ]; then
        # Update package list
        apt update
        
        # Install Apache
        apt install -y apache2
        
        # Enable required modules
        a2enmod ssl
        a2enmod proxy
        a2enmod proxy_http
        a2enmod proxy_wstunnel
        a2enmod headers
        a2enmod rewrite
        a2enmod expires
        a2enmod deflate
        
        # Start and enable Apache
        systemctl start apache2
        systemctl enable apache2
        
        print_status "Apache installed and configured on Debian/Ubuntu"
        
    elif [ "$os" = "redhat" ]; then
        # Install Apache
        yum install -y httpd mod_ssl
        
        # Start and enable Apache
        systemctl start httpd
        systemctl enable httpd
        
        print_status "Apache installed and configured on CentOS/RHEL"
        print_warning "Please manually verify that required modules are enabled in /etc/httpd/conf/httpd.conf"
        
    else
        print_error "Unsupported operating system"
        exit 1
    fi
}

# Function to configure firewall
configure_firewall() {
    local os=$1
    
    print_status "Configuring firewall..."
    
    if [ "$os" = "debian" ]; then
        if command -v ufw &> /dev/null; then
            ufw allow 80/tcp
            ufw allow 443/tcp
            ufw --force reload
            print_status "UFW firewall configured"
        else
            print_warning "UFW not found, please configure firewall manually"
        fi
    elif [ "$os" = "redhat" ]; then
        if command -v firewall-cmd &> /dev/null; then
            firewall-cmd --permanent --add-service=http
            firewall-cmd --permanent --add-service=https
            firewall-cmd --reload
            print_status "Firewalld configured"
        else
            print_warning "Firewalld not found, please configure firewall manually"
        fi
    fi
}

# Function to setup SSL certificates directory
setup_ssl_directories() {
    print_status "Setting up SSL directories..."
    
    mkdir -p /etc/ssl/certs /etc/ssl/private
    mkdir -p /var/www/letsencrypt/.well-known/acme-challenge/
    
    # Set proper permissions
    chmod 755 /etc/ssl/certs
    chmod 700 /etc/ssl/private
    chmod 755 /var/www/letsencrypt/.well-known/acme-challenge/
    
    print_status "SSL directories created"
}

# Function to install Let's Encrypt certbot
install_certbot() {
    local os=$1
    
    print_status "Installing Let's Encrypt certbot..."
    
    if [ "$os" = "debian" ]; then
        apt install -y certbot python3-certbot-apache
    elif [ "$os" = "redhat" ]; then
        yum install -y certbot python3-certbot-apache
    fi
    
    print_status "Certbot installed"
}

# Function to configure Apache virtual host
configure_apache() {
    local os=$1
    local domain=$2
    
    print_status "Configuring Apache virtual host..."
    
    # Verify source configuration file exists
    local source_config="$(dirname "$0")/sites-available/mistral-app.conf"
    if [ ! -f "$source_config" ]; then
        print_error "Source configuration file not found: $source_config"
        exit 1
    fi
    
    # Copy configuration file
    local config_file=""
    if [ "$os" = "debian" ]; then
        config_file="/etc/apache2/sites-available/mistral-app.conf"
        if ! cp "$source_config" "$config_file"; then
            print_error "Failed to copy configuration file to $config_file"
            print_error "Check permissions and ensure you're running with sudo"
            exit 1
        fi
    elif [ "$os" = "redhat" ]; then
        config_file="/etc/httpd/conf.d/mistral-app.conf"
        if ! cp "$source_config" "$config_file"; then
            print_error "Failed to copy configuration file to $config_file"
            print_error "Check permissions and ensure you're running with sudo"
            exit 1
        fi
    fi
    
    # Update domain name in configuration
    if [ -n "$domain" ]; then
        sed -i "s/your-domain.com/$domain/g" "$config_file"
        print_status "Configuration updated with domain: $domain"
    else
        print_warning "No domain specified, please update ServerName in $config_file"
    fi
    
    # Enable site (Debian/Ubuntu only)
    if [ "$os" = "debian" ]; then
        a2ensite mistral-app.conf
        a2dissite 000-default.conf || true
    fi
    
    # Test Apache configuration
    if [ "$os" = "debian" ]; then
        apache2ctl configtest
    elif [ "$os" = "redhat" ]; then
        httpd -t
    fi
    
    print_status "Apache configuration complete"
}

# Function to restart Apache
restart_apache() {
    local os=$1
    
    print_status "Restarting Apache..."
    
    if [ "$os" = "debian" ]; then
        systemctl restart apache2
    elif [ "$os" = "redhat" ]; then
        systemctl restart httpd
    fi
    
    print_status "Apache restarted"
}

# Function to setup SSL certificate
setup_ssl() {
    local domain=$1
    
    if [ -z "$domain" ]; then
        print_warning "No domain specified, skipping SSL certificate setup"
        print_warning "Please run: sudo certbot --apache -d your-domain.com"
        return
    fi
    
    print_status "Setting up SSL certificate for $domain..."
    
    # Check if certbot is installed
    if ! command -v certbot &> /dev/null; then
        print_error "Certbot not found. Please install it first."
        return
    fi
    
    # Run certbot
    certbot --apache -d "$domain" -d "www.$domain" --non-interactive --agree-tos --redirect
    
    # Setup automatic renewal
    (crontab -l 2>/dev/null; echo "0 2 * * * /usr/bin/certbot renew --quiet") | crontab -
    
    print_status "SSL certificate setup complete"
}

# Function to create systemd service for Next.js app
create_nextjs_service() {
    local project_path=$1
    
    print_status "Creating systemd service for Next.js application..."
    
    cat > /etc/systemd/system/mistral-web-ui.service << EOF
[Unit]
Description=Mistral Network Security Analysis Web UI
After=network.target

[Service]
Type=exec
User=www-data
Group=www-data
WorkingDirectory=$project_path/Web_UI
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable mistral-web-ui
    
    print_status "Systemd service created (not started yet)"
}

# Main function
main() {
    print_status "Starting Apache HTTPS setup for Mistral Network Security Analysis"
    
    # Check if running as root
    check_root
    
    # Parse command line arguments
    DOMAIN=""
    PROJECT_PATH=""
    INSTALL_CERTBOT=false
    SETUP_SSL=false
    CREATE_SERVICE=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            -d|--domain)
                DOMAIN="$2"
                shift 2
                ;;
            -p|--project-path)
                PROJECT_PATH="$2"
                shift 2
                ;;
            --install-certbot)
                INSTALL_CERTBOT=true
                shift
                ;;
            --setup-ssl)
                SETUP_SSL=true
                shift
                ;;
            --create-service)
                CREATE_SERVICE=true
                shift
                ;;
            -h|--help)
                echo "Usage: $0 [OPTIONS]"
                echo "Options:"
                echo "  -d, --domain DOMAIN       Domain name for SSL certificate"
                echo "  -p, --project-path PATH   Path to the project directory"
                echo "  --install-certbot         Install Let's Encrypt certbot"
                echo "  --setup-ssl              Setup SSL certificate (requires domain)"
                echo "  --create-service         Create systemd service for Next.js app"
                echo "  -h, --help               Show this help message"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Detect OS
    OS=$(detect_os)
    print_status "Detected OS: $OS"
    
    # Install Apache
    install_apache "$OS"
    
    # Configure firewall
    configure_firewall "$OS"
    
    # Setup SSL directories
    setup_ssl_directories
    
    # Install certbot if requested
    if [ "$INSTALL_CERTBOT" = true ]; then
        install_certbot "$OS"
    fi
    
    # Configure Apache
    configure_apache "$OS" "$DOMAIN"
    
    # Create systemd service if requested
    if [ "$CREATE_SERVICE" = true ] && [ -n "$PROJECT_PATH" ]; then
        create_nextjs_service "$PROJECT_PATH"
    fi
    
    # Restart Apache
    restart_apache "$OS"
    
    # Setup SSL if requested
    if [ "$SETUP_SSL" = true ]; then
        setup_ssl "$DOMAIN"
    fi
    
    print_status "Apache HTTPS setup complete!"
    echo
    print_status "Next steps:"
    echo "1. Ensure your Next.js application is running on port 3000"
    echo "2. If you haven't set up SSL, run: sudo certbot --apache -d your-domain.com"
    echo "3. Test your setup by visiting https://your-domain.com"
    echo "4. Check Apache logs: sudo tail -f /var/log/apache2/mistral-app-error.log"
    echo
    print_status "Configuration files:"
    if [ "$OS" = "debian" ]; then
        echo "- Apache config: /etc/apache2/sites-available/mistral-app.conf"
    elif [ "$OS" = "redhat" ]; then
        echo "- Apache config: /etc/httpd/conf.d/mistral-app.conf"
    fi
    echo "- SSL certificates: /etc/ssl/certs/ and /etc/ssl/private/"
    echo "- Setup guide: $(dirname "$0")/HTTPS_SETUP_GUIDE.md"
}

# Run main function
main "$@" 