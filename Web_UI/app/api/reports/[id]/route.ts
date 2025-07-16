import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

import { getUserFromSession } from '../../../../lib/auth-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Get user from session
    const user = getUserFromSession(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Define possible report locations based on user permissions
    const reportsDir = path.join(process.cwd(), '..', 'cybersecurity_reports');
    const possiblePaths = [
      // Shared reports (available to all users)
      path.join(reportsDir, 'shared', `${id}.json`),
      // User's own reports
      path.join(reportsDir, 'users', user.netId, `${id}.json`),
      // Admin reports (only for faculty/staff)
      ...(user.role === 'faculty' || user.role === 'staff' 
        ? [path.join(reportsDir, 'admin', `${id}.json`)] 
        : [])
    ];
    
    // Try to find the report in accessible locations
    for (const reportPath of possiblePaths) {
      if (fs.existsSync(reportPath)) {
        try {
          const reportContent = fs.readFileSync(reportPath, 'utf-8');
          const reportData = JSON.parse(reportContent);
          
          return NextResponse.json({
            success: true,
            report: reportData
          });
        } catch (error) {
          console.error('Error reading report:', error);
          return NextResponse.json(
            { error: 'Error reading report file' },
            { status: 500 }
          );
        }
      }
    }
    
    // Report not found in any accessible location
    return NextResponse.json(
      { error: 'Report not found or access denied' },
      { status: 404 }
    );
    
  } catch (error) {
    console.error('Error fetching report:', error);
    return NextResponse.json(
      { error: 'Failed to fetch report' },
      { status: 500 }
    );
  }
} 