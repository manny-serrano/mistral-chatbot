import { NextRequest, NextResponse } from 'next/server';
import neo4jService from '@/lib/neo4j-service';

function getUserFromSession(request: NextRequest): { netId: string; role: string } | null {
  try {
    const sessionCookie = request.cookies.get('duke-sso-session');
    if (!sessionCookie) return null;
    
    const sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
    if (Date.now() > sessionData.expires) return null;
    
    const user = sessionData.user;
    const netId = user.eppn ? user.eppn.split('@')[0] : user.netId || 'unknown';
    const role = user.affiliation ? (
      user.affiliation.includes('faculty') ? 'faculty' :
      user.affiliation.includes('staff') ? 'staff' : 'student'
    ) : user.role || 'student';
    
    return { netId, role };
  } catch {
    return null;
  }
}

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
    
    try {
      // Check if user can access admin reports
      const allowAdmin = user.role === 'faculty' || user.role === 'staff';
      
      // Get report from Neo4j
      const report = await neo4jService.getReport(id, user.netId, allowAdmin);
      
      if (!report) {
        return NextResponse.json(
          { error: 'Report not found or access denied' },
          { status: 404 }
        );
      }

      // Parse content if it's a string
      const parsedContent = typeof report.content === 'string' ? JSON.parse(report.content) : report.content;
      
      // Flatten the content structure for frontend compatibility
      // The frontend expects executive_summary, metadata, etc. directly, not wrapped in content
      const flattenedReport = {
        ...parsedContent, // Spread the content fields (metadata, executive_summary, etc.)
        id: report.id,
        name: report.name,
        type: report.type,
        description: report.description,
        riskLevel: report.riskLevel,
        status: report.status,
        // Keep other top-level report fields that might be needed
        threatCount: report.threatCount,
        criticalIssues: report.criticalIssues,
        networkFlows: report.networkFlows,
        dataBytes: report.dataBytes,
        avgBandwidth: report.avgBandwidth,
        riskScore: report.riskScore,
        fileSize: report.fileSize,
        pdfPath: report.pdfPath,
        createdAt: report.createdAt,
        updatedAt: report.updatedAt
      };

      return NextResponse.json({
        success: true,
        report: flattenedReport
      });
    } catch (error) {
      console.error('Error fetching report from Neo4j:', error);
      return NextResponse.json(
        { error: 'Failed to fetch report' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in reports/[id] GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
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

    const updateData = await request.json();
    
    try {
      // Update report in Neo4j
      const updatedReport = await neo4jService.updateReport(id, user.netId, updateData);
      
      if (!updatedReport) {
        return NextResponse.json(
          { error: 'Report not found or access denied' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Report updated successfully',
        report: updatedReport
      });
    } catch (error) {
      console.error('Error updating report in Neo4j:', error);
      return NextResponse.json(
        { error: 'Failed to update report' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in reports/[id] PUT:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    
    try {
      // Check if user can delete admin reports
      const allowAdmin = user.role === 'faculty' || user.role === 'staff';
      
      // Delete report from Neo4j
      const deleted = await neo4jService.deleteReport(id, user.netId, allowAdmin);
      
      if (!deleted) {
        return NextResponse.json(
          { error: 'Report not found or access denied' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Report deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting report from Neo4j:', error);
      return NextResponse.json(
        { error: 'Failed to delete report' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in reports/[id] DELETE:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 

export async function PATCH(
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

    const { action } = await request.json();
    
    if (!action || !['archive', 'restore'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "archive" or "restore"' },
        { status: 400 }
      );
    }

    try {
      // Check if user can archive/restore admin reports
      const allowAdmin = user.role === 'faculty' || user.role === 'staff';
      
      let success = false;
      if (action === 'archive') {
        success = await neo4jService.archiveReport(id, user.netId, allowAdmin);
      } else if (action === 'restore') {
        success = await neo4jService.restoreReport(id, user.netId, allowAdmin);
      }
      
      if (!success) {
        return NextResponse.json(
          { error: 'Report not found or access denied' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Report ${action}d successfully`,
        action
      });
    } catch (error) {
      console.error(`Error ${action}ing report in Neo4j:`, error);
      return NextResponse.json(
        { error: `Failed to ${action} report` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in reports/[id] PATCH:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 