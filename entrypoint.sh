#!/bin/bash

set -e

echo "Mistral Network Security Analysis - Container Starting"
echo "====================================================="

# Function to wait for service to be available
wait_for_service() {
    local host=$1
    local port=$2
    local service_name=$3
    local max_wait=60
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

# Function to start API server with retry logic
start_api_with_retry() {
    cd /app/Agent
    
    echo "🚀 Starting API server with health-check-friendly mode..."
    
    # Set environment for health-check-friendly startup
    export STARTUP_MODE="health_check_friendly"
    
    # Start the API server directly (uvicorn will handle the server lifecycle)
    echo "🔄 Starting uvicorn server..."
    python api_server.py
}

# Main execution
echo "🔧 Running pre-startup checks..."

# Check environment
check_environment

# Prepare directories
prepare_directories

# Check if a specific command was passed
if [ "$1" = "api" ]; then
    echo "🎯 Starting Security Analysis API Server..."
    
    # Check if we should wait for dependencies
    if [ "$LIGHTWEIGHT_MODE" != "true" ]; then
        echo "🔄 Checking database dependencies..."
        wait_for_service "${MILVUS_HOST:-milvus}" "${MILVUS_PORT:-19530}" "Milvus"
        wait_for_service "${NEO4J_HOST:-neo4j}" "${NEO4J_PORT:-7687}" "Neo4j"
    else
        echo "⚡ Lightweight mode enabled - skipping database dependency checks"
    fi
    
    # Start the API server with retry logic
    start_api_with_retry
    
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