#!/bin/bash
# Storage Management Script for Mistral Network Security Analysis
# Manages both local VM storage and network-mounted storage

set -e

# Configuration
NETWORK_STORAGE="/srv/homedir"
APP_STORAGE="$NETWORK_STORAGE/mistral-app"
PROJECT_DIR="/home/vcm/mistral-enhancing-network-security-analysis"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

print_error() {
    echo -e "${RED}❌${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ️${NC} $1"
}

# Function to check storage status
check_storage() {
    echo "📊 Storage Status Report"
    echo "========================"
    
    # Local VM storage
    echo ""
    echo "🖥️  Local VM Storage:"
    df -h / | head -1
    df -h / | tail -1
    
    # Network storage
    echo ""
    if [ -d "$NETWORK_STORAGE" ] && [ -w "$NETWORK_STORAGE" ]; then
        print_status "Network storage is mounted and writable"
        echo "🌐 Network Storage:"
        df -h "$NETWORK_STORAGE" | head -1
        df -h "$NETWORK_STORAGE" | tail -1
        
        # Application storage usage
        if [ -d "$APP_STORAGE" ]; then
            echo ""
            echo "📱 Application Storage Usage:"
            du -sh "$APP_STORAGE"/* 2>/dev/null || echo "No application data yet"
        fi
    else
        print_warning "Network storage not available at $NETWORK_STORAGE"
    fi
    
    # Docker storage
    echo ""
    echo "🐳 Docker Storage Usage:"
    docker system df 2>/dev/null || echo "Docker not available"
    
    # Total summary
    echo ""
    echo "📈 Storage Summary:"
    local_available=$(df -h / | tail -1 | awk '{print $4}')
    echo "  • Local Available: $local_available"
    
    if [ -d "$NETWORK_STORAGE" ]; then
        network_available=$(df -h "$NETWORK_STORAGE" | tail -1 | awk '{print $4}')
        echo "  • Network Available: $network_available"
        echo "  • Total Additional Storage: ~25GB"
    fi
}

# Function to setup network storage directories
setup_storage() {
    if [ ! -d "$NETWORK_STORAGE" ] || [ ! -w "$NETWORK_STORAGE" ]; then
        print_error "Network storage not available. Please mount it first."
        return 1
    fi
    
    print_info "Setting up application directories on network storage..."
    
    # Create directory structure
    mkdir -p "$APP_STORAGE"/{logs,backups,data,docker-volumes,archives}
    
    # Set proper ownership
    chown -R vcm:vcm "$APP_STORAGE" 2>/dev/null || true
    
    # Create symlinks in project directory
    cd "$PROJECT_DIR"
    ln -sf "$APP_STORAGE/logs" ./network-logs 2>/dev/null || true
    ln -sf "$APP_STORAGE/data" ./network-data 2>/dev/null || true
    ln -sf "$APP_STORAGE/backups" ./network-backups 2>/dev/null || true
    
    print_status "Network storage directories created successfully"
    print_info "Symlinks created in project directory:"
    print_info "  • ./network-logs -> $APP_STORAGE/logs"
    print_info "  • ./network-data -> $APP_STORAGE/data"
    print_info "  • ./network-backups -> $APP_STORAGE/backups"
}

# Function to backup application data
backup_data() {
    if [ ! -d "$NETWORK_STORAGE" ] || [ ! -w "$NETWORK_STORAGE" ]; then
        print_error "Network storage not available for backup"
        return 1
    fi
    
    BACKUP_DIR="$APP_STORAGE/backups/manual-backup-$(date +%Y%m%d_%H%M%S)"
    print_info "Creating backup in: $BACKUP_DIR"
    
    mkdir -p "$BACKUP_DIR"
    cd "$PROJECT_DIR"
    
    # Backup configuration files
    print_info "Backing up configuration files..."
    cp .env "$BACKUP_DIR/" 2>/dev/null || print_warning "No .env file found"
    cp docker-compose.yml "$BACKUP_DIR/"
    cp -r scripts/ "$BACKUP_DIR/" 2>/dev/null || true
    
    # Backup Docker volumes
    if [ -f "./docker-volumes.sh" ]; then
        print_info "Backing up Docker volumes..."
        ./docker-volumes.sh backup 2>/dev/null || print_warning "Volume backup failed"
        mv docker-volume-backups/* "$BACKUP_DIR/" 2>/dev/null || true
        rmdir docker-volume-backups 2>/dev/null || true
    fi
    
    # Backup important data
    print_info "Backing up application data..."
    cp -r cybersecurity_reports/ "$BACKUP_DIR/" 2>/dev/null || print_warning "No reports directory"
    cp *.json "$BACKUP_DIR/" 2>/dev/null || print_warning "No JSON files in root"
    
    # Create backup manifest
    cat > "$BACKUP_DIR/backup-manifest.txt" << EOF
Backup Created: $(date)
Backup Location: $BACKUP_DIR
Project Directory: $PROJECT_DIR
System Info: $(uname -a)
Docker Containers: $(docker ps --format "table {{.Names}}\t{{.Status}}" 2>/dev/null || echo "Docker not available")

Contents:
$(ls -la "$BACKUP_DIR")
EOF
    
    print_status "Backup completed: $BACKUP_DIR"
    echo "Backup size: $(du -sh "$BACKUP_DIR" | cut -f1)"
}

# Function to cleanup old backups
cleanup_backups() {
    if [ ! -d "$APP_STORAGE/backups" ]; then
        print_warning "No backup directory found"
        return 0
    fi
    
    print_info "Cleaning up backups older than 7 days..."
    
    # Find and remove old backups
    deleted_count=$(find "$APP_STORAGE/backups" -type d -mtime +7 -name "*backup*" -exec rm -rf {} \; -print | wc -l)
    
    if [ "$deleted_count" -gt 0 ]; then
        print_status "Cleaned up $deleted_count old backup directories"
    else
        print_info "No old backups found to clean up"
    fi
}

# Function to migrate data to network storage
migrate_to_network() {
    if [ ! -d "$NETWORK_STORAGE" ] || [ ! -w "$NETWORK_STORAGE" ]; then
        print_error "Network storage not available for migration"
        return 1
    fi
    
    print_info "Migrating large data files to network storage..."
    
    # Setup storage first
    setup_storage
    
    cd "$PROJECT_DIR"
    
    # Migrate sample data
    if [ -d "Samples_flow" ] && [ ! -L "Samples_flow" ]; then
        print_info "Migrating Samples_flow to network storage..."
        cp -r Samples_flow/ "$APP_STORAGE/data/samples_flow_backup"
        print_status "Sample flow data backed up to network storage"
    fi
    
    # Migrate suspicious data
    if [ -d "Suspicious_DATA" ] && [ ! -L "Suspicious_DATA" ]; then
        print_info "Migrating Suspicious_DATA to network storage..."
        cp -r Suspicious_DATA/ "$APP_STORAGE/data/suspicious_data_backup"
        print_status "Suspicious data backed up to network storage"
    fi
    
    # Migrate cybersecurity reports
    if [ -d "cybersecurity_reports" ]; then
        print_info "Migrating cybersecurity reports..."
        cp -r cybersecurity_reports/ "$APP_STORAGE/archives/"
        print_status "Reports archived to network storage"
    fi
    
    print_status "Data migration completed successfully"
}

# Function to show usage
show_usage() {
    echo "Storage Management for Mistral Network Security Analysis"
    echo "======================================================="
    echo ""
    echo "Usage: $0 {check|setup|backup|cleanup|migrate|help}"
    echo ""
    echo "Commands:"
    echo "  check    - Show current storage status and usage"
    echo "  setup    - Setup network storage directories and symlinks"
    echo "  backup   - Create backup of application data to network storage"
    echo "  cleanup  - Remove old backups (older than 7 days)"
    echo "  migrate  - Migrate large data files to network storage"
    echo "  help     - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 check"
    echo "  $0 setup"
    echo "  $0 backup"
    echo "  $0 cleanup"
}

# Main execution
case "${1:-check}" in
    "check"|"status")
        check_storage
        ;;
    "setup"|"init")
        setup_storage
        ;;
    "backup")
        backup_data
        ;;
    "cleanup"|"clean")
        cleanup_backups
        ;;
    "migrate")
        migrate_to_network
        ;;
    "help"|"--help"|"-h")
        show_usage
        ;;
    *)
        print_error "Unknown command: $1"
        show_usage
        exit 1
        ;;
esac 