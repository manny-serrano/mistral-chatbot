#!/bin/bash

# Apache Configuration Preparation Script
# This script prepares Apache configuration without requiring root access
# Useful for CI/CD environments where sudo may not be available

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

# Function to prepare configuration files
prepare_config() {
    local domain=$1
    local project_path=$2
    local output_dir=$3
    
    print_status "Preparing Apache configuration files..."
    
    # Create output directory
    mkdir -p "$output_dir"
    
    # Copy configuration file
    local source_config="$(dirname "$0")/sites-available/mistral-app.conf"
    local output_config="$output_dir/mistral-app.conf"
    
    if [ ! -f "$source_config" ]; then
        print_error "Source configuration file not found: $source_config"
        exit 1
    fi
    
    cp "$source_config" "$output_config"
    
    # Update domain name in configuration if provided
    if [ -n "$domain" ]; then
        sed -i "s/levantai\.colab\.duke\.edu/$domain/g" "$output_config"
        sed -i "s/your-domain\.com/$domain/g" "$output_config"
        print_status "Configuration updated with domain: $domain"
    fi
    
    # Create installation script
    local install_script="$output_dir/install-apache-config.sh"
    cat > "$install_script" << 'EOF'
#!/bin/bash

# Apache Configuration Installation Script
# This script must be run with sudo privileges

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "This script must be run as root (use sudo)"
    print_error "Please run: sudo $0"
    exit 1
fi

# Detect OS
if [ -f /etc/debian_version ]; then
    OS="debian"
elif [ -f /etc/redhat_release ]; then
    OS="redhat"
else
    print_error "Unsupported operating system"
    exit 1
fi

print_status "Installing Apache configuration for $OS..."

# Install configuration file
if [ "$OS" = "debian" ]; then
    cp "$(dirname "$0")/mistral-app.conf" /etc/apache2/sites-available/mistral-app.conf
    a2ensite mistral-app.conf
    a2dissite 000-default.conf || true
    apache2ctl configtest
    systemctl reload apache2
    print_status "Apache configuration installed and reloaded"
elif [ "$OS" = "redhat" ]; then
    cp "$(dirname "$0")/mistral-app.conf" /etc/httpd/conf.d/mistral-app.conf
    httpd -t
    systemctl reload httpd
    print_status "Apache configuration installed and reloaded"
fi
EOF
    
    chmod +x "$install_script"
    
    print_status "Configuration files prepared in: $output_dir"
    print_status "Files created:"
    echo "  • $output_config"
    echo "  • $install_script"
    echo ""
    print_status "To install the configuration, run:"
    echo "  sudo $install_script"
}

# Main function
main() {
    print_status "Apache Configuration Preparation"
    
    # Parse command line arguments
    DOMAIN="levantai.colab.duke.edu"
    PROJECT_PATH=""
    OUTPUT_DIR="/tmp/apache-config-prepared"
    
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
            -o|--output)
                OUTPUT_DIR="$2"
                shift 2
                ;;
            -h|--help)
                echo "Usage: $0 [OPTIONS]"
                echo "Options:"
                echo "  -d, --domain DOMAIN       Domain name for configuration (default: levantai.colab.duke.edu)"
                echo "  -p, --project-path PATH   Path to the project directory"
                echo "  -o, --output DIR          Output directory (default: /tmp/apache-config-prepared)"
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
    
    # Prepare configuration
    prepare_config "$DOMAIN" "$PROJECT_PATH" "$OUTPUT_DIR"
    
    print_status "Configuration preparation complete!"
    echo ""
    print_status "Next steps:"
    echo "1. Copy the prepared files to your target server"
    echo "2. Run the installation script with sudo:"
    echo "   sudo $OUTPUT_DIR/install-apache-config.sh"
    echo "3. Ensure Apache is installed and running"
    echo "4. Configure SSL certificates if needed"
}

# Run main function
main "$@" 