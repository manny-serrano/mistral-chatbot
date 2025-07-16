#!/bin/bash
# Space Usage Diagnostic Script
# Identifies what's consuming space on VM during builds

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

print_header() { echo -e "${PURPLE}=== $1 ===${NC}"; }
print_status() { echo -e "${GREEN}✅${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠️${NC} $1"; }
print_error() { echo -e "${RED}❌${NC} $1"; }
print_info() { echo -e "${BLUE}ℹ️${NC} $1"; }

print_header "VM SPACE USAGE DIAGNOSTIC"
echo "Analyzing what's consuming disk space during build failures..."
echo ""

# 1. Overall disk usage
print_header "1. DISK USAGE OVERVIEW"
print_info "Filesystem usage:"
df -h | grep -E "(Size|/$|/srv)"

print_info "Inode usage (sometimes this is the issue):"
df -i | grep -E "(Inodes|/$|/srv)" || echo "Inode info not available"

echo ""

# 2. Top space consumers
print_header "2. TOP SPACE CONSUMERS"
print_info "Largest directories on root filesystem:"
echo "Scanning... (this may take a moment)"
du -h --max-depth=2 / 2>/dev/null | sort -hr | head -15 | grep -v "Permission denied" || echo "Scan limited by permissions"

echo ""

# 3. Docker-specific space usage
print_header "3. DOCKER SPACE ANALYSIS"
if docker system df >/dev/null 2>&1; then
    print_info "Docker system space usage:"
    docker system df
    
    echo ""
    print_info "Docker images taking space:"
    docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}" | head -10
    
    echo ""
    print_info "Docker build cache:"
    docker builder df 2>/dev/null || echo "Build cache info not available"
    
    echo ""
    print_info "Docker volumes:"
    docker volume ls --format "table {{.Name}}\t{{.Driver}}\t{{.Size}}" 2>/dev/null || docker volume ls
    
else
    print_warning "Docker not available for analysis"
fi

echo ""

# 4. Temporary and cache directories
print_header "4. TEMPORARY & CACHE DIRECTORIES"
print_info "Temporary directories space usage:"
for dir in /tmp /var/tmp /home/*/.*cache* /root/.cache /home/*/.cache; do
    if [ -d "$dir" ]; then
        size=$(du -sh "$dir" 2>/dev/null | cut -f1)
        echo "  $dir: $size"
    fi
done

print_info "Package manager caches:"
for dir in /var/cache/apt /var/lib/apt/lists /home/*/.cache/pip /root/.cache/pip; do
    if [ -d "$dir" ]; then
        size=$(du -sh "$dir" 2>/dev/null | cut -f1)
        echo "  $dir: $size"
    fi
done

echo ""

# 5. Application-specific usage
print_header "5. APPLICATION-SPECIFIC ANALYSIS"
if [ -d "/home/vcm/mistral-enhancing-network-security-analysis" ]; then
    print_info "Project directory usage:"
    cd /home/vcm/mistral-enhancing-network-security-analysis
    du -sh */ .??* 2>/dev/null | sort -hr | head -10
    
    print_info "Node.js modules (if any):"
    find . -name "node_modules" -type d -exec du -sh {} \; 2>/dev/null | head -5
    
    print_info "Python cache files:"
    find . -name "__pycache__" -type d -exec du -sh {} \; 2>/dev/null | head -5
    
    print_info "Large files in project:"
    find . -type f -size +50M -exec ls -lh {} \; 2>/dev/null | head -5
fi

echo ""

# 6. Network storage analysis
print_header "6. NETWORK STORAGE ANALYSIS"
if [ -d "/srv/homedir" ]; then
    print_status "Network storage is mounted"
    print_info "Network storage usage:"
    df -h /srv/homedir
    
    if [ -d "/srv/homedir/mistral-app" ]; then
        print_info "Application data on network storage:"
        du -sh /srv/homedir/mistral-app/* 2>/dev/null | head -10
    fi
else
    print_warning "Network storage not mounted at /srv/homedir"
    print_info "Checking for alternative mount points:"
    mount | grep -E "(cifs|nfs|smb)" || echo "No network storage found"
fi

echo ""

# 7. System logs and journals
print_header "7. SYSTEM LOGS & JOURNALS"
print_info "Journal logs size:"
journalctl --disk-usage 2>/dev/null || echo "Journal info not available"

print_info "Log directories:"
for dir in /var/log /home/*/logs /home/*/.local/share/*/logs; do
    if [ -d "$dir" ]; then
        size=$(du -sh "$dir" 2>/dev/null | cut -f1)
        echo "  $dir: $size"
    fi
done

echo ""

# 8. Recommendations
print_header "8. SPACE OPTIMIZATION RECOMMENDATIONS"
available_space=$(df / | tail -1 | awk '{print $4}')
available_gb=$((available_space / 1024 / 1024))

if [ $available_gb -lt 5 ]; then
    print_error "CRITICAL: Less than 5GB available ($available_gb GB)"
    echo ""
    print_info "🚨 IMMEDIATE ACTIONS NEEDED:"
    echo "1. Run emergency cleanup:"
    echo "   sudo apt-get clean"
    echo "   docker system prune -af --volumes"
    echo "   sudo journalctl --vacuum-size=50M"
    echo ""
    echo "2. Move builds to network storage:"
    echo "   bash /tmp/pre-build-setup.sh"
    echo ""
    echo "3. Clean temporary files:"
    echo "   sudo rm -rf /tmp/* /var/tmp/*"
    
elif [ $available_gb -lt 10 ]; then
    print_warning "WARNING: Low space ($available_gb GB available)"
    echo ""
    print_info "🔧 RECOMMENDED ACTIONS:"
    echo "1. Enable network storage optimization:"
    echo "   bash /tmp/optimize-model-storage.sh"
    echo ""
    echo "2. Regular cleanup:"
    echo "   bash /tmp/manage-storage.sh smart-cleanup"
    echo ""
    echo "3. Use pre-build setup:"
    echo "   bash /tmp/pre-build-setup.sh"
    
else
    print_status "Space looks adequate ($available_gb GB available)"
    echo ""
    print_info "💡 OPTIMIZATION SUGGESTIONS:"
    echo "1. Set up network storage to prevent future issues:"
    echo "   bash /tmp/optimize-model-storage.sh"
    echo ""
    echo "2. Regular maintenance:"
    echo "   bash /tmp/manage-storage.sh monitor"
fi

echo ""

# 9. Generate diagnostic report
print_header "9. GENERATING DIAGNOSTIC REPORT"
report_file="/tmp/space-diagnostic-$(date +%Y%m%d_%H%M%S).log"

{
    echo "VM Space Usage Diagnostic Report"
    echo "Generated: $(date)"
    echo "======================================="
    echo ""
    echo "DISK USAGE:"
    df -h
    echo ""
    echo "TOP DIRECTORIES:"
    du -h --max-depth=2 / 2>/dev/null | sort -hr | head -20
    echo ""
    echo "DOCKER USAGE:"
    docker system df 2>/dev/null || echo "Docker not available"
    echo ""
    echo "NETWORK STORAGE:"
    if [ -d "/srv/homedir" ]; then
        df -h /srv/homedir
        ls -la /srv/homedir/ 2>/dev/null
    else
        echo "Not mounted"
    fi
} > "$report_file"

print_status "Diagnostic report saved: $report_file"
print_info "Total available space: $available_gb GB"

# 10. Exit with status code
if [ $available_gb -lt 5 ]; then
    exit 1  # Critical - not enough space
elif [ $available_gb -lt 10 ]; then
    exit 2  # Warning - low space
else
    exit 0  # OK - adequate space
fi 