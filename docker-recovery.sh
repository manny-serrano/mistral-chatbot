#!/bin/bash

echo "🐳 Docker Container Recovery Script"
echo "================================="

# Enhanced logging
set -e
export COMPOSE_HTTP_TIMEOUT=300
export DOCKER_CLIENT_TIMEOUT=300

# Function to wait for container to be ready with better error handling
wait_for_container() {
    local container_name=$1
    local max_attempts=60
    local attempt=1
    
    echo "⏳ Waiting for $container_name to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if docker-compose ps -q "$container_name" >/dev/null 2>&1; then
            local container_id=$(docker-compose ps -q "$container_name")
            if [ -n "$container_id" ]; then
                local status=$(docker inspect --format='{{.State.Status}}' "$container_id" 2>/dev/null || echo "unknown")
                if [ "$status" = "running" ]; then
                    echo "✅ $container_name is ready"
                    return 0
                fi
            fi
        fi
        echo "⏳ Attempt $attempt/$max_attempts - waiting for $container_name..."
        sleep 10
        ((attempt++))
    done
    
    echo "❌ $container_name failed to become ready after $max_attempts attempts"
    echo "📋 Container logs for $container_name:"
    docker-compose logs --tail=20 "$container_name" 2>/dev/null || echo "No logs available"
    return 1
}

# Function to check if a service is healthy
check_service_health() {
    local service=$1
    local port=$2
    local max_attempts=30
    local attempt=1
    
    echo "🔍 Checking $service health on port $port..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "http://localhost:$port" >/dev/null 2>&1; then
            echo "✅ $service is healthy"
            return 0
        fi
        echo "⏳ Attempt $attempt/$max_attempts - waiting for $service..."
        sleep 10
        ((attempt++))
    done
    
    echo "❌ $service failed to become healthy after $max_attempts attempts"
    return 1
}

# Function to restart services in proper order
restart_services_sequentially() {
    echo "🔄 Restarting services in proper order..."
    
    # Stop all services first
    echo "🛑 Stopping all services..."
    docker-compose down --remove-orphans --timeout 60
    
    # Clean up any dangling resources
    echo "🧹 Cleaning up dangling resources..."
    docker system prune -f >/dev/null 2>&1
    
    # Start infrastructure services first (no dependencies)
    echo "🚀 Starting infrastructure services..."
    docker-compose up -d etcd minio neo4j --timeout 120
    
    # Wait for infrastructure to be ready
    echo "⏳ Waiting for infrastructure services..."
    sleep 45
    wait_for_container "etcd" || echo "⚠️ etcd may not be fully ready"
    wait_for_container "minio" || echo "⚠️ minio may not be fully ready"
    wait_for_container "neo4j" || echo "⚠️ neo4j may not be fully ready"
    
    # Start Milvus (depends on etcd and minio)
    echo "🚀 Starting Milvus..."
    docker-compose up -d milvus --timeout 120
    sleep 45
    wait_for_container "milvus" || echo "⚠️ milvus may not be fully ready"
    
    # Start application services
    echo "🚀 Starting application services..."
    docker-compose up -d mistral-app --timeout 120
    sleep 45
    wait_for_container "mistral-app" || echo "⚠️ mistral-app may not be fully ready"
    
    # Start frontend last
    echo "🚀 Starting frontend..."
    docker-compose up -d frontend --timeout 120
    sleep 30
    wait_for_container "frontend" || echo "⚠️ frontend may not be fully ready"
    
    echo "✅ All services started"
}

# Function to check overall system health
check_system_health() {
    echo "🏥 Performing system health check..."
    
    # Check container status
    echo "📊 Container Status:"
    docker-compose ps
    
    # Check critical services
    local services_ok=true
    
    # Check if Neo4j is accessible
    if ! check_service_health "Neo4j" "7474"; then
        services_ok=false
    fi
    
    # Check if MinIO is accessible  
    if ! check_service_health "MinIO" "9001"; then
        services_ok=false
    fi
    
    # Check if main application is accessible
    if ! check_service_health "Mistral App" "8000"; then
        services_ok=false
    fi
    
    # Check if frontend is accessible
    if ! check_service_health "Frontend" "3000"; then
        services_ok=false
    fi
    
    if $services_ok; then
        echo "✅ All critical services are healthy"
        return 0
    else
        echo "❌ Some services are not healthy"
        return 1
    fi
}

# Main execution
echo "📋 Starting Docker recovery process..."

# Check current status
echo "📊 Current container status:"
docker-compose ps

# Restart services
restart_services_sequentially

# Wait for startup
echo "⏳ Waiting for services to fully initialize..."
sleep 60

# Check health
if check_system_health; then
    echo "🎉 Docker recovery completed successfully!"
    echo "🌐 Services should be accessible at:"
    echo "   - Frontend: http://localhost:3000"
    echo "   - API: http://localhost:8000"
    echo "   - Neo4j Browser: http://localhost:7474"
    echo "   - MinIO Console: http://localhost:9001"
    exit 0
else
    echo "⚠️ Docker recovery completed with some issues"
    echo "📋 Check individual service logs:"
    echo "   docker-compose logs <service_name>"
    exit 1
fi
