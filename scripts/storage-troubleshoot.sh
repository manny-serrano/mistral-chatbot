#!/bin/bash
# Storage Troubleshooting Script for GitLab CI/CD Deployment
# Diagnoses and fixes "no space left on device" errors

set -e

# Configuration
NETWORK_STORAGE="/srv/homedir"
PROJECT_DIR="/home/vcm/mistral-enhancing-network-security-analysis"
REQUIRED_SPACE_GB=5  # Minimum GB needed for build

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${PURPLE}=== $1 ===${NC}"
}

print_status() {
    echo -e "${GREEN}✅${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

print_error() {
    echo -e "${RED}❌${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ️${NC} $1"
}

print_header "STORAGE TROUBLESHOOTING FOR MISTRAL DEPLOYMENT"

echo "🔍 Diagnosing storage issues that cause 'no space left on device' errors..."
echo ""

# 1. Check current storage status
print_header "1. CURRENT STORAGE STATUS"

print_info "Local VM Storage:"
df -h / | head -1
local_status=$(df -h / | tail -1)
echo "$local_status"

local_available=$(echo "$local_status" | awk '{print $4}' | sed 's/G//')
local_available_num=$(echo "$local_available" | sed 's/[^0-9.]//g')

print_info "Network Storage:"
if [ -d "$NETWORK_STORAGE" ] && [ -w "$NETWORK_STORAGE" ]; then
    df -h "$NETWORK_STORAGE" | head -1
    network_status=$(df -h "$NETWORK_STORAGE" | tail -1)
    echo "$network_status"
    network_available=$(echo "$network_status" | awk '{print $4}' | sed 's/G//')
    print_status "Network storage is mounted and accessible"
else
    print_error "Network storage not mounted or not writable at $NETWORK_STORAGE"
    echo ""
    print_info "Checking for alternative mount points..."
    mount | grep -E "(cifs|nfs|smb)" || print_warning "No network storage mounts found"
fi

echo ""

# 2. Check space requirements
print_header "2. SPACE REQUIREMENTS ANALYSIS"

print_info "Analyzing what's consuming space..."

print_info "Docker usage:"
docker system df 2>/dev/null || print_warning "Docker not available"

print_info "Largest directories in /:"
du -sh /* 2>/dev/null | sort -hr | head -5

print_info "Largest files in /tmp:"
find /tmp -type f -size +50M -exec ls -lh {} \; 2>/dev/null | head -5 || echo "No large files in /tmp"

print_info "Pip cache size:"
du -sh ~/.cache/pip 2>/dev/null || echo "No pip cache found"

echo ""

# 3. Check for common space wasters
print_header "3. IDENTIFYING SPACE WASTERS"

print_info "Checking for common space issues..."

# Check for old Docker images
old_images=$(docker images -f "dangling=true" -q 2>/dev/null | wc -l)
if [ "$old_images" -gt 0 ]; then
    print_warning "Found $old_images dangling Docker images"
    echo "    Run: docker image prune -f"
fi

# Check for old Docker containers
old_containers=$(docker ps -a -f "status=exited" -q 2>/dev/null | wc -l)
if [ "$old_containers" -gt 0 ]; then
    print_warning "Found $old_containers stopped containers"
    echo "    Run: docker container prune -f"
fi

# Check for large log files
large_logs=$(find /var/log -type f -size +100M 2>/dev/null | wc -l)
if [ "$large_logs" -gt 0 ]; then
    print_warning "Found $large_logs large log files in /var/log"
    echo "    Consider: sudo journalctl --vacuum-size=100M"
fi

# Check for package manager caches
apt_cache_size=$(du -sh /var/cache/apt 2>/dev/null | cut -f1 || echo "0")
if [ "$apt_cache_size" != "0" ]; then
    print_warning "APT cache size: $apt_cache_size"
    echo "    Run: sudo apt-get clean"
fi

echo ""

# 4. Provide immediate fixes
print_header "4. IMMEDIATE SPACE RECOVERY"

if [ "$(echo "$local_available_num < $REQUIRED_SPACE_GB" | bc 2>/dev/null || echo "1")" = "1" ]; then
    print_error "Insufficient local storage for Docker build"
    print_info "Attempting emergency cleanup..."
    
    # Emergency cleanup
    print_info "Cleaning Docker system..."
    docker system prune -af --volumes 2>/dev/null || true
    
    print_info "Cleaning package caches..."
    sudo apt-get clean 2>/dev/null || true
    
    print_info "Cleaning temporary files..."
    sudo rm -rf /tmp/* 2>/dev/null || true
    sudo rm -rf /var/tmp/* 2>/dev/null || true
    
    print_info "Cleaning journal logs..."
    sudo journalctl --vacuum-size=50M 2>/dev/null || true
    
    # Check space after cleanup
    print_info "Space after emergency cleanup:"
    df -h / | tail -1
    
    new_available=$(df -h / | tail -1 | awk '{print $4}' | sed 's/G//' | sed 's/[^0-9.]//g')
    if [ "$(echo "$new_available < $REQUIRED_SPACE_GB" | bc 2>/dev/null || echo "1")" = "1" ]; then
        print_error "Still insufficient space after cleanup"
        print_info "CRITICAL: Manual intervention required"
    else
        print_status "Sufficient space recovered"
    fi
else
    print_status "Local storage appears sufficient"
fi

echo ""

# 5. Network storage setup verification
print_header "5. NETWORK STORAGE VERIFICATION"

if [ -d "$NETWORK_STORAGE" ] && [ -w "$NETWORK_STORAGE" ]; then
    print_status "Network storage is properly mounted"
    
    # Test write permissions
    test_file="$NETWORK_STORAGE/write-test-$(date +%s)"
    if echo "test" > "$test_file" 2>/dev/null; then
        rm -f "$test_file"
        print_status "Network storage is writable"
    else
        print_error "Network storage is not writable"
    fi
    
    # Check if optimization is already in place
    if [ -d "$NETWORK_STORAGE/mistral-app" ]; then
        print_status "Network storage structure exists"
        print_info "Cache directories:"
        ls -la "$NETWORK_STORAGE/mistral-app/" 2>/dev/null || true
    else
        print_warning "Network storage not optimized for builds"
        print_info "Run: bash /tmp/optimize-model-storage.sh"
    fi
else
    print_error "Network storage not available"
    print_info "Expected mount point: $NETWORK_STORAGE"
    print_info "Check CIFS mount status and permissions"
fi

echo ""

# 6. Build optimization recommendations
print_header "6. BUILD OPTIMIZATION RECOMMENDATIONS"

print_info "To prevent future 'no space left on device' errors:"
echo ""
echo "1. 🏗️ Before every build:"
echo "   • Run: bash /tmp/optimize-model-storage.sh"
echo "   • Run: docker system prune -af"
echo "   • Verify: df -h / (ensure >5GB available)"
echo ""
echo "2. 🐳 Docker build optimization:"
echo "   • Use BuildKit with network storage"
echo "   • Enable build cache on network storage"
echo "   • Build dependencies separately from app code"
echo ""
echo "3. 📦 Package management:"
echo "   • Use pip cache on network storage"
echo "   • Install PyTorch CPU-only version"
echo "   • Clear pip cache after successful builds"
echo ""
echo "4. 🔄 Regular maintenance:"
echo "   • Clean old Docker artifacts weekly"
echo "   • Rotate application logs"
echo "   • Monitor network storage usage"

echo ""

# 7. Generate diagnostic report
print_header "7. DIAGNOSTIC REPORT"

report_file="/tmp/storage-diagnostic-$(date +%Y%m%d_%H%M%S).log"
{
    echo "Storage Diagnostic Report - $(date)"
    echo "======================================="
    echo ""
    echo "Local Storage:"
    df -h /
    echo ""
    echo "Network Storage:"
    if [ -d "$NETWORK_STORAGE" ]; then
        df -h "$NETWORK_STORAGE"
    else
        echo "Not mounted"
    fi
    echo ""
    echo "Docker Status:"
    docker system df 2>/dev/null || echo "Docker not available"
    echo ""
    echo "Mount Points:"
    mount | grep -E "(cifs|nfs|smb)" || echo "No network mounts"
    echo ""
    echo "Disk Usage Summary:"
    du -sh /* 2>/dev/null | sort -hr | head -10
    echo ""
    echo "Large Files:"
    find / -type f -size +500M -exec ls -lh {} \; 2>/dev/null | head -10 || echo "None found"
} > "$report_file"

print_status "Diagnostic report saved: $report_file"

# 8. Exit with appropriate code
if [ -d "$NETWORK_STORAGE" ] && [ -w "$NETWORK_STORAGE" ]; then
    if [ "$(echo "$local_available_num >= $REQUIRED_SPACE_GB" | bc 2>/dev/null || echo "0")" = "1" ]; then
        print_status "✅ STORAGE CHECK PASSED - Ready for deployment"
        exit 0
    else
        print_error "❌ INSUFFICIENT LOCAL STORAGE - Deployment may fail"
        exit 1
    fi
else
    print_error "❌ NETWORK STORAGE NOT AVAILABLE - Cannot optimize storage"
    exit 1
fi 