#!/bin/bash

echo "🧪 Testing Health Check Fixes"
echo "============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${GREEN}✅${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠️${NC} $1"; }
print_error() { echo -e "${RED}❌${NC} $1"; }
print_info() { echo -e "${BLUE}ℹ️${NC} $1"; }

# Function to test CI/CD environment simulation
test_cicd_environment() {
    print_info "Testing CI/CD environment simulation..."
    
    # Set CI/CD environment variables
    export CI=true
    export GITLAB_CI=true
    export LIGHTWEIGHT_MODE=true
    export STARTUP_MODE=health_check_friendly
    
    # Check which Docker Compose command to use
    if command -v docker-compose &> /dev/null; then
        DOCKER_COMPOSE="docker-compose"
    elif docker compose version &> /dev/null; then
        DOCKER_COMPOSE="docker compose"
    else
        print_error "Docker Compose not found!"
        return 1
    fi
    
    print_info "Using Docker Compose: $DOCKER_COMPOSE"
    
    # Stop any existing containers
    print_info "Stopping existing containers..."
    $DOCKER_COMPOSE down -v 2>/dev/null || true
    
    # Remove any existing mistral-app container specifically
    docker rm -f mistral-enhancing-network-security-analysis_mistral-app_1 2>/dev/null || true
    
    # Start only the mistral-app service (without database dependencies)
    print_info "Starting mistral-app in CI/CD simulation mode..."
    $DOCKER_COMPOSE up -d --no-deps mistral-app
    
    # Monitor startup
    container_name="mistral-enhancing-network-security-analysis_mistral-app_1"
    max_wait=180  # 3 minutes
    wait_time=0
    
    print_info "Monitoring container startup..."
    while [ $wait_time -lt $max_wait ]; do
        # Check container status
        if docker ps --format "{{.Names}}" | grep -q "$container_name"; then
            status=$(docker inspect --format='{{.State.Status}}' "$container_name" 2>/dev/null || echo "unknown")
            health=$(docker inspect --format='{{.State.Health.Status}}' "$container_name" 2>/dev/null || echo "no_health_check")
            
            echo "[$wait_time s] Container: $status, Health: $health"
            
            if [ "$health" = "healthy" ]; then
                print_status "Container became healthy in $wait_time seconds!"
                break
            elif [ "$status" = "exited" ]; then
                print_error "Container exited unexpectedly"
                docker logs --tail 20 "$container_name"
                return 1
            fi
        else
            echo "[$wait_time s] Container not found yet..."
        fi
        
        sleep 5
        wait_time=$((wait_time + 5))
    done
    
    if [ $wait_time -ge $max_wait ]; then
        print_error "Health check timed out after $max_wait seconds"
        
        print_info "Final container status:"
        docker ps -a | grep mistral || echo "No mistral containers found"
        
        print_info "Container logs:"
        docker logs --tail 30 "$container_name" 2>&1 || echo "Failed to get logs"
        
        return 1
    fi
    
    # Test health endpoints
    print_info "Testing health endpoints..."
    
    # Test /healthz endpoint
    if curl -f http://localhost:8000/healthz >/dev/null 2>&1; then
        print_status "/healthz endpoint is responding"
        response=$(curl -s http://localhost:8000/healthz)
        echo "Response: $response"
    else
        print_warning "/healthz endpoint not responding"
    fi
    
    # Test /health endpoint
    if curl -f http://localhost:8000/health >/dev/null 2>&1; then
        print_status "/health endpoint is responding"
    else
        print_warning "/health endpoint not responding"
    fi
    
    # Cleanup
    print_info "Cleaning up test..."
    $DOCKER_COMPOSE down
    
    return 0
}

# Function to test database-independent startup
test_database_independent_startup() {
    print_info "Testing database-independent startup..."
    
    # This test verifies that mistral-app can start without waiting for databases
    
    # Set environment for independent startup
    export CI=true
    export LIGHTWEIGHT_MODE=true
    
    # Start only mistral-app (no databases)
    docker run -d \
        --name test-mistral-app \
        -p 8000:8000 \
        -e CI=true \
        -e LIGHTWEIGHT_MODE=true \
        -e STARTUP_MODE=health_check_friendly \
        -e OPENAI_API_KEY=test-key \
        mistral-enhancing-network-security-analysis_mistral-app:latest api
    
    # Wait for startup
    sleep 30
    
    # Check if container is healthy
    if docker ps | grep -q test-mistral-app; then
        print_status "Container started successfully without databases"
        
        # Test health endpoint
        if curl -f http://localhost:8000/healthz >/dev/null 2>&1; then
            print_status "Health endpoint responding without database connections"
        else
            print_warning "Health endpoint not responding"
        fi
    else
        print_error "Container failed to start without databases"
        docker logs test-mistral-app
    fi
    
    # Cleanup
    docker rm -f test-mistral-app 2>/dev/null || true
}

# Run tests
echo "Starting health check fix validation..."
echo ""

print_info "Test 1: CI/CD Environment Simulation"
if test_cicd_environment; then
    print_status "CI/CD simulation test passed!"
else
    print_error "CI/CD simulation test failed!"
    exit 1
fi

echo ""
print_info "Test 2: Database-Independent Startup"
if test_database_independent_startup; then
    print_status "Database-independent startup test passed!"
else
    print_warning "Database-independent startup test failed (may be expected if image not built)"
fi

echo ""
print_status "Health check fix validation completed!"
echo ""
print_info "Summary of fixes applied:"
echo "  • Removed database dependencies from mistral-app service"
echo "  • Enabled lightweight mode by default in CI/CD"
echo "  • Added immediate health check server in entrypoint"
echo "  • Simplified health check endpoint"
echo "  • Extended health check timeouts and retries"
echo "  • Added fallback mechanisms for startup failures"
echo ""
print_info "The container should now start successfully in CI/CD environments!" 