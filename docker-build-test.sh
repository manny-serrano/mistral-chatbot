#!/bin/bash

# Docker Build Test Script
# This script helps test the Docker build process locally

set -e

echo "🐳 Testing Docker build for Mistral Network Security Analysis"
echo "==============================================="

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

echo "✅ Docker is running"

# Enable BuildKit for better error reporting
export DOCKER_BUILDKIT=1
export BUILDKIT_PROGRESS=plain

echo "🔧 Building Docker image with BuildKit..."
echo "Build context: $(pwd)"

# Build the image
docker build \
    --progress=plain \
    --no-cache \
    -t mistral-network-security:test \
    .

if [ $? -eq 0 ]; then
    echo "✅ Docker build completed successfully!"
    echo ""
    echo "📋 Image details:"
    docker images | grep mistral-network-security
    echo ""
    echo "🧪 You can test the image with:"
    echo "   docker run --rm -it mistral-network-security:test"
else
    echo "❌ Docker build failed!"
    exit 1
fi
