import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Look for the report file in the cybersecurity_reports directory
    const reportsDir = path.join(process.cwd(), '..', 'cybersecurity_reports');
    const reportPath = path.join(reportsDir, `${id}.json`);
    
    // Check if file exists
    if (!fs.existsSync(reportPath)) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }
    
    // Read and parse the report file
    const reportContent = fs.readFileSync(reportPath, 'utf-8');
    const reportData = JSON.parse(reportContent);
    
    return NextResponse.json({
      success: true,
      report: reportData
    });
    
  } catch (error) {
    console.error('Error fetching report:', error);
    return NextResponse.json(
      { error: 'Failed to fetch report' },
      { status: 500 }
    );
  }
} 