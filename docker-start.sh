#!/bin/bash

# =============================================================================
# MISTRAL NETWORK SECURITY ANALYSIS - DOCKER STARTUP SCRIPT
# =============================================================================

set -e

echo "Starting Mistral Network Security Analysis Platform"
echo "============================================="

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "Error: .env file not found!"
    echo "Please ensure your .env file exists in the root directory with required environment variables."
    exit 1
fi

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        echo "Error: Docker is not running!"
        echo "Please start Docker Desktop and try again."
        exit 1
    fi
}

# Function to start services
start_services() {
    echo "Building and starting all services..."
    docker-compose up --build -d
    
    echo ""
    echo "Waiting for services to be ready..."
    echo "This may take a few minutes on first startup..."
    
    # Wait for health checks
    echo "Starting etcd..."
    docker-compose exec -T etcd etcdctl endpoint health || true
    
    echo "Starting minio..."
    docker-compose exec -T minio curl -f http://localhost:9000/minio/health/live || true
    
    echo "Starting milvus..."
    docker-compose exec -T milvus curl -f http://localhost:9091/healthz || true
    
    echo "Starting neo4j..."
    docker-compose exec -T neo4j curl -f http://localhost:7474 || true
    
    echo ""
    echo "All services started successfully!"
    echo ""
    echo "Service URLs:"
    echo "Neo4j Browser:  http://localhost:7474"
    echo "Minio Console:  http://localhost:9001"
    echo "Milvus Health:  http://localhost:9091/healthz"
    echo "Application:    docker-compose exec mistral-app bash"
    echo ""
    echo "To view logs: docker-compose logs -f [service-name]"
    echo "To stop all:  docker-compose down"
}

# Function to stop services
stop_services() {
    echo "Stopping all services..."
    docker-compose down
    echo "All services stopped."
}

# Function to show status
show_status() {
    echo "Service Status:"
    docker-compose ps
}

# Function to show logs
show_logs() {
    if [ -n "$1" ]; then
        docker-compose logs -f "$1"
    else
        docker-compose logs -f
    fi
}

# Function to enter application container
enter_app() {
    echo "Entering application container..."
    docker-compose exec mistral-app bash
}

# Main script logic
case "${1:-start}" in
    "start")
        check_docker
        start_services
        ;;
    "stop")
        stop_services
        ;;
    "restart")
        stop_services
        check_docker
        start_services
        ;;
    "status")
        show_status
        ;;
    "logs")
        show_logs "$2"
        ;;
    "app")
        enter_app
        ;;
    "help"|"--help"|"-h")
        echo "Usage: $0 {start|stop|restart|status|logs [service]|app|help}"
        echo ""
        echo "Commands:"
        echo "  start    - Start all services (default)"
        echo "  stop     - Stop all services"
        echo "  restart  - Restart all services"
        echo "  status   - Show service status"
        echo "  logs     - Show logs (optionally for specific service)"
        echo "  app      - Enter the application container"
        echo "  help     - Show this help message"
        ;;
    *)
        echo "Unknown command: $1"
        echo "Use '$0 help' for usage information."
        exit 1
        ;;
esac 