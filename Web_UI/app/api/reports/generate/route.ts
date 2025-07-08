import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

const PROJECT_ROOT = path.join(process.cwd(), "..");
const REPORT_GENERATOR_SCRIPT = path.join(PROJECT_ROOT, "report_generator.py");

export async function POST(request: NextRequest) {
  try {
    const { type = 'standard', force = false } = await request.json();

    // Check if report generator script exists
    if (!fs.existsSync(REPORT_GENERATOR_SCRIPT)) {
      return NextResponse.json({ 
        error: 'Report generator script not found',
        details: 'The report_generator.py script is not available'
      }, { status: 500 });
    }

    // Generate unique request ID for tracking
    const requestId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Start report generation in background
      const reportProcess = spawn('python3', [REPORT_GENERATOR_SCRIPT], {
        cwd: PROJECT_ROOT,
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      // Log the process start
      console.log(`Started report generation process ${reportProcess.pid} for request ${requestId}`);

      // Don't wait for the process to complete, return immediately
      reportProcess.unref();

      // Store process info (in production, you'd use a database or cache)
      const processInfo = {
        requestId,
        pid: reportProcess.pid,
        startTime: new Date().toISOString(),
        status: 'generating',
        type
      };

      // You could store this in a database or cache for tracking
      console.log('Report generation started:', processInfo);

      return NextResponse.json({
        message: 'Report generation started successfully',
        requestId,
        status: 'generating',
        estimatedTime: '2-3 minutes',
        type,
        pid: reportProcess.pid
      });

    } catch (error) {
      console.error('Error starting report generation:', error);
      return NextResponse.json({ 
        error: 'Failed to start report generation',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error in generate API:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const requestId = url.searchParams.get('requestId');

    if (requestId) {
      // Check status of specific generation request
      // In production, you'd query a database or cache
      return NextResponse.json({
        requestId,
        status: 'completed', // This would come from your tracking system
        message: 'Report generation completed'
      });
    }

    // Return general status
    return NextResponse.json({
      available: fs.existsSync(REPORT_GENERATOR_SCRIPT),
      lastRun: 'N/A', // This would come from your tracking system
      nextScheduled: 'Daily at 6:00 AM'
    });

  } catch (error) {
    console.error('Error checking generation status:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 