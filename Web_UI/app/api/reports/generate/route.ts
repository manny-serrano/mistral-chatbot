import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

const PROJECT_ROOT = path.join(process.cwd(), "..");
const REPORT_GENERATOR_SCRIPT = path.join(PROJECT_ROOT, "report_generator.py");

/**
 * Handles report generation requests
 * 
 * @description Spawns a Python process to generate cybersecurity reports in the background.
 * Returns immediately with a tracking ID rather than waiting for completion.
 * 
 * @param request - NextRequest containing report generation parameters
 * @returns Promise<NextResponse> with success status and tracking information
 * 
 * @example
 * POST /api/reports/generate
 * {
 *   "type": "standard",
 *   "duration_hours": 24,
 *   "force": false
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Report generation started successfully",
 *   "requestId": "report_1234567890_abc123",
 *   "status": "generating",
 *   "estimatedTime": "2-3 minutes",
 *   "type": "standard",
 *   "pid": 12345
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { type = 'standard', force = false } = await request.json();

    // Validate report generator script availability
    if (!fs.existsSync(REPORT_GENERATOR_SCRIPT)) {
      console.error(`Report generator script not found at: ${REPORT_GENERATOR_SCRIPT}`);
      return NextResponse.json({ 
        success: false,
        error: 'Report generator script not found',
        details: 'The report_generator.py script is not available. Please ensure the backend is properly deployed.'
      }, { status: 500 });
    }

    // Generate unique request ID for process tracking
    const requestId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Start report generation process in background
      const reportProcess = spawn('python3', [REPORT_GENERATOR_SCRIPT], {
        cwd: PROJECT_ROOT,
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      // Log process initiation for monitoring/debugging
      console.log(`[${new Date().toISOString()}] Started report generation process ${reportProcess.pid} for request ${requestId}`);

      // Detach process to run independently
      reportProcess.unref();

      // Store process metadata (in production, use Redis/DB for persistence)
      const processInfo = {
        requestId,
        pid: reportProcess.pid,
        startTime: new Date().toISOString(),
        status: 'generating',
        type
      };

      console.log(`[${new Date().toISOString()}] Report generation started:`, processInfo);

      // Return immediate success response with tracking info
      return NextResponse.json({
        success: true,
        message: 'Report generation started successfully',
        requestId,
        status: 'generating',
        estimatedTime: '2-3 minutes',
        type,
        pid: reportProcess.pid
      });

    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error starting report generation:`, error);
      return NextResponse.json({ 
        success: false,
        error: 'Failed to start report generation',
        details: error instanceof Error ? error.message : 'Unknown process spawn error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in generate API:`, error);
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown server error'
    }, { status: 500 });
  }
}

/**
 * Handles report generation status requests
 * 
 * @description Provides status information about report generation processes
 * or general system availability
 * 
 * @param request - NextRequest with optional requestId query parameter
 * @returns Promise<NextResponse> with status information
 * 
 * @example
 * GET /api/reports/generate?requestId=report_1234567890_abc123
 * 
 * Response:
 * {
 *   "success": true,
 *   "requestId": "report_1234567890_abc123",
 *   "status": "completed",
 *   "message": "Report generation completed"
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const requestId = url.searchParams.get('requestId');

    if (requestId) {
      // Check status of specific generation request
      // TODO: In production, query database/cache for actual status
      return NextResponse.json({
        success: true,
        requestId,
        status: 'completed', // This would come from your tracking system
        message: 'Report generation completed'
      });
    }

    // Return general system status
    return NextResponse.json({
      success: true,
      available: fs.existsSync(REPORT_GENERATOR_SCRIPT),
      lastRun: 'N/A', // This would come from your tracking system  
      nextScheduled: 'Daily at 6:00 AM',
      version: '1.0.0'
    });

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error checking generation status:`, error);
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 