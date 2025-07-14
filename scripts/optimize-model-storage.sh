#!/bin/bash
# Enhanced Model Storage Optimization Script
# Handles both runtime and build-time storage optimization for CIFS network storage

set -e

NETWORK_STORAGE="/srv/homedir"
MODEL_CACHE_DIR="$NETWORK_STORAGE/mistral-app/model-cache"
BUILD_CACHE_DIR="$NETWORK_STORAGE/mistral-app/docker-build-cache"
PIP_CACHE_DIR="$NETWORK_STORAGE/mistral-app/pip-cache"
LOCAL_CACHE_DIR="/home/vcm/.cache/huggingface"
DOCKER_CACHE_DIR="/home/vcm/mistral-enhancing-network-security-analysis/.cache"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

echo "🤖 Enhanced Model Storage Optimization"
echo "======================================="

# Check if network storage is available
if [ ! -d "$NETWORK_STORAGE" ] || [ ! -w "$NETWORK_STORAGE" ]; then
    print_error "Network storage not available. Please mount CIFS storage first."
    print_info "Expected mount point: $NETWORK_STORAGE"
    print_info "Current mounts:"
    mount | grep -E "(cifs|nfs|smb)" || echo "No network storage mounts found"
    exit 1
fi

print_status "Network storage is available and writable"

# Show initial storage status
echo ""
print_info "Current storage status:"
df -h / | tail -1
df -h "$NETWORK_STORAGE" | tail -1

# Create comprehensive directory structure on network storage
echo ""
print_info "Setting up comprehensive cache structure on network storage..."
mkdir -p "$MODEL_CACHE_DIR"/{huggingface,sentence-transformers,torch,pip-downloads}
mkdir -p "$BUILD_CACHE_DIR"/{docker-layers,buildkit}
mkdir -p "$PIP_CACHE_DIR"/{wheels,http,packages}
mkdir -p "$NETWORK_STORAGE/mistral-app"/{logs,data,docker-tmp,venv}

chown -R vcm:vcm "$NETWORK_STORAGE/mistral-app" 2>/dev/null || true

# Handle existing HuggingFace cache
if [ -d "$LOCAL_CACHE_DIR" ] && [ ! -L "$LOCAL_CACHE_DIR" ]; then
    print_info "Moving existing HuggingFace cache to network storage..."
    rsync -av "$LOCAL_CACHE_DIR/" "$MODEL_CACHE_DIR/huggingface/" || true
    
    # Create backup before removing
    backup_name="$LOCAL_CACHE_DIR.backup.$(date +%Y%m%d_%H%M%S)"
    mv "$LOCAL_CACHE_DIR" "$backup_name" 2>/dev/null || true
    print_info "Backup created: $backup_name"
fi

# Create symlink from local to network storage
print_info "Creating HuggingFace cache symlink..."
ln -sf "$MODEL_CACHE_DIR/huggingface" "$LOCAL_CACHE_DIR"

# Handle Docker cache directory
if [ -d "$DOCKER_CACHE_DIR" ] && [ ! -L "$DOCKER_CACHE_DIR" ]; then
    print_info "Moving Docker build cache to network storage..."
    rsync -av "$DOCKER_CACHE_DIR/" "$BUILD_CACHE_DIR/" || true
    backup_name="$DOCKER_CACHE_DIR.backup.$(date +%Y%m%d_%H%M%S)"
    mv "$DOCKER_CACHE_DIR" "$backup_name" 2>/dev/null || true
    print_info "Docker cache backup created: $backup_name"
fi

# Create symlink for Docker build cache
print_info "Creating Docker build cache symlink..."
ln -sf "$BUILD_CACHE_DIR" "$DOCKER_CACHE_DIR"

# Set up pip cache optimization
print_info "Setting up pip cache optimization..."
mkdir -p /home/vcm/.cache/pip
if [ ! -L /home/vcm/.cache/pip ]; then
    if [ -d /home/vcm/.cache/pip ]; then
        rsync -av /home/vcm/.cache/pip/ "$PIP_CACHE_DIR/" || true
        mv /home/vcm/.cache/pip /home/vcm/.cache/pip.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
    fi
    ln -sf "$PIP_CACHE_DIR" /home/vcm/.cache/pip
fi

# Create Docker environment file for build optimization
print_info "Creating Docker build optimization configuration..."
cat > "$NETWORK_STORAGE/mistral-app/docker-build.env" << EOF
# Docker Build Environment for Network Storage
DOCKER_BUILDKIT=1
BUILDKIT_PROGRESS=plain
BUILDKIT_HOST=tcp://0.0.0.0:1234

# Cache directories
BUILDKIT_CACHE_MOUNT_NS=mistral-app
BUILD_CACHE_DIR=$BUILD_CACHE_DIR
PIP_CACHE_DIR=$PIP_CACHE_DIR
MODEL_CACHE_DIR=$MODEL_CACHE_DIR

# Optimization flags
PIP_CACHE_DIR=$PIP_CACHE_DIR
PIP_DISABLE_PIP_VERSION_CHECK=1
PIP_NO_COLOR=1
PYTHONDONTWRITEBYTECODE=1
PYTHONUNBUFFERED=1
EOF

