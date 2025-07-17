import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Reports directory structure relative to the project root
const REPORTS_DIR = path.join(process.cwd(), "../cybersecurity_reports");
const SHARED_REPORTS_DIR = path.join(REPORTS_DIR, "shared");
const USER_REPORTS_DIR = path.join(REPORTS_DIR, "users");
const ADMIN_REPORTS_DIR = path.join(REPORTS_DIR, "admin");

interface ReportMetadata {
  id: string;
  title: string;
  type: string;
  category: "shared" | "user" | "admin";
  date: string;
  status: "completed" | "generating" | "failed";
  size: string;
  filename: string;
  duration_hours: number;
  risk_level: string;
  flows_analyzed: number;
  generated_by: string;
  user_netid?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

import { getUserFromSession } from "../../../lib/auth-utils";

function getReportsFromDirectory(directory: string, category: string, userNetId?: string): ReportMetadata[] {
  if (!fs.existsSync(directory)) {
    return [];
  }

  const reports: ReportMetadata[] = [];
  
  if (category === 'user' && userNetId) {
    // Get user-specific reports
    const userDir = path.join(directory, userNetId);
    if (fs.existsSync(userDir)) {
      const files = fs.readdirSync(userDir).filter(file => file.endsWith('.json'));
      
      for (const filename of files) {
        try {
          const filePath = path.join(userDir, filename);
          const fileStats = fs.statSync(filePath);
          const reportContent = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          
          const metadata = reportContent.metadata || {};
          const executiveSummary = reportContent.executive_summary || {};
          const networkOverview = reportContent.network_traffic_overview?.basic_stats || {};

          reports.push({
            id: filename.replace('.json', ''),
            title: metadata.report_title || 'Custom Report',
            type: metadata.report_type || 'custom',
            category: 'user',
            date: new Date(fileStats.mtime).toISOString(),
            status: 'completed',
            size: formatFileSize(fileStats.size),
            filename: filename,
            duration_hours: metadata.analysis_duration_hours || 0,
            risk_level: executiveSummary.overall_risk_level || 'UNKNOWN',
            flows_analyzed: networkOverview.total_flows || 0,
            generated_by: metadata.generated_by || 'LEVANT AI',
            user_netid: metadata.user_netid || userNetId
          });
        } catch (error) {
          console.error(`Error processing user report ${filename}:`, error);
        }
      }
    }
  } else {
    // Get shared or admin reports
    const files = fs.readdirSync(directory)
      .filter(file => file.endsWith('.json'))
      .sort((a, b) => {
        const statA = fs.statSync(path.join(directory, a));
        const statB = fs.statSync(path.join(directory, b));
        return statB.mtime.getTime() - statA.mtime.getTime();
      });

    for (const filename of files) {
      try {
        const filePath = path.join(directory, filename);
        const fileStats = fs.statSync(filePath);
        const reportContent = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        
        const metadata = reportContent.metadata || {};
        const executiveSummary = reportContent.executive_summary || {};
        const networkOverview = reportContent.network_traffic_overview?.basic_stats || {};

        reports.push({
          id: filename.replace('.json', ''),
          title: metadata.report_title || 'Network Traffic Analysis Report',
          type: category === 'shared' ? 'Network Traffic Analysis' : 'Admin Report',
          category: category as "shared" | "user" | "admin",
          date: new Date(fileStats.mtime).toISOString(),
          status: 'completed',
          size: formatFileSize(fileStats.size),
          filename: filename,
          duration_hours: metadata.analysis_duration_hours || 24,
          risk_level: executiveSummary.overall_risk_level || 'UNKNOWN',
          flows_analyzed: networkOverview.total_flows || 0,
          generated_by: metadata.generated_by || 'LEVANT AI'
        });
      } catch (error) {
        console.error(`Error processing ${category} report ${filename}:`, error);
      }
    }
  }

  return reports;
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const reportId = url.searchParams.get('id');

    // Get user from session
    const user = getUserFromSession(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // If requesting a specific report
    if (reportId) {
      // Try to find the report in all accessible directories
      const possiblePaths = [
        path.join(SHARED_REPORTS_DIR, `${reportId}.json`),
        path.join(USER_REPORTS_DIR, user.netId, `${reportId}.json`),
        ...(user.role === 'faculty' || user.role === 'staff' ? [path.join(ADMIN_REPORTS_DIR, `${reportId}.json`)] : [])
      ];

      for (const reportPath of possiblePaths) {
        if (fs.existsSync(reportPath)) {
          try {
            const reportContent = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
            return NextResponse.json(reportContent);
          } catch (error) {
            return NextResponse.json({ error: 'Error reading report' }, { status: 500 });
          }
        }
      }

      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Return categorized reports based on user permissions
    const sharedReports = getReportsFromDirectory(SHARED_REPORTS_DIR, 'shared');
    const userReports = getReportsFromDirectory(USER_REPORTS_DIR, 'user', user.netId);
    const adminReports = (user.role === 'faculty' || user.role === 'staff') 
      ? getReportsFromDirectory(ADMIN_REPORTS_DIR, 'admin') 
      : [];

    const allReports = [...sharedReports, ...userReports, ...adminReports];
    
    // Calculate summary statistics
    const summary = {
      total_reports: allReports.length,
      shared_reports: sharedReports.length,
      user_reports: userReports.length,
      admin_reports: adminReports.length,
      completed_reports: allReports.filter(r => r.status === 'completed').length,
      failed_reports: allReports.filter(r => r.status === 'failed').length,
      total_flows_analyzed: allReports.reduce((sum, r) => sum + r.flows_analyzed, 0),
      latest_report: allReports.length > 0 ? allReports[0] : null,
      risk_distribution: {
        HIGH: allReports.filter(r => r.risk_level === 'HIGH').length,
        MEDIUM: allReports.filter(r => r.risk_level === 'MEDIUM').length,
        LOW: allReports.filter(r => r.risk_level === 'LOW').length,
      },
      user_info: {
        netId: user.netId,
        role: user.role,
        canAccessAdmin: user.role === 'faculty' || user.role === 'staff'
      }
    };

    return NextResponse.json({
      reports: {
        shared: sharedReports,
        user: userReports,
        admin: adminReports
      },
      summary
    });
  } catch (error) {
    console.error('Error in reports API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromSession(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { action, reportType = 'custom', timeRange = 24, query } = await request.json();

    if (action === 'generate') {
      // Trigger user-specific report generation
      const { spawn } = require('child_process');
      const PROJECT_ROOT = path.join(process.cwd(), "..");
      const REPORT_GENERATOR_SCRIPT = path.join(PROJECT_ROOT, "report_generator.py");

      if (!fs.existsSync(REPORT_GENERATOR_SCRIPT)) {
        return NextResponse.json({ 
          error: 'Report generator script not found'
        }, { status: 500 });
      }

      try {
        const args = [
          REPORT_GENERATOR_SCRIPT,
          '--user', user.netId,
          '--time-range', timeRange.toString(),
          '--type', reportType
        ];

        if (query) {
          args.push('--query', query);
        }

        const reportProcess = spawn('python3', args, {
          cwd: PROJECT_ROOT,
          detached: true,
          stdio: ['ignore', 'pipe', 'pipe']
        });

        reportProcess.unref();

        return NextResponse.json({
          message: 'Custom report generation started successfully',
          reportType,
          timeRange,
          user: user.netId,
          estimatedTime: '1-2 minutes'
        });

      } catch (error) {
        console.error('Error starting report generation:', error);
        return NextResponse.json({ 
          error: 'Failed to start report generation'
        }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error in reports POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 