#!/bin/bash

echo "🐳 Docker Build with Network Retry Logic"
echo "========================================"

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

# Configuration
MAX_RETRIES=3
RETRY_DELAY=30
BUILD_TIMEOUT=1800  # 30 minutes
NETWORK_TEST_TIMEOUT=10
TEST_MODE=${1:-""}

# Function to test network connectivity
test_network() {
    print_info "Testing network connectivity..."
    
    # Test basic connectivity
    if ! timeout $NETWORK_TEST_TIMEOUT ping -c 3 8.8.8.8 >/dev/null 2>&1; then
        print_warning "Basic internet connectivity failed"
        return 1
    fi
    
    # Test PyPI connectivity
    if ! timeout $NETWORK_TEST_TIMEOUT curl -s -I https://pypi.org >/dev/null 2>&1; then
        print_warning "PyPI connectivity failed"
        return 1
    fi
    
    # Test Docker Hub connectivity
    if ! timeout $NETWORK_TEST_TIMEOUT curl -s -I https://registry-1.docker.io >/dev/null 2>&1; then
        print_warning "Docker Hub connectivity failed"
        return 1
    fi
    
    print_status "Network connectivity tests passed"
    return 0
}

# Function to configure network optimizations
configure_network() {
    print_info "Configuring network optimizations..."
    
    if [ "$TEST_MODE" = "--test" ]; then
        print_info "TEST MODE: Skipping Docker daemon configuration"
        print_status "Network optimizations applied (test mode)"
        return
    fi
    
    # Configure Docker daemon for better network handling
    if [ -f /etc/docker/daemon.json ]; then
        # Backup existing config
        cp /etc/docker/daemon.json /etc/docker/daemon.json.backup 2>/dev/null || true
    fi
    
    # Create optimized Docker daemon config
    sudo tee /etc/docker/daemon.json >/dev/null << EOF
{
  "max-concurrent-downloads": 3,
  "max-concurrent-uploads": 3,
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF
    
    # Restart Docker daemon if running
    if systemctl is-active --quiet docker; then
        print_info "Restarting Docker daemon with optimized settings..."
        sudo systemctl restart docker
        sleep 10
    fi
    
    print_status "Network optimizations applied"
}

# Function to clean up before retry
cleanup_for_retry() {
    print_info "Cleaning up for retry attempt..."
    
    # Remove any partially built images
    docker image prune -f >/dev/null 2>&1 || true
    
    # Clear build cache
    docker builder prune -f >/dev/null 2>&1 || true
    
    # Free up space
    docker system prune -f >/dev/null 2>&1 || true
    
    print_status "Cleanup completed"
}

# Function to build with retry logic
build_with_retry() {
    local service_name=$1
    local retry_count=0
    
    if [ "$TEST_MODE" = "--test" ]; then
        print_info "TEST MODE: Simulating build process for $service_name"
        print_status "Build simulation completed successfully"
        return 0
    fi
    
    while [ $retry_count -lt $MAX_RETRIES ]; do
        retry_count=$((retry_count + 1))
        print_info "Build attempt $retry_count/$MAX_RETRIES for $service_name"
        
        # Test network before each attempt
        if ! test_network; then
            print_warning "Network test failed, waiting ${RETRY_DELAY}s before retry..."
            sleep $RETRY_DELAY
            continue
        fi
        
        # Attempt the build with timeout
        print_info "Starting Docker build (timeout: ${BUILD_TIMEOUT}s)..."
        
        if timeout $BUILD_TIMEOUT docker-compose build $service_name; then
            print_status "Build successful for $service_name"
            return 0
        else
            build_exit_code=$?
            print_error "Build failed for $service_name (exit code: $build_exit_code)"
            
            # Log the error details
            echo "Build attempt $retry_count failed at $(date)" >> /tmp/docker-build-errors.log
            
            if [ $retry_count -lt $MAX_RETRIES ]; then
                print_warning "Retrying in ${RETRY_DELAY} seconds..."
                cleanup_for_retry
                sleep $RETRY_DELAY
            fi
        fi
    done
    
    print_error "All build attempts failed for $service_name"
    return 1
}

# Function to handle build failure
handle_build_failure() {
    local service_name=$1
    
    print_error "Build failed for $service_name after $MAX_RETRIES attempts"
    
    print_info "Diagnostic information:"
    echo "Docker version: $(docker --version)"
    echo "Docker Compose version: $(docker-compose --version)"
    echo "Available disk space:"
    df -h /
    echo "Available memory:"
    free -h
    echo "Docker system info:"
    docker system df
    
    # Save logs for debugging
    echo "=== Build Error Log ===" >> /tmp/build-failure-$(date +%Y%m%d_%H%M%S).log
    cat /tmp/docker-build-errors.log >> /tmp/build-failure-$(date +%Y%m%d_%H%M%S).log 2>/dev/null || true
    
    return 1
}

# Main execution
main() {
    local service_name=${2:-"mistral-app"}
    
    if [ "$1" = "--test" ]; then
        print_info "Starting Docker build test mode..."
        TEST_MODE="--test"
        service_name=${2:-"mistral-app"}
    elif [ "$1" = "--help" ]; then
        echo "Usage: $0 [--test] [service_name]"
        echo ""
        echo "Options:"
        echo "  --test       Run in test mode (no actual build, no sudo required)"
        echo "  --help       Show this help message"
        echo "  service_name Specify which service to build (default: mistral-app)"
        echo ""
        echo "Examples:"
        echo "  $0 --test                    # Test mode"
        echo "  $0 mistral-app               # Build mistral-app service"
        echo "  $0 --test frontend           # Test mode for frontend service"
        return 0
    else
        print_info "Starting resilient Docker build for $service_name..."
        service_name=$1
    fi
    
    # Initial setup
    configure_network
    
    # Clear any previous error logs
    rm -f /tmp/docker-build-errors.log
    
    # Attempt build with retry logic
    if build_with_retry "$service_name"; then
        print_status "Docker build completed successfully!"
        
        # Show final image info
        print_info "Build results:"
        docker images | grep mistral || echo "No mistral images found"
        
        return 0
    else
        handle_build_failure "$service_name"
        return 1
    fi
}

# Run main function with all arguments
main "$@" 