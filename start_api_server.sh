#!/bin/bash

# Robust API Server Startup Script
# This script ensures the API server stays running and restarts automatically if it crashes

set -e

# Configuration
API_DIR="Agent"
LOG_FILE="api_server.log"
PID_FILE="api_server.pid"
MAX_RETRIES=5
RETRY_DELAY=5

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting Mistral Security Analysis API Server${NC}"

# Function to check if server is running
check_server() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            return 0  # Server is running
        else
            rm -f "$PID_FILE"
            return 1  # Server is not running
        fi
    else
        return 1  # PID file doesn't exist
    fi
}

# Function to stop server
stop_server() {
    echo -e "${YELLOW}⏹️  Stopping API server...${NC}"
    
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            kill "$pid"
            
            # Wait for graceful shutdown
            local count=0
            while ps -p "$pid" > /dev/null 2>&1 && [ $count -lt 10 ]; do
                sleep 1
                ((count++))
            done
            
            # Force kill if still running
            if ps -p "$pid" > /dev/null 2>&1; then
                echo -e "${RED}⚠️  Force killing server...${NC}"
                kill -9 "$pid" 2>/dev/null || true
            fi
        fi
        rm -f "$PID_FILE"
    fi
    
    # Kill any remaining api_server.py processes
    pkill -f "api_server.py" 2>/dev/null || true
    
    echo -e "${GREEN}✅ Server stopped${NC}"
}

# Function to start server
start_server() {
    echo -e "${GREEN}▶️  Starting API server...${NC}"
    
    # Change to API directory
    cd "$API_DIR"
    
    # Start server in background and capture PID
    nohup python api_server.py > "../$LOG_FILE" 2>&1 &
    local pid=$!
    
    # Save PID
    echo "$pid" > "../$PID_FILE"
    
    # Wait a moment to see if it starts successfully
    sleep 3
    
    if ps -p "$pid" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Server started successfully (PID: $pid)${NC}"
        echo -e "${GREEN}📊 Health check: http://localhost:8000/health${NC}"
        echo -e "${GREEN}📚 API docs: http://localhost:8000/docs${NC}"
        echo -e "${GREEN}📝 Logs: tail -f $LOG_FILE${NC}"
        return 0
    else
        echo -e "${RED}❌ Server failed to start${NC}"
        rm -f "../$PID_FILE"
        return 1
    fi
}

# Function to monitor and restart server
monitor_server() {
    local retries=0
    
    while [ $retries -lt $MAX_RETRIES ]; do
        if start_server; then
            echo -e "${GREEN}🎯 Server monitoring started. Press Ctrl+C to stop.${NC}"
            
            # Monitor the server
            while true; do
                sleep 30  # Check every 30 seconds
                
                if ! check_server; then
                    echo -e "${RED}⚠️  Server died! Attempting restart...${NC}"
                    break
                fi
                
                # Optional: Health check via HTTP
                if ! curl -s -f http://localhost:8000/health > /dev/null 2>&1; then
                    echo -e "${RED}⚠️  Health check failed! Restarting server...${NC}"
                    stop_server
                    break
                fi
            done
            
            ((retries++))
            echo -e "${YELLOW}🔄 Restart attempt $retries/$MAX_RETRIES${NC}"
            sleep $RETRY_DELAY
        else
            ((retries++))
            echo -e "${RED}💥 Startup failed. Attempt $retries/$MAX_RETRIES${NC}"
            
            if [ $retries -lt $MAX_RETRIES ]; then
                echo -e "${YELLOW}⏳ Waiting $RETRY_DELAY seconds before retry...${NC}"
                sleep $RETRY_DELAY
            fi
        fi
    done
    
    echo -e "${RED}🚨 Max retries exceeded. Server monitoring stopped.${NC}"
    exit 1
}

# Handle command line arguments
case "${1:-start}" in
    "start")
        if check_server; then
            echo -e "${YELLOW}⚠️  Server is already running${NC}"
            exit 0
        fi
        monitor_server
        ;;
    "stop")
        stop_server
        ;;
    "restart")
        stop_server
        sleep 2
        monitor_server
        ;;
    "status")
        if check_server; then
            local pid=$(cat "$PID_FILE")
            echo -e "${GREEN}✅ Server is running (PID: $pid)${NC}"
            
            # Try health check
            if curl -s -f http://localhost:8000/health > /dev/null 2>&1; then
                echo -e "${GREEN}🏥 Health check: OK${NC}"
            else
                echo -e "${RED}🏥 Health check: FAILED${NC}"
            fi
        else
            echo -e "${RED}❌ Server is not running${NC}"
            exit 1
        fi
        ;;
    "logs")
        tail -f "$LOG_FILE"
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|logs}"
        echo ""
        echo "Commands:"
        echo "  start   - Start the server with monitoring (default)"
        echo "  stop    - Stop the server"
        echo "  restart - Restart the server" 
        echo "  status  - Check server status"
        echo "  logs    - Show live server logs"
        exit 1
        ;;
esac 