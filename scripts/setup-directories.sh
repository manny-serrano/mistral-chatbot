#!/bin/bash

# Pre-deployment directory setup script
# Ensures all required directories exist for Docker volume mounts

echo "🗂️ Setting up required directories for Docker deployment..."

# Create base directories
mkdir -p data/{neo4j,milvus,etcd,minio}
mkdir -p logs/{neo4j}
mkdir -p network-storage/model-cache

# Create network storage directories if path is specified
if [ -n "${NETWORK_STORAGE_PATH}" ] && [ "${NETWORK_STORAGE_PATH}" != "./network-storage" ]; then
    echo "📁 Creating network storage directories at: ${NETWORK_STORAGE_PATH}"
    mkdir -p "${NETWORK_STORAGE_PATH}/model-cache"
    mkdir -p "${NETWORK_STORAGE_PATH}/pip-cache"
    mkdir -p "${NETWORK_STORAGE_PATH}/docker-build-cache"
fi

# Create log directories if path is specified
if [ -n "${LOG_PATH}" ] && [ "${LOG_PATH}" != "./logs" ]; then
    echo "📁 Creating log directories at: ${LOG_PATH}"
    mkdir -p "${LOG_PATH}/neo4j"
fi

# Set proper permissions
chmod 755 data logs network-storage 2>/dev/null || true
chmod 755 data/* logs/* network-storage/* 2>/dev/null || true

echo "✅ Directory setup complete!"
echo "Created directories:"
echo "  - data/{neo4j,milvus,etcd,minio}"
echo "  - logs/{neo4j}"
echo "  - network-storage/model-cache"

# List created directories
ls -la data/ logs/ network-storage/ 2>/dev/null || true 