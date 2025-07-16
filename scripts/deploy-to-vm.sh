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
  
  # Create specific data directories for Docker volume mounts
  echo "📁 Creating Docker volume mount directories..."
  mkdir -p "$APP_STORAGE/data"/{neo4j,etcd,minio,milvus}
  mkdir -p "$APP_STORAGE/logs"/{neo4j}
  mkdir -p "$APP_STORAGE/model-cache"/{huggingface,sentence-transformers}
  
  chown -R ${VM_USER:-vcm}:${VM_USER:-vcm} "$APP_STORAGE" 2>/dev/null || true
fi

echo "📥 Pulling latest changes..."
git pull origin main

echo "🗂️ Setting up required directories..."
chmod +x scripts/setup-directories.sh
./scripts/setup-directories.sh

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
# Essential API Configuration
OPENAI_API_KEY=$OPENAI_API_KEY
OPENAI_API_BASE=https://litellm.oit.duke.edu

# Enable lightweight mode for reliable startup (disable for full functionality)
LIGHTWEIGHT_MODE=${LIGHTWEIGHT_MODE:-false}

# API Server Configuration
API_HOST=0.0.0.0
API_PORT=8000
ENVIRONMENT=production
LOG_LEVEL=INFO

# Database Configuration
MILVUS_HOST=milvus
MILVUS_PORT=19530
NEO4J_URI=bolt://neo4j:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password123

# Frontend Configuration
NEXT_PUBLIC_API_URL=http://$VM_HOST:8000
NEXT_PUBLIC_APP_URL=http://$VM_HOST:3000

# Performance Optimization
LOW_MEMORY_MODE=true
USE_SMALLER_MODEL=true
EOL
else
  echo "📝 Updating existing .env file..."
  # Ensure LIGHTWEIGHT_MODE is set if not already present
  if ! grep -q "LIGHTWEIGHT_MODE" .env; then
    echo "LIGHTWEIGHT_MODE=${LIGHTWEIGHT_MODE:-false}" >> .env
  fi
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

# Model Cache Optimization
MODEL_CACHE_DIR=$APP_STORAGE/model-cache
HUGGINGFACE_HUB_CACHE=$APP_STORAGE/model-cache/huggingface
HF_HOME=$APP_STORAGE/model-cache/huggingface
TRANSFORMERS_CACHE=$APP_STORAGE/model-cache/huggingface/transformers
SENTENCE_TRANSFORMERS_HOME=$APP_STORAGE/model-cache/sentence-transformers

# Space Optimization Settings
USE_SMALLER_MODEL=false
LOW_MEMORY_MODE=true
CLEAR_CACHE_AFTER_LOAD=false
EOL
  fi
  
  # Create symlinks for easy access
  ln -sf "$APP_STORAGE/logs" ./network-logs 2>/dev/null || true
  ln -sf "$APP_STORAGE/data" ./network-data 2>/dev/null || true
  
  # Setup model cache optimization
  echo "🤖 Setting up model cache optimization..."
  mkdir -p "$APP_STORAGE/model-cache"/{huggingface,sentence-transformers}
  
  # Run model cache optimization script if it exists
  if [ -f "./scripts/optimize-model-storage.sh" ]; then
    echo "🔧 Running model storage optimization..."
    chmod +x ./scripts/optimize-model-storage.sh
    ./scripts/optimize-model-storage.sh 2>/dev/null || echo "Model optimization completed with warnings"
    
    # Source build optimization environment if created
    if [ -f "$APP_STORAGE/docker-build.env" ]; then
      echo "📋 Loading build optimization environment..."
      source "$APP_STORAGE/docker-build.env"
    fi
  fi
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

# Intelligent cache management instead of purging everything
echo "🧹 Cleaning up only old/unused Docker artifacts..."
# Only remove dangling images and containers, keep layers for caching
docker image prune -f || true
docker container prune -f || true
# Only remove volumes older than 7 days to preserve recent cache
docker volume prune -f --filter "until=168h" || true

