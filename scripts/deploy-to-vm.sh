#!/bin/bash
set -e

echo "🚀 Starting deployment..."
cd /home/${VM_USER:-vcm}/mistral-enhancing-network-security-analysis

echo "📥 Pulling latest changes..."
git pull origin main

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
  echo "📝 Creating .env file..."
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
EOL
fi

# Check which Docker Compose command to use
if command -v docker-compose &> /dev/null; then
  DOCKER_COMPOSE="docker-compose"
elif docker compose version &> /dev/null; then
  DOCKER_COMPOSE="docker compose"
else
  echo "❌ Docker Compose not found!"
  exit 1
fi

echo "Using Docker Compose command: $DOCKER_COMPOSE"

# Stop existing services
echo "🛑 Stopping existing services..."
$DOCKER_COMPOSE down || true

# Clean up old images
echo "🧹 Cleaning up old Docker images..."
docker system prune -f || true

# Build and start services with limited resources
echo "🔨 Building and starting services..."
# Build one service at a time to reduce memory usage
$DOCKER_COMPOSE build --no-cache mistral-app
$DOCKER_COMPOSE up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 45

# Check if services are running
echo "🔍 Checking service status..."
$DOCKER_COMPOSE ps

# Health checks
echo "🏥 Running health checks..."

# Check API
for i in {1..10}; do
  if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ API is healthy"
    break
  else
    echo "⏳ Waiting for API... ($i/10)"
    sleep 5
  fi
done

# Check Frontend
for i in {1..10}; do
  if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend is healthy"
    break
  else
    echo "⏳ Waiting for Frontend... ($i/10)"
    sleep 5
  fi
done

# Check Neo4j
if curl -f http://localhost:7474 > /dev/null 2>&1; then
  echo "✅ Neo4j is healthy"
else
  echo "⚠️  Neo4j health check failed"
fi

# Check Milvus
if curl -f http://localhost:9091/healthz > /dev/null 2>&1; then
  echo "✅ Milvus is healthy"
else
  echo "⚠️  Milvus health check failed"
fi

echo "🎉 Deployment completed!"
echo "Frontend: http://$VM_HOST:3000"
echo "API: http://$VM_HOST:8000"
echo "Neo4j: http://$VM_HOST:7474"
echo "MinIO: http://$VM_HOST:9001" 