#!/bin/bash

echo "Mistral Security Agent - Direct Function Upload"
echo "=" "================================================"
echo ""

# Check if OpenWebUI container is running
if ! docker-compose ps openwebui | grep -q "Up"; then
    echo "OpenWebUI container is not running!"
    echo "Start it with: docker-compose up -d openwebui"
    exit 1
fi

echo "Method 1: Direct Container Upload (Recommended)"
echo "This bypasses API authentication by using container filesystem access"
echo ""

# Copy function to OpenWebUI container
echo "📤 Copying function to OpenWebUI container..."
docker-compose exec openwebui mkdir -p /app/backend/data/functions/
docker cp openwebui_functions/security_agent_function.py mistral-openwebui:/app/backend/data/functions/

if [ $? -eq 0 ]; then
    echo "Function copied successfully!"
    echo ""
    echo "Restarting OpenWebUI to load the function..."
    docker-compose restart openwebui
    
    echo ""
    echo "Waiting for OpenWebUI to restart..."
    sleep 15
    
    echo ""
    echo "Setup Complete!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "The Mistral Security Agent function is now active!"
    echo ""
    echo "Access: http://localhost:3000"
    echo "Try asking: 'Find suspicious network patterns'"
    echo "Or: 'Show me honeypot attack data'"
    echo "The system will auto-detect security queries!"
    echo ""
else
    echo "Failed to copy function"
    exit 1
fi

echo "Method 2: API Upload (Alternative)"
echo "If you prefer API method:"
echo "1. Get API key from OpenWebUI Settings → Account"
echo "2. export OPENWEBUI_API_KEY='your-key'"
echo "3. python upload_function.py"
echo ""

echo "Verification:"
echo "Check if function is loaded:"
echo "docker-compose exec openwebui ls -la /app/backend/data/functions/" 