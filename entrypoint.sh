#!/bin/bash

echo "Mistral Network Security Analysis - Container Ready"
echo "================================================="
echo "Available commands:"
echo "  • Embed data:    cd /app/embedding_with_llm && python init_milvus_and_embed.py"
echo "  • Run agent:     cd /app/Agent && python run_agent.py"
echo "  • Shell access:  bash"
echo ""
echo "Databases available at:"
echo "  • Milvus:  milvus:19530"
echo "  • Neo4j:   neo4j:7687"
echo ""

# Keep container running for interactive use
exec "$@" 