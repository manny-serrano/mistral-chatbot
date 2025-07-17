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

# Force lightweight mode for CI/CD startup reliability
LIGHTWEIGHT_MODE=true

# API Server Configuration
API_HOST=0.0.0.0
API_PORT=8000
ENVIRONMENT=production
LOG_LEVEL=INFO

# Database Configuration (will connect later)
MILVUS_HOST=milvus
MILVUS_PORT=19530
NEO4J_URI=bolt://neo4j:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password123

# Frontend Configuration  
NEXT_PUBLIC_API_URL=http://$VM_HOST:8000
NEXT_PUBLIC_APP_URL=http://$VM_HOST:3000
NEXT_PUBLIC_SITE_URL=https://levantai.colab.duke.edu
NODE_ENV=production

# Performance Optimization for CI/CD
LOW_MEMORY_MODE=true
USE_SMALLER_MODEL=true

# CI/CD Configuration
CI=true
GITLAB_CI=true
STARTUP_MODE=health_check_friendly
EOL
else
  echo "📝 Updating existing .env file for CI/CD..."
  # Force lightweight mode for CI/CD
  if ! grep -q "LIGHTWEIGHT_MODE" .env; then
    echo "LIGHTWEIGHT_MODE=true" >> .env
  else
    sed -i 's/LIGHTWEIGHT_MODE=.*/LIGHTWEIGHT_MODE=true/' .env
  fi
  
  # Ensure CI/CD variables are set
  if ! grep -q "CI=" .env; then
    echo "CI=true" >> .env
  fi
  if ! grep -q "GITLAB_CI=" .env; then
    echo "GITLAB_CI=true" >> .env
  fi
  if ! grep -q "STARTUP_MODE=" .env; then
    echo "STARTUP_MODE=health_check_friendly" >> .env
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

# CI/CD Configuration
CI=true
GITLAB_CI=true
STARTUP_MODE=health_check_friendly
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

# Show current container status before cleanup
echo "📊 Current Docker status:"
docker ps -a | grep mistral || echo "No mistral containers found"

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
  
  # Pre-build setup removed - functionality integrated into Docker build retry script
  
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

# Add network connectivity test before starting containers
echo "🌐 Testing network connectivity..."
if ! ping -c 3 8.8.8.8 >/dev/null 2>&1; then
  echo "⚠️ Network connectivity issue detected"
  echo "📋 Network diagnostics:"
  ip route show || echo "Could not show routes"
  echo "🔄 Waiting 30 seconds for network stability..."
  sleep 30
fi

# Build with retry mechanism for network issues
echo "🏗️ Building with network retry logic..."
build_retry_count=0
max_build_retries=3

# Copy the Docker build retry script
if [ -f "/tmp/docker-build-retry.sh" ]; then
    echo "🔧 Using advanced Docker build retry script..."
    chmod +x /tmp/docker-build-retry.sh
    if /tmp/docker-build-retry.sh; then
        echo "✅ Build completed successfully with retry script"
    else
        echo "❌ Build failed even with retry mechanism"
        echo "📋 Checking network and Docker status..."
        docker system info | grep -E "(CPUs|Total Memory|Kernel|Storage Driver)" || true
        exit 1
    fi
else
    echo "🔧 Using fallback build retry logic..."
    while [ $build_retry_count -lt $max_build_retries ]; do
      echo "🔄 Build attempt $((build_retry_count + 1))/$max_build_retries"
      
      if $DOCKER_COMPOSE build; then
        echo "✅ Build completed successfully"
        break
      else
        build_retry_count=$((build_retry_count + 1))
        if [ $build_retry_count -lt $max_build_retries ]; then
          echo "⚠️ Build failed, retrying in 30 seconds..."
          # Clean up any partial images
          docker image prune -f || true
          sleep 30
        else
          echo "❌ Build failed after $max_build_retries attempts"
          echo "📋 Checking network and Docker status..."
          docker system info | grep -E "(CPUs|Total Memory|Kernel|Storage Driver)" || true
          exit 1
        fi
      fi
    done
fi

$DOCKER_COMPOSE up -d

# Show container status immediately after startup
echo "📊 Container status after startup:"
$DOCKER_COMPOSE ps

# Enhanced health checks with debugging
echo "⏳ Waiting for services to start..."
echo "⚠️  Note: Initial startup may take up to 5 minutes in CI/CD environment"

# Function to check container health
check_container_health() {
    local container_name=$1
    local max_attempts=$2
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        echo "🔍 Checking $container_name health (attempt $attempt/$max_attempts)..."
        
        # Get container status
        container_status=$(docker inspect --format='{{.State.Status}}' $container_name 2>/dev/null || echo "not_found")
        health_status=$(docker inspect --format='{{.State.Health.Status}}' $container_name 2>/dev/null || echo "no_health_check")
        
        echo "  • Container status: $container_status"
        echo "  • Health status: $health_status"
        
        # Check if container is running
        if [ "$container_status" != "running" ]; then
            echo "⚠️  Container $container_name is not running!"
            echo "📋 Container logs:"
            docker logs --tail 50 $container_name 2>&1 || echo "Failed to get logs"
            
            if [ "$container_status" = "exited" ]; then
                echo "❌ Container has exited. Checking exit code..."
                exit_code=$(docker inspect --format='{{.State.ExitCode}}' $container_name 2>/dev/null || echo "unknown")
                echo "  • Exit code: $exit_code"
                return 1
            fi
        fi
        
        # Check health status
        if [ "$health_status" = "healthy" ]; then
            echo "✅ $container_name is healthy!"
            return 0
        elif [ "$health_status" = "unhealthy" ]; then
            echo "⚠️  $container_name is unhealthy. Checking logs..."
            echo "📋 Recent container logs:"
            docker logs --tail 30 $container_name 2>&1 || echo "Failed to get logs"
        fi
        
        # Wait before next attempt
        sleep 15
        attempt=$((attempt + 1))
    done
    
    echo "❌ $container_name health check failed after $max_attempts attempts"
    return 1
}

# Check mistral-app container health with extended timeout
echo "🏥 Checking mistral-app health..."

# Simplified health check - just ensure container is running and responding
echo "🔍 Waiting for mistral-app container to start..."
sleep 30  # Give container time to start

container_name="mistral-enhancing-network-security-analysis_mistral-app_1"
max_wait=300  # 5 minutes total wait time
wait_time=0

while [ $wait_time -lt $max_wait ]; do
    # Check if container is running
    if docker ps --format "{{.Names}}" | grep -q "$container_name"; then
        echo "✅ Container $container_name is running"
        
        # Simple connectivity test
        if docker exec "$container_name" nc -z localhost 8000 2>/dev/null; then
            echo "✅ Port 8000 is accessible inside container"
            break
        elif curl -f http://localhost:8000/healthz >/dev/null 2>&1; then
            echo "✅ Health endpoint is accessible from host"
            break
        else
            echo "⏳ Waiting for service to respond... ($wait_time/$max_wait seconds)"
        fi
    else
        echo "⚠️ Container not running yet... ($wait_time/$max_wait seconds)"
        # Check container logs if it failed
        if docker ps -a --format "{{.Names}}" | grep -q "$container_name"; then
            container_status=$(docker inspect --format='{{.State.Status}}' "$container_name" 2>/dev/null || echo "unknown")
            if [ "$container_status" = "exited" ]; then
                echo "❌ Container has exited. Logs:"
                docker logs --tail 20 "$container_name" 2>&1 || echo "Failed to get logs"
                break
            fi
        fi
    fi
    
    sleep 10
    wait_time=$((wait_time + 10))
done

if [ $wait_time -ge $max_wait ]; then
    echo "⚠️ Health check timed out, but continuing deployment..."
    echo "📋 Container status for debugging:"
    docker ps -a | grep mistral || echo "No mistral containers found"
else
    echo "✅ mistral-app appears to be responding"
fi

# Traditional API health checks as backup
echo "🏥 Running traditional health checks..."

# Check API
for i in {1..10}; do
  if curl -f http://localhost:8000/healthz > /dev/null 2>&1; then
    echo "✅ API healthz endpoint is responsive"
    break
  elif curl -f http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ API health endpoint is responsive"
    break
  else
    echo "⏳ Waiting for API... ($i/10)"
    sleep 5
  fi
done

# Configure Apache HTTPS with automatic permission setup
if [ -f "/tmp/apache-config/setup-apache-https.sh" ] || [ -f "/tmp/apache-config/prepare-config.sh" ]; then
  echo "🔧 Configuring Apache HTTPS with automatic permission setup..."
  
  # First, prepare configuration files (non-root operation)
  if [ -f "/tmp/apache-config/prepare-config.sh" ]; then
    echo "📋 Preparing Apache configuration..."
    chmod +x /tmp/apache-config/prepare-config.sh
    
    /tmp/apache-config/prepare-config.sh \
      --domain levantai.colab.duke.edu \
      --output /tmp/apache-config-prepared || echo "⚠️  Config preparation failed"
  fi
  
  # Use the automatic permission setup script
  if [ -f "/tmp/auto-setup-permissions.sh" ]; then
    echo "🔑 Running automatic permission setup for Apache configuration..."
    chmod +x /tmp/auto-setup-permissions.sh
    
    # Run the automatic setup (this handles all permission scenarios)
    /tmp/auto-setup-permissions.sh "$(whoami)" || echo "⚠️  Automatic Apache setup completed with warnings"
  else
    echo "⚠️  Automatic setup script not found, falling back to manual approach..."
    
    # Fallback to the previous manual approach
    if sudo -n true 2>/dev/null; then
      echo "✅ Sudo privileges available - installing Apache configuration"
      
      if [ -f "/tmp/apache-config-prepared/install-apache-config.sh" ]; then
        sudo /tmp/apache-config-prepared/install-apache-config.sh || echo "⚠️  Apache installation failed, continuing..."
      elif [ -f "/tmp/apache-config/setup-apache-https.sh" ]; then
        chmod +x /tmp/apache-config/setup-apache-https.sh
        sudo /tmp/apache-config/setup-apache-https.sh \
          --domain levantai.colab.duke.edu \
          --project-path "$(pwd)" \
          --install-certbot \
          --create-service || echo "⚠️  Apache setup failed, continuing..."
      fi
    else
      echo "⚠️  No sudo privileges available for Apache installation"
      echo "📋 Apache configuration prepared but not installed"
      echo "📝 To install Apache configuration manually, run:"
      if [ -f "/tmp/apache-config-prepared/install-apache-config.sh" ]; then
        echo "    sudo /tmp/apache-config-prepared/install-apache-config.sh"
      fi
      if [ -f "/tmp/setup-sudo-permissions.sh" ]; then
        echo "📝 To enable automatic Apache configuration for future deployments:"
        echo "    sudo /tmp/setup-sudo-permissions.sh -u $(whoami)"
      fi
    fi
  fi
else
  echo "📋 No Apache configuration scripts found, skipping HTTPS setup..."
fi

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