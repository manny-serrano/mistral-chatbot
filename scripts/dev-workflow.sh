#!/bin/bash

set -e

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

# Function to show help
show_help() {
    echo "Mistral Network Security Analysis - Development Workflow"
    echo "======================================================="
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  dev-start      Start development environment with hot reload"
    echo "  dev-stop       Stop development environment"
    echo "  dev-logs       Show development logs"
    echo "  dev-deploy     Deploy development build to VM"
    echo "  prod-deploy    Deploy production build to VM (full rebuild)"
    echo "  local-test     Run services locally for testing"
    echo "  help           Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 dev-start              # Start hot reload development"
    echo "  $0 dev-deploy             # Quick deploy to VM for testing"
    echo "  $0 prod-deploy            # Full production deployment"
    echo "  $0 dev-logs mistral-app   # Show logs for specific service"
    echo ""
    echo "Development Workflow Options:"
    echo "  1. Local Hot Reload: Code changes reflect immediately"
    echo "  2. VM Development: Quick deploy for testing on VM"
    echo "  3. Production: Full rebuild and deployment"
}

# Function to check if .env exists
check_env() {
    if [ ! -f ".env" ]; then
        print_error ".env file not found!"
        echo "Please create a .env file with your configuration."
        exit 1
    fi
}

# Function to determine Docker Compose command
get_docker_compose() {
    if command -v docker-compose &> /dev/null; then
        echo "docker-compose"
    elif docker compose version &> /dev/null; then
        echo "docker compose"
    else
        print_error "Docker Compose not found!"
        exit 1
    fi
}

# Function to start development environment
dev_start() {
    print_info "Starting development environment with hot reload..."
    
    local DOCKER_COMPOSE=$(get_docker_compose)
    
    # Stop any existing containers
    print_info "Stopping existing containers..."
    $DOCKER_COMPOSE -f docker-compose.yml down 2>/dev/null || true
    $DOCKER_COMPOSE -f docker-compose.dev.yml down 2>/dev/null || true
    
    # Start development services
    print_info "Starting development services..."
    $DOCKER_COMPOSE -f docker-compose.dev.yml up -d --build
    
    # Wait for services
    print_info "Waiting for services to be ready..."
    sleep 30
    
    # Check health
    print_info "Checking service health..."
    if curl -f http://localhost:8000/health > /dev/null 2>&1; then
        print_status "✅ API is healthy at http://localhost:8000"
    else
        print_warning "⚠️ API health check failed"
    fi
    
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        print_status "✅ Frontend is healthy at http://localhost:3000"
    else
        print_warning "⚠️ Frontend health check failed"
    fi
    
    print_status "Development environment started!"
    print_info "Code changes will automatically reload"
    print_info "API: http://localhost:8000 (with auto-reload)"
    print_info "Frontend: http://localhost:3000 (with hot reload)"
    print_info "API Docs: http://localhost:8000/docs"
    print_info "Neo4j: http://localhost:7474"
}

# Function to stop development environment
dev_stop() {
    print_info "Stopping development environment..."
    
    local DOCKER_COMPOSE=$(get_docker_compose)
    
    $DOCKER_COMPOSE -f docker-compose.dev.yml down
    $DOCKER_COMPOSE -f docker-compose.yml down 2>/dev/null || true
    
    print_status "Development environment stopped"
}

# Function to show development logs
dev_logs() {
    local DOCKER_COMPOSE=$(get_docker_compose)
    local SERVICE=${1:-""}
    
    if [ -n "$SERVICE" ]; then
        print_info "Showing logs for service: $SERVICE"
        $DOCKER_COMPOSE -f docker-compose.dev.yml logs -f "$SERVICE"
    else
        print_info "Showing logs for all services"
        $DOCKER_COMPOSE -f docker-compose.dev.yml logs -f
    fi
}

