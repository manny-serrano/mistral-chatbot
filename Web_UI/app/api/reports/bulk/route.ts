import { NextRequest, NextResponse } from "next/server";
import neo4jService from "@/lib/neo4j-service";

// Helper function to get user from session (same pattern as other routes)
function getUserFromSession(request: NextRequest) {
  try {
    const cookieValue = request.cookies.get('duke-sso-session')?.value;
    
    if (!cookieValue) {
      return null;
    }

    // Decode the base64 cookie
    const decodedCookie = Buffer.from(cookieValue, 'base64').toString('utf8');
    
    try {
      const sessionData = JSON.parse(decodedCookie);
      
      if (sessionData && sessionData.netId) {
        return {
          netId: sessionData.netId,
          role: sessionData.role || 'student',
          email: sessionData.email || `${sessionData.netId}@duke.edu`,
          firstName: sessionData.firstName || 'User',
          lastName: sessionData.lastName || 'Name',
          displayName: sessionData.displayName || `${sessionData.firstName || 'User'} ${sessionData.lastName || 'Name'}`
        };
      }
    } catch (parseError) {
      console.log('Error parsing session cookie:', parseError);
    }
  } catch (error) {
    console.log('Error accessing session cookie:', error);
  }

  // Development fallback
  if (process.env.NODE_ENV === 'development') {
    console.log('Development mode: Using fallback authentication after error in bulk delete endpoint');
    return { netId: 'testuser', role: 'faculty' };
  }
  return null;
}

export async function DELETE(request: NextRequest) {
  console.log('🗑️ Bulk delete API called')
  
  try {
    // Get user from session
    const user = getUserFromSession(request);
    console.log('👤 User from session:', user ? { netId: user.netId, role: user.role } : 'null')
    
    if (!user) {
      console.log('❌ No user found, returning 401')
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    try {
      // Parse request body to get options
      const body = await request.json().catch(() => ({}));
      const { includeArchived = true } = body;
      console.log('📋 Request options:', { includeArchived })

      console.log('🔗 Calling Neo4j deleteAllReportsForUser...')
      // Delete all reports for the user
      const result = await neo4jService.deleteAllReportsForUser(user.netId, includeArchived);
      console.log('📊 Neo4j result:', result)
      
      if (!result.success) {
        console.log('❌ Neo4j operation failed, returning 500')
        return NextResponse.json(
          { error: 'Failed to delete reports' },
          { status: 500 }
        );
      }

      const response = {
        success: true,
        message: `Successfully deleted ${result.deletedCount} report${result.deletedCount !== 1 ? 's' : ''}`,
        deletedCount: result.deletedCount
      };
      
      console.log('✅ Returning success response:', response)
      return NextResponse.json(response);
    } catch (error) {
      console.error('💥 Error bulk deleting reports from Neo4j:', error);
      return NextResponse.json(
        { error: 'Failed to delete reports' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('💥 Error in reports/bulk DELETE:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 