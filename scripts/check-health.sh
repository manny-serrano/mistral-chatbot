#!/bin/bash

echo "🏥 Mistral Application Health Check Script"
echo "=========================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check service health
check_service() {
    local service_name=$1
    local url=$2
    local expected_response=$3
    
    echo -n "Checking $service_name... "
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
    
    if [ "$response" = "$expected_response" ]; then
        echo -e "${GREEN}✅ OK${NC} (HTTP $response)"
        return 0
    elif [ "$response" = "000" ]; then
        echo -e "${RED}❌ UNREACHABLE${NC}"
        return 1
    else
        echo -e "${YELLOW}⚠️  WARNING${NC} (HTTP $response)"
        return 1
    fi
}

# Function to check container status
check_container() {
    local container_name=$1
    
    echo -n "Container $container_name: "
    
    if ! docker ps --format "table {{.Names}}" | grep -q "$container_name"; then
        echo -e "${RED}❌ NOT RUNNING${NC}"
        return 1
    fi
    
    # Get container health status
    health_status=$(docker inspect --format='{{.State.Health.Status}}' "$container_name" 2>/dev/null || echo "no_health_check")
    
    case "$health_status" in
        "healthy")
            echo -e "${GREEN}✅ HEALTHY${NC}"
            ;;
        "unhealthy")
            echo -e "${RED}❌ UNHEALTHY${NC}"
            # Show recent logs
            echo "Recent logs:"
            docker logs --tail 10 "$container_name" 2>&1 | sed 's/^/  /'
            ;;
        "starting")
            echo -e "${YELLOW}⚠️  STARTING${NC}"
            ;;
        *)
            echo -e "${YELLOW}⚠️  NO HEALTH CHECK${NC}"
            ;;
    esac
}

# Check Docker daemon
echo "1. Docker Status"
echo "----------------"
if docker info > /dev/null 2>&1; then
    echo -e "Docker daemon: ${GREEN}✅ Running${NC}"
    echo "Docker version: $(docker --version | cut -d' ' -f3 | tr -d ',')"
else
    echo -e "Docker daemon: ${RED}❌ Not accessible${NC}"
    exit 1
fi
echo ""

# Check containers
echo "2. Container Status"
echo "------------------"
check_container "mistral-enhancing-network-security-analysis_mistral-app_1"
check_container "mistral-enhancing-network-security-analysis_frontend_1"
check_container "mistral-enhancing-network-security-analysis_neo4j_1"
check_container "mistral-enhancing-network-security-analysis_milvus_1"
check_container "mistral-enhancing-network-security-analysis_etcd_1"
check_container "mistral-enhancing-network-security-analysis_minio_1"
echo ""

# Check services
echo "3. Service Health"
echo "-----------------"
check_service "API /healthz" "http://localhost:8000/healthz" "200"
check_service "API /health" "http://localhost:8000/health" "200"
check_service "Frontend" "http://localhost:3000" "200"
check_service "Neo4j Browser" "http://localhost:7474" "200"
check_service "Milvus Health" "http://localhost:9091/healthz" "200"
check_service "MinIO Console" "http://localhost:9001" "200"
echo ""

# Check disk space
echo "4. Disk Space"
echo "-------------"
df -h / | awk 'NR==1 || /\/$/'
if [ -d "/srv/homedir" ]; then
    df -h /srv/homedir | tail -1
fi
echo ""

# Check memory
echo "5. Memory Usage"
echo "---------------"
free -h | grep -E "^(Mem|Swap):"
echo ""

# Docker resource usage
echo "6. Docker Resource Usage"
echo "------------------------"
docker system df
echo ""

# Show running containers
echo "7. Running Containers"
echo "--------------------"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

# Summary
echo "Summary"
echo "-------"
if check_service "API" "http://localhost:8000/healthz" "200" > /dev/null 2>&1 &&
   check_service "Frontend" "http://localhost:3000" "200" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Core services are operational${NC}"
else
    echo -e "${RED}❌ Some services are not healthy${NC}"
    echo ""
    echo "Troubleshooting tips:"
    echo "- Check container logs: docker logs <container_name>"
    echo "- Restart services: docker-compose restart"
    echo "- Check environment variables: docker-compose config"
    echo "- Review deployment logs in /srv/homedir/mistral-app/logs/"
fi 