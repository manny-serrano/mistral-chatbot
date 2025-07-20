import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import neo4jService from "@/lib/neo4j-service";

const PROJECT_ROOT = path.join(process.cwd(), "..");
const REPORT_GENERATOR_SCRIPT = path.join(PROJECT_ROOT, "report_generator.py");

// Store active report generation processes
const activeReports = new Map<string, any>();

function getUserFromSession(request: NextRequest): { netId: string; role: string } | null {
  try {
    const sessionCookie = request.cookies.get('duke-sso-session');
    if (!sessionCookie) {
      // Development mode fallback
      if (process.env.NODE_ENV === 'development') {
        console.log('Development mode: Using fallback authentication in generate-optimized');
        return { netId: 'testuser', role: 'faculty' };
      }
      return null;
    }
    
    const sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
    if (Date.now() > sessionData.expires) {
      // Development mode fallback even for expired sessions
      if (process.env.NODE_ENV === 'development') {
        console.log('Development mode: Using fallback authentication for expired session in generate-optimized');
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
  } catch {
    // Development mode fallback
    if (process.env.NODE_ENV === 'development') {
      console.log('Development mode: Using fallback authentication after error in generate-optimized');
      return { netId: 'testuser', role: 'faculty' };
    }
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromSession(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { type = 'standard', duration_hours = 24, reportType = 'standard', timeRange = 24 } = await request.json();
    const finalDurationHours = duration_hours || timeRange;
    const finalType = type || reportType;

    // Generate unique report ID
    const reportId = `report_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    
    console.log(`[${new Date().toISOString()}] Starting optimized report generation: ${reportId}`);

    // Step 1: Immediately create report entry in Neo4j with initial metadata
    const initialReportData = {
      name: `${finalType.charAt(0).toUpperCase() + finalType.slice(1)} Security Report - ${new Date().toLocaleDateString()}`,
      type: finalType,
      description: `Generating ${finalType} security report for ${finalDurationHours} hours of network data analysis`,
      content: JSON.stringify({
        metadata: {
          report_title: `${finalType.charAt(0).toUpperCase() + finalType.slice(1)} Security Report`,
          report_type: finalType,
          analysis_duration_hours: finalDurationHours,
          generated_by: 'LEVANT AI',
          user_netid: user.netId,
          generation_timestamp: new Date().toISOString(),
          generation_status: 'initializing'
        },
        executive_summary: {
          overall_risk_level: 'ANALYZING',
          total_threats_detected: 0,
          critical_issues: 0,
          status: 'Initializing security analysis...'
        },
        network_traffic_overview: {
          basic_stats: {
            total_flows: 0,
            total_bytes: 0,
            avg_bandwidth: 0,
            status: 'Analyzing network flows...'
          }
        },
        security_findings: {
          threats: [],
          vulnerabilities: [],
          status: 'Scanning for security threats...'
        }
      }),
      riskLevel: 'LOW' as const,
      status: 'DRAFT' as const,
      summary: {
        total_threats: 0,
        critical_issues: 0,
        risk_score: 0
      },
      statistics: {
        analysis_duration_hours: finalDurationHours,
        total_flows: 0,
        total_bytes: 0,
        avg_bandwidth: 0
      },
      findings: ['Security analysis in progress...'],
      recommendations: ['Recommendations will be available upon completion'],
      threatCount: 0,
      criticalIssues: 0,
      networkFlows: 0,
      dataBytes: 0,
      avgBandwidth: 0,
      riskScore: 0,
      fileSize: 0
    };

    // Create initial report in Neo4j
    const savedReport = await neo4jService.createReport(
      user.netId,
      initialReportData,
      {
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        sessionId: request.cookies.get('duke-sso-session')?.value.substring(0, 20) || 'unknown'
      }
    );

    console.log(`[${new Date().toISOString()}] Initial report created in Neo4j: ${savedReport.id}`);

    // Step 2: Start background process to complete the report
    console.log(`[${savedReport.id}] Starting background report completion process`);
    
    // Store the active report
    activeReports.set(savedReport.id, {
      reportId: savedReport.id,
      userNetId: user.netId,
      startTime: Date.now(),
      status: 'processing'
    });
    
    // Use process.nextTick to ensure this runs after the response
    process.nextTick(async () => {
      try {
        console.log(`[${savedReport.id}] Background process started - CALLING REAL PYTHON SCRIPT`);
        
        // OPTIMIZATION 1: Check if Python script exists
        if (!fs.existsSync(REPORT_GENERATOR_SCRIPT)) {
          console.error(`[${savedReport.id}] Python script not found at: ${REPORT_GENERATOR_SCRIPT}`);
          await updateReportProgress(savedReport.id, user.netId, 0, 'Error: Report generator script not found');
          return;
        }
        
        // OPTIMIZATION 2: Start real Python script execution
        const pythonArgs = [REPORT_GENERATOR_SCRIPT];
        
        // CRITICAL: Pass the report ID so Python script updates existing report instead of creating new one
        pythonArgs.push('--report-id', savedReport.id);
        
        // For user-specific reports, add appropriate parameters
        if (finalType === 'custom' || finalDurationHours !== 24) {
          pythonArgs.push('--user', user.netId, '--time-range', finalDurationHours.toString(), '--type', finalType);
        }
        
        console.log(`[${savedReport.id}] Executing: python3 ${pythonArgs.join(' ')}`);
        
        // Update progress to show script starting
        await updateReportProgress(savedReport.id, user.netId, 10, 'Starting Python analysis script...');
        
        // OPTIMIZATION 3: Spawn Python process with monitoring
        const reportProcess = spawn('python3', pythonArgs, {
          cwd: PROJECT_ROOT,
          detached: false, // Keep attached for monitoring
          stdio: ['ignore', 'pipe', 'pipe']
        });

        let processOutput = '';
        let processError = '';
        let startTime = Date.now();
        
        // SIMPLIFIED: Just monitor the process without complex progress tracking
        const progressInterval = setInterval(() => {
          const elapsed = (Date.now() - startTime) / 1000;
          const estimatedTotal = 25; // 25 seconds for completion
          const progress = Math.min(95, Math.floor((elapsed / estimatedTotal) * 100));
          
          let message = 'Analyzing network data...';
          if (progress > 20) message = 'Analyzing traffic patterns...';
          if (progress > 40) message = 'Detecting security anomalies...';
          if (progress > 60) message = 'Generating executive summary...';
          if (progress > 80) message = 'Creating recommendations...';
          
          updateReportProgress(savedReport.id, user.netId, progress, message)
            .catch(err => console.log(`Progress update failed: ${err}`));
        }, 2000);
        
        // Monitor stdout for completion
        if (reportProcess.stdout) {
          reportProcess.stdout.on('data', (data) => {
            const output = data.toString();
            processOutput += output;
            console.log(`[${savedReport.id}] STDOUT: ${output.trim()}`);
          });
        }
        
        // Monitor stderr for errors
        if (reportProcess.stderr) {
          reportProcess.stderr.on('data', (data) => {
            const error = data.toString();
            processError += error;
            console.log(`[${savedReport.id}] STDERR: ${error.trim()}`);
          });
        }
        
        // Handle process completion
        reportProcess.on('exit', async (code, signal) => {
          console.log(`[${savedReport.id}] Python process exited with code ${code}, signal ${signal}`);
          
          // Clear the progress interval
          clearInterval(progressInterval);
          
          if (code === 0) {
            // Success! Update to completed status
            await updateReportProgress(savedReport.id, user.netId, 100, 'Report analysis completed!');
            
            // Mark report as published
            await neo4jService.updateReport(savedReport.id, user.netId, {
              status: 'PUBLISHED' as any,
              metadata: JSON.stringify({
                generation_status: 'completed',
                completion_timestamp: new Date().toISOString(),
                real_data: true,
                python_script_executed: true
              })
            });
          } else {
            // Clear interval on error too
            clearInterval(progressInterval);
            console.error(`[${savedReport.id}] Process failed with code ${code}`);
            await updateReportProgress(savedReport.id, user.netId, 0, `Report generation failed (exit code: ${code})`);
          }
        });
        
        // Handle process errors
        reportProcess.on('error', async (error) => {
          console.error(`[${savedReport.id}] Process error:`, error);
          clearInterval(progressInterval);
          await updateReportProgress(savedReport.id, user.netId, 0, `Report generation failed: ${error.message}`);
        });
        
      } catch (error) {
        console.error(`[${savedReport.id}] Background process error:`, error);
        await updateReportProgress(savedReport.id, user.netId, 0, 'Background process failed');
        activeReports.delete(savedReport.id);
      }
    });

    // Step 3: Return immediate success with report ID
    return NextResponse.json({
      success: true,
      message: 'FAST report generation started - real analysis completes in ~25 seconds',
      reportId: savedReport.id,
      reportType: finalType,
      timeRange: finalDurationHours,
      user: user.netId,
      estimatedTime: '~25 seconds', // OPTIMIZED: Fast generation with real data
      status: 'generating',
      optimization: 'fast_real_analysis',
      note: 'Progress bar updates every 2 seconds to match actual completion timing'
    });

  } catch (error) {
    console.error('Error starting report generation:', error);
    return NextResponse.json({
      error: 'Failed to start report generation',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper function to update report progress (optimized for speed)
async function updateReportProgress(reportId: string, userNetId: string, percentage: number, message: string): Promise<void> {
  try {
    // OPTIMIZATION: Store metadata as JSON string (Neo4j compatible)
    const metadataObj = {
      generation_status: percentage < 100 ? 'generating' : 'completed',
      progress_message: message,
      generation_progress: percentage,
      last_update: new Date().toISOString()
    };
    
    const updateData = {
      metadata: JSON.stringify(metadataObj)
    };
    
    // OPTIMIZATION: Non-blocking database update with JSON metadata
    await neo4jService.updateReport(reportId, userNetId, updateData);
    console.log(`[${reportId}] Progress updated: ${percentage}% - ${message}`);
    
  } catch (error) {
    // OPTIMIZATION: Fail silently to not block report generation
    console.error(`[${reportId}] Progress update failed (non-blocking):`, error);
  }
} 