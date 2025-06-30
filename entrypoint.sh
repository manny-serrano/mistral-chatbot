#!/bin/bash

echo "Mistral Network Security Analysis - Container Ready"
echo "================================================="

# Check if a specific command was passed
if [ "$1" = "api" ]; then
    echo "Starting Security Analysis API Server..."
    cd /app/Agent
    exec python api_server.py
elif [ "$1" = "agent" ]; then
    echo "Starting Interactive Security Agent..."
    cd /app/Agent
    exec python run_agent.py
elif [ "$1" = "embed" ]; then
    echo "Starting Data Embedding Process..."
    cd /app/embedding_with_llm
    exec python init_milvus_and_embed.py
else
    echo "Interactive Mode - Available commands:"
    echo "  • Start API:     docker-compose exec mistral-app api"
    echo "  • Run agent:     cd /app/Agent && python run_agent.py"
    echo "  • Embed data:    cd /app/embedding_with_llm && python init_milvus_and_embed.py"
    echo "  • Start API:     cd /app/Agent && python api_server.py"
    echo "  • Shell access:  bash"
    echo ""
    echo "Databases available at:"
    echo "  • Milvus:  milvus:19530"
    echo "  • Neo4j:   neo4j:7687"
    echo ""
    echo "API Integration:"
    echo "  • API Endpoint:  http://mistral-security-app:8000"
    echo "  • API Docs:      http://localhost:8000/docs (when API is running)"
    echo ""
    
    # Keep container running for interactive use
    exec "$@"
fi 