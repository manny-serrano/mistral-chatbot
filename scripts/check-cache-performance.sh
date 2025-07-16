#!/bin/bash
# Docker Cache Performance Monitor
# Shows cache effectiveness and build time improvements

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${GREEN}✅${NC} $1"; }
print_info() { echo -e "${BLUE}ℹ️${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠️${NC} $1"; }

echo "🚀 Docker Cache Performance Report"
echo "=================================="

# Check BuildKit status (always enabled in our setup)
if docker buildx version >/dev/null 2>&1; then
    print_status "BuildKit is configured and available"
    if [ "$DOCKER_BUILDKIT" = "1" ]; then
        print_status "BuildKit optimizations are active"
    else
        print_info "BuildKit available (will be auto-enabled during builds)"
    fi
else
    print_warning "BuildKit not detected - may need installation"
    echo "Deploy script will automatically install and configure BuildKit"
fi

echo ""
print_info "📊 Docker System Overview:"
docker system df 2>/dev/null || echo "Docker not available"

echo ""
print_info "🗂️ Layer Cache Status:"
TOTAL_IMAGES=$(docker images -q | wc -l)
CACHED_LAYERS=$(docker images --format "{{.ID}}" | sort | uniq | wc -l)
echo "Total images: $TOTAL_IMAGES"
echo "Unique layers: $CACHED_LAYERS"

if [ $TOTAL_IMAGES -gt 0 ]; then
    CACHE_RATIO=$((CACHED_LAYERS * 100 / TOTAL_IMAGES))
    if [ $CACHE_RATIO -gt 70 ]; then
        print_status "Cache efficiency: ${CACHE_RATIO}% (Good)"
    elif [ $CACHE_RATIO -gt 40 ]; then
        print_warning "Cache efficiency: ${CACHE_RATIO}% (Moderate)"
    else
        print_warning "Cache efficiency: ${CACHE_RATIO}% (Poor)"
    fi
fi

echo ""
print_info "🔄 Recent Build Activity:"
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.CreatedAt}}\t{{.Size}}" | grep -E "(mistral|frontend)" | head -5

echo ""
print_info "📈 Cache Performance Tips:"
echo "• First build: ~5-10 minutes (no cache)"
echo "• With cache: ~2-3 minutes (layers reused)"
echo "• Code-only changes: ~30-60 seconds"
echo ""
echo "🎯 To maximize cache effectiveness:"
echo "1. Avoid --no-cache unless necessary"
echo "2. Use DOCKER_BUILDKIT=1"
echo "3. Organize Dockerfile with least-changing layers first"
echo "4. Use cache mounts for package managers"

echo ""
if [ -d "/srv/homedir/mistral-app" ]; then
    print_status "Network storage available for persistent cache"
    CACHE_SIZE=$(du -sh /srv/homedir/mistral-app/docker-build-cache 2>/dev/null | cut -f1 || echo "0")
    echo "Network cache size: $CACHE_SIZE"
else
    print_warning "Network storage not available - cache will be local only"
fi 