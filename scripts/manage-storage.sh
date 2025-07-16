#!/bin/bash
# Enhanced Storage Management Script with Docker Cache Optimization
# Intelligently manages storage while preserving useful cache layers

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
NETWORK_STORAGE="/srv/homedir"
APP_STORAGE="$NETWORK_STORAGE/mistral-app"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${GREEN}✅${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠️${NC} $1"; }
print_error() { echo -e "${RED}❌${NC} $1"; }
print_info() { echo -e "${BLUE}ℹ️${NC} $1"; }

show_usage() {
    cat << EOF
Usage: $0 {cleanup|cache-cleanup|smart-cleanup|monitor|optimize}

Commands:
  cleanup        - General cleanup (preserves recent cache)
  cache-cleanup  - Aggressive cache cleanup for emergency space
  smart-cleanup  - Intelligent cleanup with cache optimization
  monitor        - Show storage usage and cache status
  optimize       - Optimize storage and cache configuration

Examples:
  $0 smart-cleanup  # Recommended for regular use
  $0 cache-cleanup  # Only when critically low on space
  $0 monitor        # Check current status
EOF
}

monitor_storage() {
    print_info "Storage and Cache Monitoring Report - $(date)"
    echo "=================================================="
    
    echo ""
    print_info "💾 Storage Usage:"
    df -h / | head -1
    df -h / | tail -1
    
    if [ -d "$NETWORK_STORAGE" ]; then
        echo ""
        print_info "🌐 Network Storage:"
        df -h "$NETWORK_STORAGE" | head -1
        df -h "$NETWORK_STORAGE" | tail -1
    fi
    
    echo ""
    print_info "🐳 Docker System Usage:"
    docker system df 2>/dev/null || print_warning "Docker not available"
    
    echo ""
    print_info "📦 Docker Images:"
    docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}" | head -10 2>/dev/null || true
    
    echo ""
    print_info "🗂️ Application Cache Directories:"
    if [ -d "$APP_STORAGE" ]; then
        du -sh "$APP_STORAGE"/* 2>/dev/null | head -10
    else
        echo "Network storage not available"
    fi
    
    echo ""
    print_info "🔄 Recent Build Cache:"
    if [ -d "$APP_STORAGE/docker-build-cache" ]; then
        find "$APP_STORAGE/docker-build-cache" -type f -mtime -7 | wc -l | xargs echo "Files modified in last 7 days:"
    fi
}

smart_cleanup() {
    print_info "🧠 Running intelligent cleanup with cache preservation..."
    
    # 1. Clean up old containers and networks
    print_info "🧹 Cleaning up old containers and networks..."
    docker container prune -f 2>/dev/null || true
    docker network prune -f 2>/dev/null || true
    
    # 2. Remove only dangling images (not used layers)
    print_info "🗑️ Removing dangling images..."
    docker image prune -f 2>/dev/null || true
    
    # 3. Clean old volumes (keep recent ones for cache)
    print_info "📦 Cleaning old volumes (preserving recent cache)..."
    docker volume prune -f --filter "until=168h" 2>/dev/null || true
    
    # 4. Clean application logs older than 30 days
    print_info "📝 Cleaning old application logs..."
    find ./logs -name "*.log" -mtime +30 -delete 2>/dev/null || true
    
    # 5. Clean old backup files
    print_info "💾 Cleaning old backup files..."
    if [ -d "$APP_STORAGE/backups" ]; then
        find "$APP_STORAGE/backups" -type f -mtime +14 -delete 2>/dev/null || true
    fi
    
    # 6. Optimize pip cache (keep recent packages)
    print_info "🐍 Optimizing pip cache..."
    if [ -d "$APP_STORAGE/pip-cache" ]; then
        find "$APP_STORAGE/pip-cache" -type f -mtime +30 -delete 2>/dev/null || true
    fi
    
    # 7. Show results
    print_status "Smart cleanup completed"
    monitor_storage
}

aggressive_cleanup() {
    print_warning "⚠️ Running aggressive cleanup - this will remove build cache!"
    echo "This will significantly slow down the next build."
    
    # Give user a chance to cancel
    sleep 3
    
    # Clean everything
    print_info "🧹 Removing all Docker cache and unused resources..."
    docker system prune -af --volumes 2>/dev/null || true
    
    # Clean build artifacts
    if [ -d "$APP_STORAGE" ]; then
        print_info "🗑️ Cleaning build artifacts..."
        rm -rf "$APP_STORAGE/docker-build-cache"/* 2>/dev/null || true
        rm -rf "$APP_STORAGE/pip-cache"/* 2>/dev/null || true
        rm -rf "$APP_STORAGE/npm-cache"/* 2>/dev/null || true
    fi
    
    print_warning "Aggressive cleanup completed - next build will be slower"
}

optimize_storage() {
    print_info "🔧 Optimizing storage configuration for better caching..."
    
    # Ensure cache directories exist
    if [ -d "$NETWORK_STORAGE" ]; then
        mkdir -p "$APP_STORAGE"/{docker-build-cache,pip-cache,npm-cache}
        mkdir -p "$APP_STORAGE/logs"
        mkdir -p "$APP_STORAGE/model-cache"/{huggingface,sentence-transformers}
        
        # Set proper permissions
        chown -R $(whoami):$(whoami) "$APP_STORAGE" 2>/dev/null || true
        
        print_status "Network storage cache directories optimized"
    fi
    
    # Configure Docker for optimal caching
    print_info "🐳 Configuring Docker for optimal caching..."
    
    # Create Docker daemon configuration for better caching
    if [ -w /etc/docker ] 2>/dev/null; then
        cat > /etc/docker/daemon.json << EOF
{
  "storage-driver": "overlay2",
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "features": {
    "buildkit": true
  }
}
EOF
        print_status "Docker daemon optimized for caching"
    fi
    
    print_status "Storage optimization completed"
}

# Main command processing
case "${1:-monitor}" in
    "cleanup")
        smart_cleanup
        ;;
    "cache-cleanup")
        aggressive_cleanup
        ;;
    "smart-cleanup")
        smart_cleanup
        ;;
    "monitor")
        monitor_storage
        ;;
    "optimize")
        optimize_storage
        ;;
    *)
        show_usage
        exit 1
        ;;
esac 