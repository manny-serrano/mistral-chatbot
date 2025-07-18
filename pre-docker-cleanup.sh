#!/bin/bash

# Pre-Docker Build Cleanup Script
# This script should be run BEFORE Docker builds to ensure sufficient space

set -e

echo "🧹 Pre-Docker Build Cleanup"
echo "=========================="

# Check current disk usage
echo "📊 Current disk usage:"
df -h / | tail -1

# Stop and remove all Docker containers
echo "🔄 Stopping all Docker containers..."
docker stop $(docker ps -aq) 2>/dev/null || true

echo "🗑️ Removing all Docker containers..."
docker rm $(docker ps -aq) 2>/dev/null || true

# Remove unused Docker resources
echo "🧹 Pruning Docker system (images, networks, volumes)..."
docker system prune -af --volumes 2>/dev/null || true

echo "🔨 Pruning Docker build cache..."
docker builder prune -af 2>/dev/null || true

# Clean system resources
echo "📦 Cleaning APT cache..."
sudo apt-get clean 2>/dev/null || true

echo "📜 Cleaning journal logs..."
sudo journalctl --vacuum-size=100M 2>/dev/null || true

echo "🗂️ Cleaning temporary files..."
sudo rm -rf /tmp/* 2>/dev/null || true

# Clear pip caches
echo "🐍 Cleaning pip caches..."
sudo rm -rf /root/.cache/pip/* 2>/dev/null || true
sudo rm -rf /home/*/.cache/pip/* 2>/dev/null || true

# Check final disk usage
echo "✅ Cleanup completed!"
echo "📊 Final disk usage:"
df -h / | tail -1

# Check if we have enough space (at least 10GB free)
AVAILABLE=$(df / | tail -1 | awk '{print $4}')
AVAILABLE_GB=$((AVAILABLE / 1024 / 1024))

if [ $AVAILABLE_GB -lt 10 ]; then
    echo "⚠️ WARNING: Only ${AVAILABLE_GB}GB available. Docker build may fail!"
    echo "💡 Consider removing more Docker images or cleaning additional files"
else
    echo "✅ ${AVAILABLE_GB}GB available - should be sufficient for Docker build"
fi
