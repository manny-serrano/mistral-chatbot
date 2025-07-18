#!/bin/bash

echo "🚀 Improved Docker Startup Script for CI/CD"
echo "============================================="

# Set timeouts and error handling
set -e
export COMPOSE_HTTP_TIMEOUT=300
export DOCKER_CLIENT_TIMEOUT=300

# Function to check Docker daemon
check_docker() {
    echo "🔍 Checking Docker daemon..."
    if ! docker info >/dev/null 2>&1; then
        echo "❌ Docker daemon is not running"
        exit 1
    fi
    echo "✅ Docker daemon is running"
}

# Function to clean up previous state
cleanup() {
    echo "🧹 Cleaning up previous state..."
    
    # Stop all containers gracefully
    docker-compose down --timeout 30 2>/dev/null || true
    
    # Remove orphaned containers
    docker-compose down --remove-orphans 2>/dev/null || true
    
    # Clean up dangling volumes and networks
    docker system prune -f 2>/dev/null || true
    
    echo "✅ Cleanup completed"
}

# Function to start infrastructure services first
start_infrastructure() {
    echo "🏗️ Starting infrastructure services..."
    
    # Start etcd first (critical dependency)
    echo "🔧 Starting etcd..."
    docker-compose up -d etcd
    
    # Wait for etcd to be healthy
    echo "⏳ Waiting for etcd to be healthy..."
    for i in {1..60}; do
        if docker-compose exec -T etcd etcdctl endpoint health --endpoints=http://localhost:2379 >/dev/null 2>&1; then
            echo "✅ etcd is healthy"
            break
        fi
        if [ $i -eq 60 ]; then
            echo "❌ etcd failed to start"
            docker-compose logs etcd
            exit 1
        fi
        sleep 5
    done
    
    # Start minio
    echo "🗄️ Starting minio..."
    docker-compose up -d minio
    
    # Wait for minio to be healthy
    echo "⏳ Waiting for minio to be healthy..."
    for i in {1..60}; do
        if docker-compose exec -T minio sh -c 'timeout 5 bash -c ":> /dev/tcp/127.0.0.1/9000"' >/dev/null 2>&1; then
            echo "✅ minio is healthy"
            break
        fi
        if [ $i -eq 60 ]; then
            echo "❌ minio failed to start"
            docker-compose logs minio
            exit 1
        fi
        sleep 5
    done
    
    echo "✅ Infrastructure services started successfully"
}

# Function to start application services
start_applications() {
    echo "📱 Starting application services..."
    
    # Start milvus (depends on etcd and minio)
    echo "🔍 Starting milvus..."
    docker-compose up -d milvus
    
    # Start neo4j
    echo "📊 Starting neo4j..."
    docker-compose up -d neo4j
    
    # Start the main application
    echo "🧠 Starting mistral-app..."
    docker-compose up -d mistral-app
    
    # Start frontend
    echo "🌐 Starting frontend..."
    docker-compose up -d frontend
    
    echo "✅ Application services started"
}

# Function to verify all services
verify_services() {
    echo "🔍 Verifying all services..."
    
    # Check container status
    echo "📋 Container status:"
    docker-compose ps
    
    # Wait for health checks
    echo "⏳ Waiting for health checks..."
    sleep 30
    
    # Check health status
    healthy_count=0
    total_services=6
    
    services=("etcd" "minio" "milvus" "neo4j" "mistral-app" "frontend")
    
    for service in "${services[@]}"; do
        if docker-compose ps -q "$service" >/dev/null 2>&1; then
            container_id=$(docker-compose ps -q "$service")
            if [ -n "$container_id" ]; then
                status=$(docker inspect --format='{{.State.Status}}' "$container_id" 2>/dev/null || echo "unknown")
                health=$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}no-health-check{{end}}' "$container_id" 2>/dev/null || echo "unknown")
                
                if [ "$status" = "running" ]; then
                    echo "✅ $service: $status ($health)"
                    ((healthy_count++))
                else
                    echo "❌ $service: $status ($health)"
                    echo "📋 Last 10 log lines for $service:"
                    docker-compose logs --tail=10 "$service"
                fi
            else
                echo "❌ $service: container not found"
            fi
        else
            echo "❌ $service: not running"
        fi
    done
    
    echo "📊 Health summary: $healthy_count/$total_services services running"
    
    if [ $healthy_count -eq $total_services ]; then
        echo "🎉 All services are running successfully!"
        return 0
    else
        echo "⚠️ Some services are not running properly"
        return 1
    fi
}

# Main execution
main() {
    echo "🚀 Starting improved Docker deployment..."
    
    check_docker
    cleanup
    start_infrastructure
    start_applications
    verify_services
    
    echo "✅ Docker deployment completed!"
    echo "🌐 Services should be available at:"
    echo "   - Frontend: http://localhost:3000"
    echo "   - API: http://localhost:8000"
    echo "   - Neo4j: http://localhost:7474"
    echo "   - MinIO: http://localhost:9001"
}

# Execute main function
main "$@"
