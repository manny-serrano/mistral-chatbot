#!/bin/bash

# Enhanced Cybersecurity Report Generator - Automated Scheduler
# This script sets up automatic generation of detailed cybersecurity reports every 24 hours

# Set the project directory
PROJECT_DIR="/Users/emmanuelserrano/mistral-enhancing-network-security-analysis"

# Create a wrapper script for the report generator
cat > "${PROJECT_DIR}/run_daily_report.sh" << 'EOF'
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

echo "Starting cybersecurity report generation at $(date)" >> "$LOG_FILE"

# Run the report generator
python3 report_generator.py >> "$LOG_FILE" 2>&1

# Check if the report was generated successfully
if [ $? -eq 0 ]; then
    echo "✅ Cybersecurity report generated successfully at $(date)" >> "$LOG_FILE"
    
    # Optional: Send notification (uncomment and configure as needed)
    # echo "Daily cybersecurity report generated successfully" | mail -s "CyberSense Report Generated" admin@yourcompany.com
    
else
    echo "❌ Error generating cybersecurity report at $(date)" >> "$LOG_FILE"
    
    # Optional: Send error notification (uncomment and configure as needed)
    # echo "Error generating daily cybersecurity report. Check logs at: $LOG_FILE" | mail -s "CyberSense Report Error" admin@yourcompany.com
fi

# Keep only the last 30 log files
find logs/ -name "report_generation_*.log" -mtime +30 -delete

# Keep only the last 30 report files (optional)
find cybersecurity_reports/ -name "cybersecurity_report_*.json" -mtime +30 -delete

echo "Report generation process completed at $(date)" >> "$LOG_FILE"
EOF

# Make the wrapper script executable
chmod +x "${PROJECT_DIR}/run_daily_report.sh"

echo "Setting up cron job for daily cybersecurity reports..."

# Create cron job entry
CRON_JOB="0 6 * * * ${PROJECT_DIR}/run_daily_report.sh"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "run_daily_report.sh"; then
    echo "⚠️  Cron job already exists. Updating..."
    # Remove existing job and add new one
    (crontab -l 2>/dev/null | grep -v "run_daily_report.sh"; echo "$CRON_JOB") | crontab -
else
    echo "➕ Adding new cron job..."
    # Add new cron job
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
fi

echo "✅ Setup complete!"
echo ""
echo "📋 Configuration Summary:"
echo "  • Report Generator: ${PROJECT_DIR}/report_generator.py"
echo "  • Wrapper Script: ${PROJECT_DIR}/run_daily_report.sh"
echo "  • Schedule: Daily at 6:00 AM"
echo "  • Output Directory: ${PROJECT_DIR}/cybersecurity_reports/"
echo "  • Log Directory: ${PROJECT_DIR}/logs/"
echo ""
echo "🔧 Commands:"
echo "  • View cron jobs: crontab -l"
echo "  • Test run now: ${PROJECT_DIR}/run_daily_report.sh"
echo "  • View logs: tail -f ${PROJECT_DIR}/logs/report_generation_*.log"
echo ""
echo "📧 Optional Email Notifications:"
echo "  Edit ${PROJECT_DIR}/run_daily_report.sh to uncomment and configure email settings" 