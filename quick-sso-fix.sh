#!/bin/bash

# Quick SSO Fix Script - Just restart containers and fix SSO
# This script is designed to run quickly without rebuilding Docker images

set -e

echo "🚀 Quick SSO Fix - Restarting containers and fixing Shibboleth..."

# Navigate to project directory
cd /home/vcm/mistral-enhancing-network-security-analysis

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Stop containers
echo "🛑 Stopping containers..."
docker-compose down || true

# Start containers without building (use existing images)
echo "🐳 Starting containers with existing images..."
docker-compose up -d --no-build

# Wait for containers to start
echo "⏳ Waiting 30 seconds for containers to start..."
sleep 30

# Check container status
echo "📊 Container status:"
docker-compose ps

# Run SSO configuration deployment
echo "🔧 Running SSO configuration deployment..."
if [ -f "/tmp/deploy-sso-config.sh" ]; then
    sudo /tmp/deploy-sso-config.sh
else
    echo "⚠️  SSO deployment script not found, skipping"
fi

# Restart Shibboleth and Apache
echo "🔄 Restarting Shibboleth and Apache..."
sudo systemctl restart shibd || true
sudo systemctl restart apache2 || true

echo "✅ Quick SSO fix completed!"
