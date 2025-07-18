#!/bin/bash

echo "🚀 Complete Docker Application Deployment Script"
echo "================================================"

# Set error handling
set -e

# Function to check if container is healthy
check_container_health() {
    local container_name=$1
    local max_attempts=30
    local attempt=1
    
    echo "🔍 Checking health of $container_name..."
    
    while [ $attempt -le $max_attempts ]; do
        if docker-compose ps $container_name | grep -q "healthy\|Up"; then
            echo "✅ $container_name is healthy"
            return 0
        fi
        
        echo "⏳ Attempt $attempt/$max_attempts: $container_name not ready yet..."
        sleep 10
        attempt=$((attempt + 1))
    done
    
    echo "⚠️ $container_name did not become healthy within expected time"
    return 1
}

# Function to fix common issues
fix_common_issues() {
    echo "🔧 Fixing common deployment issues..."
    
    # Fix Shibboleth metadata validity interval
    echo "🔧 Fixing Shibboleth metadata validity interval..."
    sudo sed -i 's/maxValidityInterval="[^"]*"/maxValidityInterval="86400"/g' /etc/shibboleth/shibboleth2.xml 2>/dev/null || true
    sudo systemctl restart shibd 2>/dev/null || true
    
    # Fix Neo4j permissions if unhealthy
    echo "🔧 Fixing Neo4j permissions..."
    sudo chown -R 7474:7474 /srv/homedir/mistral-app/data/neo4j 2>/dev/null || true
    sudo chown -R 7474:7474 /srv/homedir/mistral-app/logs/neo4j 2>/dev/null || true
    
    # Clear any corrupted Docker networks
    echo "🔧 Cleaning up Docker networks..."
    docker network prune -f || true
}

# Main deployment process
main() {
    echo "📁 Changing to project directory..."
    cd /home/vcm/mistral-enhancing-network-security-analysis || exit 1
    
    echo "🔄 Resolving Git conflicts and updating..."
    git stash || true
    git pull origin main || echo "Git pull completed"
    git stash pop || echo "No stashed changes"
    
    echo "🧹 Stopping existing containers..."
    docker-compose down --remove-orphans || true
    
    echo "🔧 Applying fixes..."
    fix_common_issues
    
    echo "🏗️ Building all services..."
    docker-compose build --no-cache
    
    echo "🚀 Starting infrastructure services first..."
    docker-compose up -d etcd minio
    sleep 30
    
    echo "🚀 Starting database services..."
    docker-compose up -d neo4j milvus
    sleep 60
    
    echo "🚀 Starting application services..."
    docker-compose up -d mistral-app
    sleep 30
    
    echo "🚀 Starting frontend service..."
    docker-compose up -d frontend
    sleep 30
    
    echo "🔍 Checking service health..."
    check_container_health "etcd" || echo "⚠️ etcd issues detected"
    check_container_health "minio" || echo "⚠️ minio issues detected"
    check_container_health "milvus" || echo "⚠️ milvus issues detected"
    check_container_health "neo4j" || echo "⚠️ neo4j issues detected"
    check_container_health "mistral-app" || echo "⚠️ mistral-app issues detected"
    check_container_health "frontend" || echo "⚠️ frontend issues detected"
    
    echo "📊 Final container status:"
    docker-compose ps
    
    echo "🌐 Service endpoints:"
    echo "  - Frontend: https://levantai.colab.duke.edu:3000"
    echo "  - Backend API: https://levantai.colab.duke.edu:8000"
    echo "  - Neo4j Browser: https://levantai.colab.duke.edu:7474"
    echo "  - Milvus: https://levantai.colab.duke.edu:19530"
    echo "  - MinIO Console: https://levantai.colab.duke.edu:9001"
    
    echo "✅ Complete Docker deployment finished!"
}

# Run main function
main "$@"
