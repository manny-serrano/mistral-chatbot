#!/bin/bash

# Don't exit on error immediately - we want to handle errors gracefully
set +e

echo "Mistral Network Security Analysis - Container Starting"
echo "====================================================="

# Add debug information
echo "🔍 Debug Information:"
echo "  • Working Directory: $(pwd)"
echo "  • User: $(whoami)"
echo "  • Python: $(which python || echo 'Python not found!')"
echo "  • Environment: ${ENVIRONMENT:-production}"
echo "  • API Host: ${API_HOST:-0.0.0.0}"
echo "  • API Port: ${API_PORT:-8000}"

# Function to wait for service to be available
wait_for_service() {
    local host=$1
    local port=$2
    local service_name=$3
    local max_wait=30  # Reduced from 60 to 30
    local wait_time=0
    
    echo "Waiting for $service_name at $host:$port..."
    while ! nc -z "$host" "$port" 2>/dev/null; do
        if [ $wait_time -ge $max_wait ]; then
            echo "⚠️  $service_name not available after ${max_wait}s - continuing anyway"
            return 1
        fi
        sleep 2
        wait_time=$((wait_time + 2))
    done
    echo "✅ $service_name is available"
    return 0
}

# Function to check environment variables
check_environment() {
    echo "🔍 Checking environment variables..."
    
    # Check critical environment variables
    local missing_vars=()
    
    if [ -z "$OPENAI_API_KEY" ]; then
        echo "⚠️  OPENAI_API_KEY not set"
        missing_vars+=("OPENAI_API_KEY")
    fi
    
    if [ -z "$MILVUS_HOST" ]; then
        echo "⚠️  MILVUS_HOST not set, using default 'milvus'"
        export MILVUS_HOST="milvus"
    fi
    
    if [ -z "$NEO4J_URI" ]; then
        echo "⚠️  NEO4J_URI not set, using default 'bolt://neo4j:7687'"
        export NEO4J_URI="bolt://neo4j:7687"
    fi
    
    # Show environment info
    echo "📋 Environment Configuration:"
    echo "  • LIGHTWEIGHT_MODE: ${LIGHTWEIGHT_MODE:-false}"
    echo "  • API_HOST: ${API_HOST:-0.0.0.0}"
    echo "  • API_PORT: ${API_PORT:-8000}"
    echo "  • MILVUS_HOST: ${MILVUS_HOST:-milvus}"
    echo "  • NEO4J_URI: ${NEO4J_URI:-bolt://neo4j:7687}"
    echo "  • MODEL_CACHE_DIR: ${MODEL_CACHE_DIR:-/tmp/model-cache}"
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        echo "⚠️  Missing critical environment variables: ${missing_vars[*]}"
        if [ "$LIGHTWEIGHT_MODE" != "true" ]; then
            echo "💡 Consider setting LIGHTWEIGHT_MODE=true for testing"
        fi
    fi
}

# Function to prepare directories
prepare_directories() {
    echo "📁 Preparing directories..."
    
    # Ensure required directories exist
    mkdir -p /app/data /app/logs /tmp/model-cache
    
    # Fix permissions
    chown -R appuser:appuser /app/data /app/logs /tmp/model-cache 2>/dev/null || true
    
    echo "✅ Directories prepared"
}

