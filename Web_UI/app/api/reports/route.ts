import { NextRequest, NextResponse } from "next/server";
import neo4jService, { type ReportWithUser } from "@/lib/neo4j-service";

interface ReportMetadata {
  id: string;
  title: string;
  type: string;
  category: "user" | "admin";
  date: string;
  status: "completed" | "generating" | "failed" | "draft" | "archived";
  size: string;
  filename?: string;
  duration_hours?: number;
  risk_level: string;
  flows_analyzed: number;
  generated_by: string;
  user_netid: string;
  risk_score?: number;
  threat_count?: number;
  critical_issues?: number;
  progress?: number;
  progress_message?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getUserFromSession(request: NextRequest): { netId: string; role: string } | null {
  try {
    const sessionCookie = request.cookies.get('duke-sso-session');
    if (!sessionCookie) {
      // Development mode fallback
      if (process.env.NODE_ENV === 'development') {
        console.log('Development mode: Using fallback authentication');
        return { netId: 'testuser', role: 'faculty' };
      }
      return null;
    }
    
    const sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
    if (Date.now() > sessionData.expires) {
      // Development mode fallback even for expired sessions
      if (process.env.NODE_ENV === 'development') {
        console.log('Development mode: Using fallback authentication for expired session');
        return { netId: 'testuser', role: 'faculty' };
      }
      return null;
    }
    
    const user = sessionData.user;
    const netId = user.eppn ? user.eppn.split('@')[0] : user.netId || 'unknown';
    const role = user.affiliation ? (
      user.affiliation.includes('faculty') ? 'faculty' :
      user.affiliation.includes('staff') ? 'staff' : 'student'
    ) : user.role || 'student';
    
    return { netId, role };
  } catch (error) {
    console.error('Session parsing error in main reports API:', error);
    // Development mode fallback
    if (process.env.NODE_ENV === 'development') {
      console.log('Development mode: Using fallback authentication after error');
      return { netId: 'testuser', role: 'faculty' };
    }
    return null;
  }
}

function mapReportToMetadata(report: ReportWithUser): ReportMetadata {
  // Map database status to frontend status
  let frontendStatus: "completed" | "generating" | "failed" | "draft" | "archived";
  
  // Parse metadata to extract progress information
  let progressInfo = {
    progress: 0,
    message: '',
    generation_status: 'draft'
  };
  
  try {
    if (report.metadata) {
      // Handle both parsed objects and string metadata
      let metadata;
      if (typeof report.metadata === 'string') {
        metadata = JSON.parse(report.metadata);
      } else if (typeof report.metadata === 'object') {
        metadata = report.metadata;
      } else {
        metadata = {};
      }
      
      progressInfo = {
        progress: metadata.generation_progress || 0,
        message: metadata.progress_message || '',
        generation_status: metadata.generation_status || 'draft'
      };
    }
  } catch (error) {
    console.log(`Failed to parse metadata for report ${report.id}:`, error);
  }
  
  // Handle status conversion - prioritize metadata status for generating reports
  const reportStatus = report.status as string;
  if (progressInfo.generation_status === 'generating') {
    frontendStatus = 'generating';
  } else if (progressInfo.generation_status === 'completed' || reportStatus === 'PUBLISHED') {
    frontendStatus = 'completed';
  } else {
    switch (reportStatus) {
      case 'PUBLISHED':
        frontendStatus = 'completed';
        break;
      case 'GENERATING':
      case 'DRAFT':
        frontendStatus = 'generating';
        break;
      case 'ARCHIVED':
        frontendStatus = 'archived';
        break;
      case 'FAILED':
        frontendStatus = 'failed';
        break;
      default:
        frontendStatus = 'draft';
    }
  }

  return {
    id: report.id,
    title: report.name,
    type: report.type,
    category: report.generatedBy.role === 'faculty' ? 'admin' : 'user',
    date: report.createdAt.toISOString(),
    status: frontendStatus,
    size: formatFileSize(report.fileSize || 0),
    filename: report.pdfPath ? report.pdfPath.split('/').pop() : undefined,
    duration_hours: report.statistics?.analysis_duration_hours || 0,
    risk_level: report.riskLevel,
    flows_analyzed: report.networkFlows || 0,
    generated_by: report.generatedBy.displayName,
    user_netid: report.generatedBy.netId,
    risk_score: report.riskScore,
    threat_count: report.threatCount,
    critical_issues: report.criticalIssues,
    // PROGRESS INFORMATION: Include progress data for generating reports
    progress: frontendStatus === 'generating' ? progressInfo.progress : 100,
    progress_message: frontendStatus === 'generating' ? progressInfo.message : 'Completed'
  };
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const reportId = url.searchParams.get('id');
    const riskLevel = url.searchParams.get('riskLevel') || undefined;
    const type = url.searchParams.get('type') || undefined;
    const status = url.searchParams.get('status') || undefined;
    const archived = url.searchParams.get('archived') === 'true';
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Get user from session
    const user = getUserFromSession(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // If requesting a specific report
    if (reportId) {
      try {
        const allowAdmin = user.role === 'faculty' || user.role === 'staff';
        const report = await neo4jService.getReport(reportId, user.netId, allowAdmin);
        
        if (!report) {
          return NextResponse.json({ error: 'Report not found' }, { status: 404 });
        }

        // Use mapReportToMetadata to ensure progress data is included
        const mappedReport = mapReportToMetadata(report);

        return NextResponse.json({ 
          success: true, 
          report: {
            ...mappedReport,
            content: typeof report.content === 'string' ? JSON.parse(report.content) : report.content,
            metadata: report.metadata || {} // Ensure metadata is always included
          }
        });
      } catch (error) {
        console.error('Error fetching report:', error);
        return NextResponse.json({ error: 'Error reading report' }, { status: 500 });
      }
    }

    // Get reports for the user
    try {
      const reports = await neo4jService.getReportsForUser(user.netId, {
        limit,
        offset,
        riskLevel,
        type,
        status: archived ? 'ARCHIVED' : status,
        sortBy: 'createdAt',
        sortOrder: 'DESC'
      });

      // Map reports to metadata format for frontend compatibility
      const userReports = reports.map(mapReportToMetadata);
      
      // If user is admin, also get other users' reports
      let adminReports: ReportMetadata[] = [];
      if (user.role === 'faculty' || user.role === 'staff') {
        // For admins, we could implement a separate query to get all reports
        // For now, we'll keep admin reports as the same user reports
        adminReports = userReports.filter(r => r.category === 'admin');
      }

      const allReports = [...userReports];
      
      // Calculate summary statistics
      const summary = {
        total_reports: allReports.length,
        shared_reports: 0, // Legacy concept, no longer used
        user_reports: userReports.length,
        admin_reports: adminReports.length,
        completed_reports: allReports.filter(r => r.status === 'completed').length,
        failed_reports: allReports.filter(r => r.status === 'failed').length,
        total_flows_analyzed: allReports.reduce((sum, r) => sum + r.flows_analyzed, 0),
        latest_report: allReports.length > 0 ? allReports[0] : null,
        risk_distribution: {
          HIGH: allReports.filter(r => r.risk_level === 'HIGH').length,
          CRITICAL: allReports.filter(r => r.risk_level === 'CRITICAL').length,
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
        categorized: {
          shared: [], // Legacy, no longer used
          user: userReports,
          admin: adminReports
        },
        summary
      });
    } catch (error) {
      console.error('Error fetching reports from Neo4j:', error);
      return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
    }
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

    const body = await request.json();
    const { action, reportType = 'custom', timeRange = 24, query, reportData } = body;

    if (action === 'generate') {
      // Generate a new report and store it in Neo4j
      try {
        // For now, we'll create a placeholder report
        // In a real implementation, this would trigger the Python report generator
        // and then store the results in Neo4j
        
        const reportId = `report_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
        
        // Create report data structure
        const newReportData = {
          name: `${reportType} Report - ${new Date().toLocaleDateString()}`,
          type: reportType,
          description: `Generated ${reportType} report for ${timeRange} hours of data`,
          content: JSON.stringify({
            metadata: {
              report_title: `${reportType} Report`,
              report_type: reportType,
              analysis_duration_hours: timeRange,
              generated_by: 'LEVANT AI',
              user_netid: user.netId,
              generation_timestamp: new Date().toISOString()
            },
            executive_summary: {
              overall_risk_level: 'MEDIUM',
              total_threats_detected: 5,
              critical_issues: 2
            },
            network_traffic_overview: {
              basic_stats: {
                total_flows: 1000,
                total_bytes: 52428800,
                avg_bandwidth: 25.5
              }
            },
            detailed_analysis: {
              findings: [
                'Network traffic analysis completed',
                'Multiple security events detected',
                'Baseline patterns established'
              ],
              recommendations: [
                'Monitor high-risk connections',
                'Update security policies',
                'Schedule regular assessments'
              ]
            }
          }),
          riskLevel: 'MEDIUM' as const,
          status: 'PUBLISHED' as const,
          summary: {
            total_threats: 5,
            critical_issues: 2,
            risk_score: 6.5
          },
          statistics: {
            analysis_duration_hours: timeRange,
            total_flows: 1000,
            total_bytes: 52428800,
            avg_bandwidth: 25.5
          },
          findings: [
            'Network traffic analysis completed',
            'Multiple security events detected', 
            'Baseline patterns established'
          ],
          recommendations: [
            'Monitor high-risk connections',
            'Update security policies',
            'Schedule regular assessments'
          ],
          threatCount: 5,
          criticalIssues: 2,
          networkFlows: 1000,
          dataBytes: 52428800,
          avgBandwidth: 25.5,
          riskScore: 6.5,
          fileSize: 0
        };

        // Store report in Neo4j
        const savedReport = await neo4jService.createReport(
          user.netId,
          newReportData,
          {
            ip: request.headers.get('x-forwarded-for') || 'unknown',
            sessionId: request.cookies.get('duke-sso-session')?.value.substring(0, 20) || 'unknown'
          }
        );

        return NextResponse.json({
          success: true,
          message: 'Report generated and saved successfully',
          reportId: savedReport.id,
          reportType,
          timeRange,
          user: user.netId,
          estimatedTime: 'Completed'
        });

      } catch (error) {
        console.error('Error creating report in Neo4j:', error);
        return NextResponse.json({ 
          error: 'Failed to save generated report'
        }, { status: 500 });
      }
    }

    if (action === 'create' && reportData) {
      // Direct report creation (from external report generator)
      try {
        const savedReport = await neo4jService.createReport(
          user.netId,
          reportData,
          {
            ip: request.headers.get('x-forwarded-for') || 'unknown',
            sessionId: request.cookies.get('duke-sso-session')?.value.substring(0, 20) || 'unknown'
          }
        );

        return NextResponse.json({
          success: true,
          message: 'Report saved successfully',
          reportId: savedReport.id
        });
      } catch (error) {
        console.error('Error saving report to Neo4j:', error);
        return NextResponse.json({ 
          error: 'Failed to save report'
        }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error in reports POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = getUserFromSession(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { reportId } = await request.json();
    if (!reportId) {
      return NextResponse.json({ error: 'Report ID is required' }, { status: 400 });
    }

    try {
      const allowAdmin = user.role === 'faculty' || user.role === 'staff';
      const deleted = await neo4jService.deleteReport(reportId, user.netId, allowAdmin);
      
      if (!deleted) {
        return NextResponse.json({ error: 'Report not found or unauthorized' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        message: 'Report deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting report:', error);
      return NextResponse.json({ error: 'Failed to delete report' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in reports DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 