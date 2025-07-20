import { NextRequest, NextResponse } from "next/server";
import neo4jService from "@/lib/neo4j-service";

function getUserFromSession(request: NextRequest): { netId: string; role: string } | null {
  try {
    const sessionCookie = request.cookies.get('duke-sso-session');
    if (!sessionCookie) {
      // Development mode fallback
      if (process.env.NODE_ENV === 'development') {
        console.log('Development mode: Using fallback authentication in cancel');
        return { netId: 'testuser', role: 'faculty' };
      }
      return null;
    }
    
    const sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
    if (Date.now() > sessionData.expires) {
      // Development mode fallback even for expired sessions
      if (process.env.NODE_ENV === 'development') {
        console.log('Development mode: Using fallback authentication for expired session in cancel');
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
      console.log('Development mode: Using fallback authentication after error in cancel');
      return { netId: 'testuser', role: 'faculty' };
    }
    return null;
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getUserFromSession(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id: reportId } = await params;
    
    console.log(`[${new Date().toISOString()}] Cancelling report generation: ${reportId}`);

    // Check if report exists and belongs to user
    const report = await neo4jService.getReport(reportId, user.netId, true);
    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Delete the report from the database
    const deleted = await neo4jService.deleteReport(reportId, user.netId);
    
    if (deleted) {
      console.log(`[${new Date().toISOString()}] Report ${reportId} cancelled and deleted successfully`);
      return NextResponse.json({ 
        success: true, 
        message: 'Report generation cancelled and removed',
        reportId: reportId
      });
    } else {
      return NextResponse.json({ error: 'Failed to cancel report' }, { status: 500 });
    }

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error cancelling report:`, error);
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown server error'
    }, { status: 500 });
  }
} 