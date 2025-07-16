#!/bin/bash
# Test script to verify BuildKit configuration
set -e

echo "🧪 Testing BuildKit Configuration"
echo "================================="

# Test 1: Check if buildx is available
echo "📋 Test 1: Checking buildx availability..."
if docker buildx version >/dev/null 2>&1; then
    echo "✅ docker buildx is available"
    docker buildx version
else
    echo "❌ docker buildx not available - will be installed during deployment"
fi

# Test 2: Check Docker version
echo ""
echo "📋 Test 2: Checking Docker version..."
echo "Docker version: $(docker --version)"

# Test 3: Test BuildKit environment
echo ""
echo "📋 Test 3: Testing BuildKit environment..."
export DOCKER_BUILDKIT=1
export BUILDKIT_PROGRESS=plain

# Test a simple build to check for deprecation warnings
echo "Building a minimal test image to check for warnings..."
cat > /tmp/test-dockerfile << 'EOF'
FROM alpine:latest
RUN echo "BuildKit test successful"
EOF

echo "Running test build (checking for deprecation warnings)..."
BUILD_OUTPUT=$(docker build -f /tmp/test-dockerfile -t buildkit-test /tmp 2>&1)
echo "$BUILD_OUTPUT"

# Check for deprecation warnings
if echo "$BUILD_OUTPUT" | grep -i "deprecated.*legacy.*builder" >/dev/null; then
    echo "❌ Deprecation warning detected!"
    echo "The legacy builder deprecation warning is still present."
    exit 1
else
    echo "✅ No deprecation warnings detected"
fi

# Clean up
docker rmi buildkit-test >/dev/null 2>&1 || true
rm -f /tmp/test-dockerfile

echo ""
echo "📋 Test 4: Verifying cache features..."
docker system df 2>/dev/null || echo "Cache information not available"

echo ""
echo "🎉 BuildKit configuration test completed successfully!"
echo "No deprecation warnings detected - ready for deployment." 