# Function to deploy development build to VM
dev_deploy() {
    print_info "Deploying development build to VM..."
    
    if [ -z "$VM_HOST" ] || [ -z "$VM_USER" ]; then
        print_error "VM_HOST and VM_USER environment variables must be set"
        echo "Export them or add to .env file:"
        echo "  export VM_HOST=your-vm-ip"
        echo "  export VM_USER=vcm"
        exit 1
    fi
    
    # Build locally first for faster VM deployment
    print_info "Building images locally..."
    local DOCKER_COMPOSE=$(get_docker_compose)
    $DOCKER_COMPOSE build --no-cache
    
    # Create development deployment script
    cat > /tmp/dev-deploy-to-vm.sh << 'EOF'
#!/bin/bash
set -e

echo "🚀 Starting development deployment..."
cd /home/${VM_USER:-vcm}/mistral-enhancing-network-security-analysis

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Update .env for development
echo "🔧 Updating .env for development..."
if [ ! -f .env ]; then
    cat > .env << EOL
OPENAI_API_KEY=$OPENAI_API_KEY
OPENAI_API_BASE=https://litellm.oit.duke.edu
MILVUS_HOST=milvus
MILVUS_PORT=19530
NEO4J_URI=bolt://neo4j:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password123
API_HOST=0.0.0.0
API_PORT=8000
NEXT_PUBLIC_API_URL=http://$VM_HOST:8000
NEXT_PUBLIC_APP_URL=http://$VM_HOST:3000
ENVIRONMENT=development
EOL
fi

# Quick restart without full rebuild
echo "🔄 Quick restart of services..."
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
elif docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
fi

$DOCKER_COMPOSE down
$DOCKER_COMPOSE up -d --no-build

# Quick health check
echo "🏥 Quick health check..."
sleep 15
if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ API is healthy"
else
    echo "⚠️ API needs more time to start"
fi

echo "✅ Development deployment completed!"
echo "🌐 Access at: http://$VM_HOST:3000"
EOF

    # Deploy to VM
    print_info "Deploying to VM..."
    scp -o StrictHostKeyChecking=no /tmp/dev-deploy-to-vm.sh $VM_USER@$VM_HOST:/tmp/
    ssh -o StrictHostKeyChecking=no $VM_USER@$VM_HOST "OPENAI_API_KEY='$OPENAI_API_KEY' VM_HOST='$VM_HOST' VM_USER='$VM_USER' bash /tmp/dev-deploy-to-vm.sh"
    
    print_status "✅ Development deployment completed!"
    print_info "🌐 Access your app at: http://$VM_HOST:3000"
    
    # Clean up
    rm /tmp/dev-deploy-to-vm.sh
}

# Function to deploy production build to VM
prod_deploy() {
    print_info "Deploying production build to VM (full rebuild)..."
    
    if [ -z "$VM_HOST" ] || [ -z "$VM_USER" ]; then
        print_error "VM_HOST and VM_USER environment variables must be set"
        echo "Export them or add to .env file:"
        echo "  export VM_HOST=your-vm-ip"
        echo "  export VM_USER=vcm"
        exit 1
    fi
    
    # Use existing production deployment script
    print_info "Using production deployment script..."
    scp -o StrictHostKeyChecking=no scripts/deploy-to-vm.sh $VM_USER@$VM_HOST:/tmp/
    ssh -o StrictHostKeyChecking=no $VM_USER@$VM_HOST "OPENAI_API_KEY='$OPENAI_API_KEY' VM_HOST='$VM_HOST' bash /tmp/deploy-to-vm.sh"
    
    print_status "✅ Production deployment completed!"
    print_info "🌐 Access your app at: http://$VM_HOST:3000"
}

# Function to run local tests
local_test() {
    print_info "Running local tests..."
    
    local DOCKER_COMPOSE=$(get_docker_compose)
    
    # Start minimal services for testing
    print_info "Starting minimal services for testing..."
    $DOCKER_COMPOSE -f docker-compose.dev.yml up -d neo4j milvus etcd minio
    
    # Wait for databases
    print_info "Waiting for databases to be ready..."
    sleep 30
    
    # Run tests
    print_info "Running tests..."
    # Add your test commands here
    echo "Test environment ready!"
    echo "Neo4j: http://localhost:7474"
    echo "Milvus: http://localhost:19530"
    echo "MinIO: http://localhost:9001"
    
    print_status "Local test environment ready!"
}

# Main script logic
case "$1" in
    "dev-start")
        check_env
        dev_start
        ;;
    "dev-stop")
        dev_stop
        ;;
    "dev-logs")
        dev_logs "$2"
        ;;
    "dev-deploy")
        check_env
        dev_deploy
        ;;
    "prod-deploy")
        check_env
        prod_deploy
        ;;
    "local-test")
        check_env
        local_test
        ;;
    "help"|"--help"|"-h")
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac 