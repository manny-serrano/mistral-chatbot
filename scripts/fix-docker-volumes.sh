#!/bin/bash
# Fix Docker Volume Conflicts Script
# Resolves volume configuration conflicts and BuildKit issues

set -e

echo "🔧 Fixing Docker Volume Conflicts"
echo "================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${GREEN}✅${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠️${NC} $1"; }
print_error() { echo -e "${RED}❌${NC} $1"; }
print_info() { echo -e "${BLUE}ℹ️${NC} $1"; }

# 1. Stop all containers
print_info "Stopping all Docker containers..."
docker stop $(docker ps -aq) 2>/dev/null || print_warning "No containers to stop"

# 2. Remove all containers
print_info "Removing all Docker containers..."
docker rm -f $(docker ps -aq) 2>/dev/null || print_warning "No containers to remove"

# 3. Remove specific problematic volumes
print_info "Removing conflicting volumes..."
docker volume rm mistral-enhancing-network-security-analysis_neo4j_data 2>/dev/null || print_warning "neo4j_data volume not found"
docker volume rm mistral-enhancing-network-security-analysis_neo4j_logs 2>/dev/null || print_warning "neo4j_logs volume not found"
docker volume rm mistral-enhancing-network-security-analysis_milvus_data 2>/dev/null || print_warning "milvus_data volume not found"
docker volume rm mistral-enhancing-network-security-analysis_etcd_data 2>/dev/null || print_warning "etcd_data volume not found"
docker volume rm mistral-enhancing-network-security-analysis_minio_data 2>/dev/null || print_warning "minio_data volume not found"

# 4. Remove all unused volumes
print_info "Removing all unused volumes..."
docker volume prune -f || true

# 5. Remove networks
print_info "Removing Docker networks..."
docker network prune -f || true

# 6. Disable BuildKit globally (in case it's enabled)
print_info "Ensuring BuildKit is disabled..."
export DOCKER_BUILDKIT=0
echo "export DOCKER_BUILDKIT=0" >> ~/.bashrc

# 7. Create necessary directories on network storage
if [ -d "/srv/homedir" ]; then
    print_info "Creating network storage directories..."
    mkdir -p /srv/homedir/mistral-app/{logs,data,backups,docker-volumes}
    
    # Create specific subdirectories for Docker volume mounts
    print_info "Creating Docker volume mount directories..."
    mkdir -p /srv/homedir/mistral-app/data/{neo4j,etcd,minio,milvus}
    mkdir -p /srv/homedir/mistral-app/logs/{neo4j}
    
    chown -R vcm:vcm /srv/homedir/mistral-app 2>/dev/null || true
fi

# 8. Clean up any orphaned files
print_info "Cleaning up orphaned files..."
rm -rf ~/.docker/buildx 2>/dev/null || true

# 9. Show final status
print_status "Docker volume conflicts resolved!"

print_info "Current Docker status:"
echo "Containers: $(docker ps -a --format 'table {{.Names}}\t{{.Status}}' | wc -l) containers"
echo "Images: $(docker images -q | wc -l) images"  
echo "Volumes: $(docker volume ls -q | wc -l) volumes"
echo "Networks: $(docker network ls --format '{{.Name}}' | grep -v -E '^(bridge|host|none)$' | wc -l) custom networks"

print_info "Storage status:"
df -h / | tail -1
if [ -d "/srv/homedir" ]; then
    df -h /srv/homedir | tail -1
fi

echo ""
print_status "✅ Ready for deployment!"
print_info "You can now run your GitLab pipeline or docker-compose build again." 