# Function to start API server with better error handling
start_api_with_retry() {
    cd /app
    
    echo "🚀 Starting API server with health-check-friendly mode..."
    echo "Current directory: $(pwd)"
    echo "Python path: $(which python)"
    echo "Virtual environment: $PATH"
    
    # Ensure virtual environment is activated
    export PATH="/opt/venv/bin:$PATH"
    export VIRTUAL_ENV="/opt/venv"
    
    # Set environment for health-check-friendly startup
    export STARTUP_MODE="health_check_friendly"
    
    # Force lightweight mode during initial startup in CI/CD
    if [ "${CI:-false}" = "true" ] || [ "${GITLAB_CI:-false}" = "true" ]; then
        echo "🚀 CI/CD environment detected - forcing lightweight mode for initial startup"
        export LIGHTWEIGHT_MODE="true"
    fi
    
    echo "🔄 Starting uvicorn server..."
    echo "Working directory: $(pwd)"
    echo "Agent directory contents:"
    ls -la Agent/ || echo "Agent directory not found!"
    
    # Change to Agent directory where the api_server.py is located
    cd Agent || {
        echo "❌ Failed to change to Agent directory"
        echo "Current directory contents:"
        ls -la
        exit 1
    }
    
    echo "Current directory: $(pwd)"
    echo "Files in current directory:"
    ls -la
    
    # Check if api_server.py exists
    if [ ! -f "api_server.py" ]; then
        echo "❌ api_server.py not found in Agent directory!"
        echo "Directory contents:"
        ls -la
        exit 1
    fi
    
    # Start the API server with explicit python path
    echo "Starting API server..."
    
    # Use exec to replace the shell process with the python process
    # This ensures signals are properly handled
    exec python api_server.py 2>&1 | tee -a /tmp/api_server.log
}

# Error handler
handle_error() {
    echo "❌ Error occurred: $1"
    echo "📋 Stack trace:"
    echo "$2"
    
    # Create a simple HTTP server on port 8000 for health checks if API fails
    echo "🔧 Starting fallback health check server..."
    cd /app
    python -m http.server 8000 &
    
    # Keep container running for debugging
    tail -f /dev/null
}

# Main execution with error handling
trap 'handle_error "Unexpected error" "$BASH_SOURCE"' ERR

echo "🔧 Running pre-startup checks..."

# Check environment
check_environment

# Prepare directories
prepare_directories

# Check if a specific command was passed
if [ "$1" = "api" ]; then
    echo "🎯 Starting Security Analysis API Server..."
    
    # In CI/CD or lightweight mode, skip database checks
    if [ "$LIGHTWEIGHT_MODE" = "true" ] || [ "${CI:-false}" = "true" ] || [ "${GITLAB_CI:-false}" = "true" ]; then
        echo "⚡ Lightweight/CI mode enabled - skipping database dependency checks"
    else
        echo "🔄 Checking database dependencies..."
        wait_for_service "${MILVUS_HOST:-milvus}" "${MILVUS_PORT:-19530}" "Milvus"
        wait_for_service "${NEO4J_HOST:-neo4j}" "${NEO4J_PORT:-7687}" "Neo4j"
    fi
    
    # Start the API server with retry logic
    start_api_with_retry || handle_error "Failed to start API server" "Check /tmp/api_server.log"
    
elif [ "$1" = "agent" ]; then
    echo "🤖 Starting Interactive Security Agent..."
    cd /app/Agent
    exec python run_agent.py
elif [ "$1" = "embed" ]; then
    echo "📊 Starting Data Embedding Process..."
    cd /app/embedding_with_llm
    exec python init_milvus_and_embed.py
else
    echo "🖥️  Interactive Mode - Available commands:"
    echo "  • Start API:     docker-compose exec mistral-app api"
    echo "  • Run agent:     cd /app/Agent && python run_agent.py"
    echo "  • Embed data:    cd /app/embedding_with_llm && python init_milvus_and_embed.py"
    echo "  • Start API:     cd /app/Agent && python api_server.py"
    echo "  • Shell access:  bash"
    echo ""
    echo "🗄️  Databases available at:"
    echo "  • Milvus:  milvus:19530"
    echo "  • Neo4j:   neo4j:7687"
    echo ""
    echo "🌐 API Integration:"
    echo "  • API Endpoint:  http://mistral-security-app:8000"
    echo "  • API Docs:      http://localhost:8000/docs (when API is running)"
    echo ""
    
    # Keep container running for interactive use
    exec "$@"
fi 