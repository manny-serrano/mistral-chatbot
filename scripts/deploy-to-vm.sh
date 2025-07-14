#!/bin/bash
set -e

echo "🚀 Starting deployment with network storage optimization..."
cd /home/${VM_USER:-vcm}/mistral-enhancing-network-security-analysis

# Network storage configuration
NETWORK_STORAGE="/srv/homedir"
APP_STORAGE="$NETWORK_STORAGE/mistral-app"

# Check if network storage is mounted
if [ ! -d "$NETWORK_STORAGE" ] || [ ! -w "$NETWORK_STORAGE" ]; then
  echo "⚠️  Network storage not available at $NETWORK_STORAGE"
  echo "Proceeding with local storage only..."
  USE_NETWORK_STORAGE=false
else
  echo "✅ Network storage available: $(df -h $NETWORK_STORAGE | tail -1 | awk '{print $4}') free"
  USE_NETWORK_STORAGE=true
  
  # Create network storage directories
  echo "📁 Setting up network storage directories..."
  mkdir -p "$APP_STORAGE"/{logs,backups,data,docker-volumes}
  chown -R ${VM_USER:-vcm}:${VM_USER:-vcm} "$APP_STORAGE" 2>/dev/null || true
fi

echo "📥 Pulling latest changes..."
git pull origin main

# Backup current deployment if network storage is available
if [ "$USE_NETWORK_STORAGE" = true ]; then
  echo "💾 Creating deployment backup..."
  BACKUP_DIR="$APP_STORAGE/backups/pre-deploy-$(date +%Y%m%d_%H%M%S)"
  mkdir -p "$BACKUP_DIR"
  
  # Backup current .env and important configs
  cp .env "$BACKUP_DIR/" 2>/dev/null || echo "No .env to backup"
  cp docker-compose.yml "$BACKUP_DIR/" 2>/dev/null || true
  
  # Backup Docker volumes if they exist
  if [ -f "./docker-volumes.sh" ]; then
    echo "📦 Backing up Docker volumes to network storage..."
    ./docker-volumes.sh backup 2>/dev/null || echo "Volume backup failed, continuing..."
    mv docker-volume-backups/* "$APP_STORAGE/backups/" 2>/dev/null || true
    rmdir docker-volume-backups 2>/dev/null || true
  fi
fi

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

# Add network storage paths to .env if available
if [ "$USE_NETWORK_STORAGE" = true ]; then
  echo "🔧 Configuring environment for network storage..."
  
  # Add network storage variables to .env
  if ! grep -q "NETWORK_STORAGE_PATH" .env; then
    cat >> .env << EOL

# Network Storage Configuration
NETWORK_STORAGE_PATH=$APP_STORAGE
LOG_PATH=$APP_STORAGE/logs
BACKUP_PATH=$APP_STORAGE/backups
DATA_PATH=$APP_STORAGE/data
EOL
  fi
  
  # Create symlinks for easy access
  ln -sf "$APP_STORAGE/logs" ./network-logs 2>/dev/null || true
  ln -sf "$APP_STORAGE/data" ./network-data 2>/dev/null || true
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

# Post-deployment storage management
if [ "$USE_NETWORK_STORAGE" = true ]; then
  echo "💾 Setting up post-deployment storage management..."
  
  # Log current deployment info to network storage
  DEPLOY_LOG="$APP_STORAGE/logs/deployment.log"
  echo "$(date): Deployment completed successfully - $VM_HOST" >> "$DEPLOY_LOG"
  echo "$(date): Docker containers: $($DOCKER_COMPOSE ps --services | tr '\n' ' ')" >> "$DEPLOY_LOG"
  
  # Create monitoring script for network storage
  cat > "$APP_STORAGE/monitor-storage.sh" << 'EOF'
#!/bin/bash
echo "=== Storage Monitoring Report - $(date) ==="
echo "Local VM Storage:"
df -h / | tail -1
echo "Network Storage:"
df -h /srv/homedir | tail -1
echo "Application Data Usage:"
du -sh /srv/homedir/mistral-app/* 2>/dev/null || echo "No application data yet"
echo "Docker Volume Usage:"
docker system df
EOF
  chmod +x "$APP_STORAGE/monitor-storage.sh"
  
  # Run initial storage report
  "$APP_STORAGE/monitor-storage.sh" > "$APP_STORAGE/logs/storage-report-$(date +%Y%m%d_%H%M%S).log"
  
  echo "📊 Network storage configured:"
  echo "  • Storage path: $APP_STORAGE"
  echo "  • Available: $(df -h $NETWORK_STORAGE | tail -1 | awk '{print $4}')"
  echo "  • Logs: $APP_STORAGE/logs/"
  echo "  • Backups: $APP_STORAGE/backups/"
  echo "  • Monitor: $APP_STORAGE/monitor-storage.sh"
fi

echo "🎉 Deployment completed!"
echo "Frontend: http://$VM_HOST:3000"
echo "API: http://$VM_HOST:8000"
echo "Neo4j: http://$VM_HOST:7474"
echo "MinIO: http://$VM_HOST:9001"

# Show storage summary
echo ""
echo "📊 Storage Summary:"
echo "Local VM: $(df -h / | tail -1 | awk '{print $4}') available"
if [ "$USE_NETWORK_STORAGE" = true ]; then
  echo "Network: $(df -h $NETWORK_STORAGE | tail -1 | awk '{print $4}') available"
  echo "Total: ~$(echo "$(df -h / | tail -1 | awk '{print $4}' | sed 's/G//') + $(df -h $NETWORK_STORAGE | tail -1 | awk '{print $4}' | sed 's/G//')" | bc 2>/dev/null || echo "50+")GB available"
fi 