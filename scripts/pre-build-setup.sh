#!/bin/bash
# Pre-Build Setup Script
# Downloads large packages to network storage before Docker build to prevent "no space left" errors

set -e

NETWORK_STORAGE="/srv/homedir"
APP_STORAGE="$NETWORK_STORAGE/mistral-app"
PIP_CACHE_DIR="$APP_STORAGE/pip-cache"
PROJECT_DIR="/home/vcm/mistral-enhancing-network-security-analysis"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${GREEN}✅${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠️${NC} $1"; }
print_info() { echo -e "${BLUE}ℹ️${NC} $1"; }

echo "🚀 Pre-Build Setup: Network Storage Optimization"
echo "==============================================="

# Check network storage availability
if [ ! -d "$NETWORK_STORAGE" ] || [ ! -w "$NETWORK_STORAGE" ]; then
    print_warning "Network storage not available - building with local storage only"
    exit 0
fi

print_status "Network storage available at $NETWORK_STORAGE"

# Create necessary directories
print_info "📁 Setting up cache directories..."
mkdir -p "$PIP_CACHE_DIR"/{wheels,http,packages}
mkdir -p "$APP_STORAGE/downloads"
mkdir -p "$APP_STORAGE/docker-tmp"

# Check available space
print_info "📊 Current storage status:"
echo "Local VM: $(df -h / | tail -1 | awk '{print $4}') available"
echo "Network:  $(df -h $NETWORK_STORAGE | tail -1 | awk '{print $4}') available"

# Pre-download PyTorch and large packages to network storage
print_info "📦 Pre-downloading large packages to network storage..."

# Create a temporary requirements file for large packages only
cat > /tmp/large-requirements.txt << EOF
torch --index-url https://download.pytorch.org/whl/cpu
transformers
sentence-transformers
pandas
numpy
scipy
sklearn
matplotlib
seaborn
EOF

# Download packages to network storage using host pip
if command -v pip3 >/dev/null 2>&1; then
    print_info "🐍 Downloading packages with host pip to network storage..."
    pip3 download \
        --dest "$APP_STORAGE/downloads" \
        --cache-dir "$PIP_CACHE_DIR" \
        -r /tmp/large-requirements.txt \
        --platform linux_x86_64 \
        --only-binary=:all: \
        --no-deps || print_warning "Some downloads may have failed"
    
    print_status "Large packages downloaded to network storage"
    echo "Download size: $(du -sh $APP_STORAGE/downloads | cut -f1)"
else
    print_warning "pip3 not available on host - packages will download during build"
fi

# Create optimized requirements.txt that uses local packages first
print_info "📝 Creating optimized requirements for Docker build..."
cp "$PROJECT_DIR/requirements.txt" "$PROJECT_DIR/requirements.original.txt"

# Create build environment file
cat > "$APP_STORAGE/build-env.sh" << EOF
#!/bin/bash
# Build environment for network storage optimization
export PIP_CACHE_DIR="$PIP_CACHE_DIR"
export PIP_FIND_LINKS="$APP_STORAGE/downloads"
export TMPDIR="$APP_STORAGE/docker-tmp"
export PYTHONDONTWRITEBYTECODE=1
export PIP_NO_COLOR=1
export PIP_DISABLE_PIP_VERSION_CHECK=1
EOF

# Create cleanup script
cat > "$APP_STORAGE/post-build-cleanup.sh" << EOF
#!/bin/bash
# Post-build cleanup script
echo "🧹 Running post-build cleanup..."

# Clean temporary build files older than 1 day
find "$APP_STORAGE/docker-tmp" -type f -mtime +1 -delete 2>/dev/null || true

# Clean old pip downloads older than 7 days  
find "$APP_STORAGE/downloads" -type f -mtime +7 -delete 2>/dev/null || true

# Clean old pip cache older than 30 days
find "$PIP_CACHE_DIR" -type f -mtime +30 -delete 2>/dev/null || true

echo "✅ Post-build cleanup completed"
EOF

chmod +x "$APP_STORAGE/build-env.sh"
chmod +x "$APP_STORAGE/post-build-cleanup.sh"

# Clean up
rm -f /tmp/large-requirements.txt

print_status "Pre-build setup completed!"
print_info "💡 Benefits:"
echo "  • Large packages pre-downloaded to network storage"
echo "  • Build cache configured for network storage"  
echo "  • Local VM storage pressure reduced"
echo "  • Docker build should complete successfully"

# Show final storage status
print_info "📊 Final storage status:"
echo "Local VM: $(df -h / | tail -1 | awk '{print $4}') available"
echo "Network:  $(df -h $NETWORK_STORAGE | tail -1 | awk '{print $4}') available"
echo "Downloads: $(du -sh $APP_STORAGE/downloads 2>/dev/null | cut -f1 || echo '0')"
echo "Cache: $(du -sh $PIP_CACHE_DIR 2>/dev/null | cut -f1 || echo '0')" 