# Ensure BuildKit/buildx is available and configured
echo "🔨 Configuring Docker build system..."
if ! docker buildx version >/dev/null 2>&1; then
  echo "🔧 Installing Docker Buildx..."
  # Create buildx builder instance if it doesn't exist
  docker buildx create --driver docker-container --name mybuilder --use 2>/dev/null || docker buildx use mybuilder 2>/dev/null || true
  # Install buildx if still not available
  if ! docker buildx version >/dev/null 2>&1; then
    echo "⚠️ BuildKit installation needed - attempting manual setup..."
    # For older Docker versions, ensure buildx plugin is available
    mkdir -p ~/.docker/cli-plugins
    if [ ! -f ~/.docker/cli-plugins/docker-buildx ]; then
      echo "Downloading docker-buildx plugin..."
      BUILDX_VERSION=$(curl -s https://api.github.com/repos/docker/buildx/releases/latest | grep '"tag_name"' | cut -d '"' -f 4)
      curl -sSL "https://github.com/docker/buildx/releases/download/${BUILDX_VERSION}/buildx-${BUILDX_VERSION}.linux-amd64" -o ~/.docker/cli-plugins/docker-buildx
      chmod +x ~/.docker/cli-plugins/docker-buildx
    fi
  fi
fi

# Always use BuildKit (default in modern Docker, avoids deprecation warnings)
echo "✅ Using BuildKit for optimized builds"
export DOCKER_BUILDKIT=1
export BUILDKIT_PROGRESS=plain

# Pre-build setup to prevent space issues
if [ "$USE_NETWORK_STORAGE" = true ]; then
  echo "🗂️ Running pre-build setup for network storage optimization..."
  
  # Create cache directories
  mkdir -p "$APP_STORAGE/docker-build-cache" "$APP_STORAGE/pip-cache" "$APP_STORAGE/docker-tmp"
  
  # Run pre-build setup script
  if [ -f "./scripts/pre-build-setup.sh" ]; then
    echo "📦 Running pre-build package download..."
    chmod +x ./scripts/pre-build-setup.sh
    ./scripts/pre-build-setup.sh || print_warning "Pre-build setup completed with warnings"
  fi
  
  # Build with optimized environment
  echo "🏗️ Building with network storage optimization..."
  $DOCKER_COMPOSE build 2>&1 | tee "$APP_STORAGE/logs/docker-build.log"
  
  # Post-build cleanup
  if [ -f "$APP_STORAGE/post-build-cleanup.sh" ]; then
    echo "🧹 Running post-build cleanup..."
    bash "$APP_STORAGE/post-build-cleanup.sh"
  fi
else
  echo "🏗️ Building with local Docker layer cache..."
  # Build with standard Docker layer caching
  $DOCKER_COMPOSE build
fi

# Check available space after build
echo "📊 Storage status after optimized build:"
df -h / | tail -1
if [ "$USE_NETWORK_STORAGE" = true ]; then
  df -h "$NETWORK_STORAGE" | tail -1
fi

$DOCKER_COMPOSE up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 45

# Check if services are running
echo "🔍 Checking service status..."
$DOCKER_COMPOSE ps

# Configure Apache HTTPS (if configuration exists)
if [ -f "/tmp/apache-config/setup-apache-https.sh" ]; then
  echo "🔧 Configuring Apache HTTPS..."
  
  # Check if Apache is already configured
  if [ -f "/etc/apache2/sites-available/mistral-app.conf" ] || [ -f "/etc/httpd/conf.d/mistral-app.conf" ]; then
    echo "📋 Apache already configured, updating configuration..."
    # Copy updated configuration
    if [ -f "/etc/apache2/sites-available/mistral-app.conf" ]; then
      cp /tmp/apache-config/sites-available/mistral-app.conf /etc/apache2/sites-available/mistral-app.conf
      systemctl reload apache2
    elif [ -f "/etc/httpd/conf.d/mistral-app.conf" ]; then
      cp /tmp/apache-config/sites-available/mistral-app.conf /etc/httpd/conf.d/mistral-app.conf
      systemctl reload httpd
    fi
  else
    echo "🔧 Setting up Apache HTTPS for the first time..."
    chmod +x /tmp/apache-config/setup-apache-https.sh
    
    # Run Apache setup with domain
    /tmp/apache-config/setup-apache-https.sh \
      --domain levantai.colab.duke.edu \
      --project-path "$(pwd)" \
      --install-certbot \
      --create-service || echo "⚠️  Apache setup failed, continuing..."
  fi
else
  echo "📋 No Apache configuration found, skipping HTTPS setup..."
fi

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
  # Note: CIFS doesn't support execute permissions, so we run with bash directly
  
  # Run initial storage report
  bash "$APP_STORAGE/monitor-storage.sh" > "$APP_STORAGE/logs/storage-report-$(date +%Y%m%d_%H%M%S).log"
  
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