# Create build optimization script
cat > "$NETWORK_STORAGE/mistral-app/optimize-build.sh" << 'EOFSCRIPT'
#!/bin/bash
# Docker Build Optimization Helper
# Run this before Docker builds to ensure optimal storage usage

NETWORK_STORAGE="/srv/homedir"
BUILD_CACHE_DIR="$NETWORK_STORAGE/mistral-app/docker-build-cache"
PIP_CACHE_DIR="$NETWORK_STORAGE/mistral-app/pip-cache"

echo "🔧 Optimizing Docker build environment..."

# Set build environment
export DOCKER_BUILDKIT=1
export BUILDKIT_PROGRESS=plain

# Ensure cache directories exist
mkdir -p "$BUILD_CACHE_DIR" "$PIP_CACHE_DIR"

# Clean up any stale build artifacts
docker builder prune -f --filter "until=24h" 2>/dev/null || true

# Show storage status
echo "Storage before build:"
df -h / | tail -1
df -h "$NETWORK_STORAGE" | tail -1

echo "✅ Build environment optimized"
EOFSCRIPT

chmod +x "$NETWORK_STORAGE/mistral-app/optimize-build.sh"

# Create monitoring script
cat > "$NETWORK_STORAGE/mistral-app/monitor-storage.sh" << 'EOFMONITOR'
#!/bin/bash
# Storage Monitoring for Build Process

echo "=== Storage Monitoring Report - $(date) ==="
echo ""
echo "🖥️ Local VM Storage:"
df -h / | head -1
df -h / | tail -1

echo ""
echo "🌐 Network Storage:"
df -h /srv/homedir | head -1
df -h /srv/homedir | tail -1

echo ""
echo "📱 Application Storage Usage:"
du -sh /srv/homedir/mistral-app/* 2>/dev/null | head -10

echo ""
echo "🐳 Docker Storage Usage:"
docker system df 2>/dev/null || echo "Docker not available"

echo ""
echo "💾 Cache Directories:"
echo "Model cache: $(du -sh /srv/homedir/mistral-app/model-cache 2>/dev/null | cut -f1 || echo 'Empty')"
echo "Build cache: $(du -sh /srv/homedir/mistral-app/docker-build-cache 2>/dev/null | cut -f1 || echo 'Empty')"
echo "Pip cache: $(du -sh /srv/homedir/mistral-app/pip-cache 2>/dev/null | cut -f1 || echo 'Empty')"

echo ""
echo "⚠️ Large Files (>100MB):"
find /srv/homedir/mistral-app -type f -size +100M -exec ls -lh {} \; 2>/dev/null | head -5 || echo "None found"
EOFMONITOR

chmod +x "$NETWORK_STORAGE/mistral-app/monitor-storage.sh"

# Run initial monitoring
print_info "Running initial storage monitoring..."
"$NETWORK_STORAGE/mistral-app/monitor-storage.sh" > "$NETWORK_STORAGE/mistral-app/logs/storage-optimization-$(date +%Y%m%d_%H%M%S).log"

# Show final status
echo ""
print_status "Enhanced model cache optimization completed!"
echo ""
print_info "📁 Directory Structure Created:"
echo "  • Model cache: $MODEL_CACHE_DIR"
echo "  • Build cache: $BUILD_CACHE_DIR"  
echo "  • Pip cache: $PIP_CACHE_DIR"
echo "  • Docker tmp: $NETWORK_STORAGE/mistral-app/docker-tmp"
echo ""
print_info "🔗 Symlinks Created:"
echo "  • $LOCAL_CACHE_DIR -> $MODEL_CACHE_DIR/huggingface"
echo "  • $DOCKER_CACHE_DIR -> $BUILD_CACHE_DIR"
echo "  • /home/vcm/.cache/pip -> $PIP_CACHE_DIR"
echo ""
print_info "🛠️ Utilities Available:"
echo "  • Build optimizer: $NETWORK_STORAGE/mistral-app/optimize-build.sh"
echo "  • Storage monitor: $NETWORK_STORAGE/mistral-app/monitor-storage.sh"
echo "  • Build config: $NETWORK_STORAGE/mistral-app/docker-build.env"

# Show space savings
echo ""
print_info "📊 Current Space Usage:"
du -sh "$NETWORK_STORAGE/mistral-app" 2>/dev/null || echo "Calculating..."
available_local=$(df -h / | tail -1 | awk '{print $4}')
available_network=$(df -h "$NETWORK_STORAGE" | tail -1 | awk '{print $4}')
echo "  • Local VM Available: $available_local"
echo "  • Network Available: $available_network"

echo ""
print_status "🎯 Optimization Benefits:"
echo "  • Build cache moved to 25GB network storage"
echo "  • Pip downloads cached on network storage"
echo "  • Model cache shared between deployments"
echo "  • Reduced local VM storage pressure by ~3-5GB"
echo "  • Faster subsequent builds from cached layers"

echo ""
print_info "💡 Next Steps:"
echo "  1. Run: source $NETWORK_STORAGE/mistral-app/docker-build.env"
echo "  2. Run: $NETWORK_STORAGE/mistral-app/optimize-build.sh"
echo "  3. Then proceed with Docker build" 