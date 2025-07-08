#!/bin/bash

# Daily Cybersecurity Report Generation Script
PROJECT_DIR="/Users/emmanuelserrano/mistral-enhancing-network-security-analysis"
cd "$PROJECT_DIR"

# Load environment variables
source .env 2>/dev/null || echo "Warning: .env file not found"

# Create log directory
mkdir -p logs

# Generate timestamp
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
LOG_FILE="logs/report_generation_${TIMESTAMP}.log"

echo "Starting automated cybersecurity report generation at $(date)" >> "$LOG_FILE"
echo "🤖 AUTOMATED DAILY REPORT GENERATION" >> "$LOG_FILE"
echo "Integration: Frontend Reports System Active" >> "$LOG_FILE"

# Run the report generator
python3 report_generator.py >> "$LOG_FILE" 2>&1

# Check if the report was generated successfully
if [ $? -eq 0 ]; then
    echo "✅ Cybersecurity report generated successfully at $(date)" >> "$LOG_FILE"
    echo "📊 Report available via frontend at: /reports" >> "$LOG_FILE"
    
    # Count total reports generated
    REPORT_COUNT=$(find cybersecurity_reports/ -name "cybersecurity_report_*.json" | wc -l)
    echo "📈 Total reports in system: $REPORT_COUNT" >> "$LOG_FILE"
    
    # Get the latest report info
    LATEST_REPORT=$(ls -t cybersecurity_reports/cybersecurity_report_*.json | head -1)
    if [ -n "$LATEST_REPORT" ]; then
        REPORT_SIZE=$(ls -lh "$LATEST_REPORT" | awk '{print $5}')
        echo "📄 Latest report: $(basename "$LATEST_REPORT") (${REPORT_SIZE})" >> "$LOG_FILE"
    fi
    
    # Optional: Send notification (uncomment and configure as needed)
    # echo "Daily cybersecurity report generated successfully. View at: https://yourdomain.com/reports" | mail -s "CyberSense Report Generated" admin@yourcompany.com
    
else
    echo "❌ Error generating cybersecurity report at $(date)" >> "$LOG_FILE"
    echo "🔍 Check logs and ensure all dependencies are available" >> "$LOG_FILE"
    
    # Optional: Send error notification (uncomment and configure as needed)
    # echo "Error generating daily cybersecurity report. Check logs at: $LOG_FILE" | mail -s "CyberSense Report Error" admin@yourcompany.com
fi

# Keep only the last 30 log files
find logs/ -name "report_generation_*.log" -mtime +30 -delete

# Keep only the last 30 report files (optional)
find cybersecurity_reports/ -name "cybersecurity_report_*.json" -mtime +30 -delete

echo "Report generation process completed at $(date)" >> "$LOG_FILE"
