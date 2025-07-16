#!/bin/bash

echo "🌐 Network Stability Check for CI/CD Deployment"
echo "==============================================="

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${GREEN}✅${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠️${NC} $1"; }
print_error() { echo -e "${RED}❌${NC} $1"; }
print_info() { echo -e "${BLUE}ℹ️${NC} $1"; }

# Function to test connectivity to common package repositories
test_package_repositories() {
    print_info "Testing connectivity to package repositories..."
    
    local repositories=(
        "pypi.org:443"
        "files.pythonhosted.org:443"
        "download.pytorch.org:443"
        "registry-1.docker.io:443"
        "github.com:443"
    )
    
    local failed_repos=()
    
    for repo in "${repositories[@]}"; do
        host=$(echo $repo | cut -d: -f1)
        port=$(echo $repo | cut -d: -f2)
        
        if nc -z -w5 "$host" "$port" 2>/dev/null; then
            print_status "$host:$port is reachable"
        else
            print_warning "$host:$port is not reachable"
            failed_repos+=("$repo")
        fi
    done
    
    if [ ${#failed_repos[@]} -gt 0 ]; then
        print_warning "Some repositories are unreachable: ${failed_repos[*]}"
        return 1
    else
        print_status "All package repositories are reachable"
        return 0
    fi
}

# Function to test DNS resolution
test_dns_resolution() {
    print_info "Testing DNS resolution..."
    
    local test_domains=(
        "pypi.org"
        "github.com"
        "docker.io"
        "8.8.8.8"
    )
    
    for domain in "${test_domains[@]}"; do
        if nslookup "$domain" >/dev/null 2>&1 || host "$domain" >/dev/null 2>&1; then
            print_status "DNS resolution for $domain: OK"
        else
            print_warning "DNS resolution for $domain: FAILED"
        fi
    done
}

# Function to test bandwidth and stability
test_network_stability() {
    print_info "Testing network stability and bandwidth..."
    
    # Test with a small download
    if curl -o /dev/null -s -w "%{time_total}\n" "https://httpbin.org/status/200" >/dev/null 2>&1; then
        print_status "Basic HTTP connectivity: OK"
    else
        print_warning "Basic HTTP connectivity: FAILED"
    fi
    
    # Test download stability with a larger file
    print_info "Testing download stability..."
    if timeout 30 curl -o /tmp/test_download.json "https://httpbin.org/json" >/dev/null 2>&1; then
        print_status "Download stability test: PASSED"
        rm -f /tmp/test_download.json
    else
        print_warning "Download stability test: FAILED (may indicate connection drops)"
    fi
}

# Function to configure network optimizations
configure_network_optimizations() {
    print_info "Applying network optimizations..."
    
    # Configure pip for better network handling
    mkdir -p ~/.pip
    cat > ~/.pip/pip.conf << EOF
[global]
retries = 10
timeout = 300
trusted-host = pypi.org
               pypi.python.org
               files.pythonhosted.org
EOF
    
    # Configure git for better network handling
    git config --global http.lowSpeedLimit 1000
    git config --global http.lowSpeedTime 300
    git config --global http.postBuffer 1048576000
    
    print_status "Network optimizations applied"
}

# Function to provide network troubleshooting suggestions
provide_troubleshooting_suggestions() {
    print_info "Network Troubleshooting Suggestions:"
    echo ""
    echo "1. Check VM network configuration:"
    echo "   • Verify internet connectivity: ping 8.8.8.8"
    echo "   • Check DNS resolution: nslookup pypi.org"
    echo "   • Test HTTPS connectivity: curl -I https://pypi.org"
    echo ""
    echo "2. If behind a firewall/proxy:"
    echo "   • Configure pip proxy settings"
    echo "   • Verify allowed domains in firewall"
    echo "   • Check for SSL inspection interference"
    echo ""
    echo "3. VM resource constraints:"
    echo "   • Check available memory: free -h"
    echo "   • Check disk space: df -h"
    echo "   • Monitor CPU usage during build"
    echo ""
    echo "4. Docker-specific issues:"
    echo "   • Restart Docker daemon: sudo systemctl restart docker"
    echo "   • Clear Docker cache: docker system prune -f"
    echo "   • Check Docker networking: docker network ls"
}

# Main execution
echo "Starting network stability assessment..."
echo ""

# Run all tests
all_tests_passed=true

if ! test_dns_resolution; then
    all_tests_passed=false
fi

echo ""

if ! test_package_repositories; then
    all_tests_passed=false
fi

echo ""

if ! test_network_stability; then
    all_tests_passed=false
fi

echo ""

# Apply optimizations regardless of test results
configure_network_optimizations

echo ""

# Provide results and recommendations
if [ "$all_tests_passed" = true ]; then
    print_status "All network tests passed! Deployment should proceed smoothly."
else
    print_warning "Some network issues detected. Deployment may be slower or fail."
    echo ""
    provide_troubleshooting_suggestions
fi

echo ""
print_info "Network stability check completed."

# Return appropriate exit code
if [ "$all_tests_passed" = true ]; then
    exit 0
else
    exit 1
fi 