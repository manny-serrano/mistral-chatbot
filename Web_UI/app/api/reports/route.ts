import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Reports directory relative to the project root
const REPORTS_DIR = path.join(process.cwd(), "../cybersecurity_reports");

interface ReportMetadata {
  id: string;
  title: string;
  type: string;
  date: string;
  status: "completed" | "generating" | "failed";
  size: string;
  filename: string;
  duration_hours: number;
  risk_level: string;
  flows_analyzed: number;
  generated_by: string;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getReportMetadata(): ReportMetadata[] {
  try {
    if (!fs.existsSync(REPORTS_DIR)) {
      return [];
    }

    const files = fs.readdirSync(REPORTS_DIR)
      .filter(file => file.endsWith('.json') && file.startsWith('cybersecurity_report_'))
      .sort((a, b) => {
        // Sort by creation time, newest first
        const statA = fs.statSync(path.join(REPORTS_DIR, a));
        const statB = fs.statSync(path.join(REPORTS_DIR, b));
        return statB.mtime.getTime() - statA.mtime.getTime();
      });

    const reports: ReportMetadata[] = [];

    for (const filename of files) {
      try {
        const filePath = path.join(REPORTS_DIR, filename);
        const fileStats = fs.statSync(filePath);
        const reportContent = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        
        // Extract metadata from the report
        const metadata = reportContent.metadata || {};
        const executiveSummary = reportContent.executive_summary || {};
        const networkOverview = reportContent.network_traffic_overview?.basic_stats || {};

        reports.push({
          id: filename.replace('.json', ''),
          title: metadata.report_title || 'Cybersecurity Report',
          type: 'Network Traffic Analysis',
          date: new Date(fileStats.mtime).toISOString(),
          status: 'completed',
          size: formatFileSize(fileStats.size),
          filename: filename,
          duration_hours: metadata.analysis_duration_hours || 0,
          risk_level: executiveSummary.overall_risk_level || 'UNKNOWN',
          flows_analyzed: networkOverview.total_flows || 0,
          generated_by: metadata.generated_by || 'CyberSense AI'
        });
      } catch (error) {
        console.error(`Error processing report ${filename}:`, error);
        // Add failed report entry
        reports.push({
          id: filename.replace('.json', ''),
          title: 'Failed Report',
          type: 'Network Traffic Analysis',
          date: new Date().toISOString(),
          status: 'failed',
          size: '0 B',
          filename: filename,
          duration_hours: 0,
          risk_level: 'UNKNOWN',
          flows_analyzed: 0,
          generated_by: 'CyberSense AI'
        });
      }
    }

    return reports;
  } catch (error) {
    console.error('Error reading reports directory:', error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const reportId = url.searchParams.get('id');

    // If requesting a specific report
    if (reportId) {
      const reportPath = path.join(REPORTS_DIR, `${reportId}.json`);
      
      if (!fs.existsSync(reportPath)) {
        return NextResponse.json({ error: 'Report not found' }, { status: 404 });
      }

      try {
        const reportContent = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
        return NextResponse.json(reportContent);
      } catch (error) {
        return NextResponse.json({ error: 'Error reading report' }, { status: 500 });
      }
    }

    // Return list of all reports
    const reports = getReportMetadata();
    
    // Calculate summary statistics
    const summary = {
      total_reports: reports.length,
      completed_reports: reports.filter(r => r.status === 'completed').length,
      failed_reports: reports.filter(r => r.status === 'failed').length,
      total_flows_analyzed: reports.reduce((sum, r) => sum + r.flows_analyzed, 0),
      latest_report: reports.length > 0 ? reports[0] : null,
      risk_distribution: {
        HIGH: reports.filter(r => r.risk_level === 'HIGH').length,
        MEDIUM: reports.filter(r => r.risk_level === 'MEDIUM').length,
        LOW: reports.filter(r => r.risk_level === 'LOW').length,
      }
    };

    return NextResponse.json({
      reports,
      summary
    });
  } catch (error) {
    console.error('Error in reports API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    if (action === 'generate') {
      // Trigger report generation
      // Note: In production, this would trigger the Python script
      return NextResponse.json({ 
        message: 'Report generation started',
        status: 'generating',
        estimated_time: '2-3 minutes'
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error in reports POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 