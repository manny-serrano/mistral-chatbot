#!/bin/bash

# =============================================================================
# MISTRAL NETWORK SECURITY ANALYSIS - DOCKER VOLUME MANAGEMENT
# =============================================================================

set -e

PROJECT_NAME="mistral-enhancing-network-security-analysis"
VOLUMES=(
    "etcd_data"
    "minio_data" 
    "milvus_data"
    "neo4j_data"
    "neo4j_logs"
    "neo4j_import"
    "neo4j_plugins"
)

# Function to list all project volumes
list_volumes() {
    echo "Project Docker Volumes:"
    echo "======================="
    for vol in "${VOLUMES[@]}"; do
        if docker volume inspect "${PROJECT_NAME}_${vol}" >/dev/null 2>&1; then
            size=$(docker system df -v | grep "${PROJECT_NAME}_${vol}" | awk '{print $3}' || echo "unknown")
            echo "✓ ${PROJECT_NAME}_${vol} (${size})"
        else
            echo "✗ ${PROJECT_NAME}_${vol} (not found)"
        fi
    done
}

# Function to backup volumes
backup_volumes() {
    BACKUP_DIR="./docker-volume-backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    echo "Backing up volumes to: $BACKUP_DIR"
    echo "====================================="
    
    for vol in "${VOLUMES[@]}"; do
        volume_name="${PROJECT_NAME}_${vol}"
        if docker volume inspect "$volume_name" >/dev/null 2>&1; then
            echo "Backing up $volume_name..."
            docker run --rm \
                -v "$volume_name":/data \
                -v "$PWD/$BACKUP_DIR":/backup \
                alpine:latest \
                tar czf "/backup/${vol}.tar.gz" -C /data .
            echo "✓ Backed up to ${BACKUP_DIR}/${vol}.tar.gz"
        else
            echo "✗ Volume $volume_name not found, skipping..."
        fi
    done
    
    echo ""
    echo "Backup completed!"
    echo "To restore: $0 restore $BACKUP_DIR"
}

# Function to restore volumes
restore_volumes() {
    if [ -z "$1" ]; then
        echo "Error: Please specify backup directory"
        echo "Usage: $0 restore <backup_directory>"
        exit 1
    fi
    
    BACKUP_DIR="$1"
    if [ ! -d "$BACKUP_DIR" ]; then
        echo "Error: Backup directory '$BACKUP_DIR' not found"
        exit 1
    fi
    
    echo "Restoring volumes from: $BACKUP_DIR"
    echo "===================================="
    echo "WARNING: This will overwrite existing data!"
    read -p "Continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 0
    fi
    
    for vol in "${VOLUMES[@]}"; do
        backup_file="$BACKUP_DIR/${vol}.tar.gz"
        volume_name="${PROJECT_NAME}_${vol}"
        
        if [ -f "$backup_file" ]; then
            echo "Restoring $volume_name..."
            
            # Create volume if it doesn't exist
            docker volume create "$volume_name" >/dev/null 2>&1 || true
            
            # Restore data
            docker run --rm \
                -v "$volume_name":/data \
                -v "$PWD/$BACKUP_DIR":/backup \
                alpine:latest \
                sh -c "cd /data && rm -rf * && tar xzf /backup/${vol}.tar.gz"
            echo "✓ Restored $volume_name"
        else
            echo "✗ Backup file $backup_file not found, skipping..."
        fi
    done
    
    echo ""
    echo "Restore completed!"
}

# Function to clean up volumes
cleanup_volumes() {
    echo "This will DELETE ALL project volumes and data!"
    echo "=============================================="
    list_volumes
    echo ""
    read -p "Are you sure you want to delete all volumes? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 0
    fi
    
    echo "Stopping containers first..."
    docker-compose down 2>/dev/null || true
    
    echo "Removing volumes..."
    for vol in "${VOLUMES[@]}"; do
        volume_name="${PROJECT_NAME}_${vol}"
        if docker volume inspect "$volume_name" >/dev/null 2>&1; then
            docker volume rm "$volume_name"
            echo "✓ Removed $volume_name"
        fi
    done
    
    echo "Cleanup completed!"
}

# Function to show volume usage
show_usage() {
    echo "Docker Volume Usage:"
    echo "==================="
    docker system df -v | head -1
    for vol in "${VOLUMES[@]}"; do
        volume_name="${PROJECT_NAME}_${vol}"
        docker system df -v | grep "$volume_name" || echo "$volume_name: not found"
    done
}

# Main script logic
case "${1:-list}" in
    "list"|"ls")
        list_volumes
        ;;
    "backup")
        backup_volumes
        ;;
    "restore")
        restore_volumes "$2"
        ;;
    "cleanup"|"clean")
        cleanup_volumes
        ;;
    "usage"|"df")
        show_usage
        ;;
    "help"|"--help"|"-h")
        echo "Usage: $0 {list|backup|restore <dir>|cleanup|usage|help}"
        echo ""
        echo "Commands:"
        echo "  list     - List all project volumes (default)"
        echo "  backup   - Backup all volumes to timestamped directory"
        echo "  restore  - Restore volumes from backup directory"
        echo "  cleanup  - Delete all project volumes (DESTRUCTIVE!)"
        echo "  usage    - Show volume disk usage"
        echo "  help     - Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0 list"
        echo "  $0 backup"
        echo "  $0 restore ./docker-volume-backups/20240624_120000"
        echo "  $0 cleanup"
        ;;
    *)
        echo "Unknown command: $1"
        echo "Use '$0 help' for usage information."
        exit 1
        ;;
esac 