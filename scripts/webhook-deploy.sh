#!/bin/bash

# Webhook-based deployment script
# This script should be run on your VM and will listen for deployment triggers

REPO_DIR="/home/vcm/mistral-enhancing-network-security-analysis"
LOG_FILE="/tmp/deployment.log"

echo "$(date): Starting webhook deployment..." >> $LOG_FILE

cd $REPO_DIR

# Pull latest changes
echo "$(date): Pulling latest changes..." >> $LOG_FILE
git pull origin main >> $LOG_FILE 2>&1

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
  echo "$(date): Creating .env file..." >> $LOG_FILE
  cat > .env << EOL
OPENAI_API_KEY=${OPENAI_API_KEY:-your_openai_api_key_here}
OPENAI_API_BASE=https://litellm.oit.duke.edu
MILVUS_HOST=milvus
MILVUS_PORT=19530
NEO4J_URI=bolt://neo4j:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password123
API_HOST=0.0.0.0
API_PORT=8000
NEXT_PUBLIC_API_URL=http://67.159.74.251:8000
NEXT_PUBLIC_APP_URL=http://67.159.74.251:3000
EOL
fi

# Check which Docker Compose command to use
if command -v docker-compose &> /dev/null; then
  DOCKER_COMPOSE="docker-compose"
elif docker compose version &> /dev/null; then
  DOCKER_COMPOSE="docker compose"
else
  echo "$(date): ERROR - Docker Compose not found!" >> $LOG_FILE
  exit 1
fi

echo "$(date): Using Docker Compose command: $DOCKER_COMPOSE" >> $LOG_FILE

# Stop existing services
echo "$(date): Stopping existing services..." >> $LOG_FILE
$DOCKER_COMPOSE down >> $LOG_FILE 2>&1

# Clean up old images
echo "$(date): Cleaning up old Docker images..." >> $LOG_FILE
docker system prune -f >> $LOG_FILE 2>&1

# Build and start services
echo "$(date): Building and starting services..." >> $LOG_FILE
$DOCKER_COMPOSE up -d --build >> $LOG_FILE 2>&1

# Wait for services to be ready
echo "$(date): Waiting for services to start..." >> $LOG_FILE
sleep 45

# Check if services are running
echo "$(date): Checking service status..." >> $LOG_FILE
$DOCKER_COMPOSE ps >> $LOG_FILE 2>&1

echo "$(date): Deployment completed!" >> $LOG_FILE 