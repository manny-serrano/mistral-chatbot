import { NextRequest, NextResponse } from 'next/server'
import neo4jService from '@/lib/neo4j-service'

// Store active status subscriptions
const activeSubscriptions = new Map<string, ReadableStreamDefaultController>()

function getUserFromSession(request: NextRequest): { netId: string; role: string } | null {
  try {
    const sessionCookie = request.cookies.get('duke-sso-session')
    if (!sessionCookie) {
      // Development mode fallback
      if (process.env.NODE_ENV === 'development') {
        console.log('Development mode: Using fallback authentication in status endpoint');
        return { netId: 'testuser', role: 'faculty' };
      }
      return null;
    }
    
    const sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString())
    if (Date.now() > sessionData.expires) {
      // Development mode fallback even for expired sessions
      if (process.env.NODE_ENV === 'development') {
        console.log('Development mode: Using fallback authentication for expired session in status endpoint');
        return { netId: 'testuser', role: 'faculty' };
      }
      return null;
    }
    
    const user = sessionData.user
    const netId = user.eppn ? user.eppn.split('@')[0] : user.netId || 'unknown'
    const role = user.affiliation ? (
      user.affiliation.includes('faculty') ? 'faculty' :
      user.affiliation.includes('staff') ? 'staff' : 'student'
    ) : user.role || 'student'
    
    return { netId, role }
  } catch {
    // Development mode fallback
    if (process.env.NODE_ENV === 'development') {
      console.log('Development mode: Using fallback authentication after error in status endpoint');
      return { netId: 'testuser', role: 'faculty' };
    }
    return null
  }
}

export async function GET(request: NextRequest) {
  const user = getUserFromSession(request)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const url = new URL(request.url)
  const reportId = url.searchParams.get('reportId')
  
  if (!reportId) {
    return NextResponse.json({ error: 'Report ID required' }, { status: 400 })
  }

  // Create Server-Sent Events stream
  const stream = new ReadableStream({
    start(controller) {
      // Store controller for this subscription
      const subscriptionId = `${user.netId}_${reportId}_${Date.now()}`
      activeSubscriptions.set(subscriptionId, controller)
      
      // Send initial status
      controller.enqueue(`data: ${JSON.stringify({
        type: 'status',
        reportId,
        status: 'checking',
        timestamp: new Date().toISOString()
      })}\n\n`)
      
      // Poll for status updates
      const checkStatus = async () => {
        try {
          const allowAdmin = user.role === 'faculty' || user.role === 'staff'
          const report = await neo4jService.getReport(reportId, user.netId, allowAdmin)
          
          if (report) {
            const statusUpdate = {
              type: 'status',
              reportId,
              status: report.status.toLowerCase(),
              timestamp: new Date().toISOString(),
              metadata: {
                name: report.name,
                riskLevel: report.riskLevel,
                threatCount: report.threatCount,
                criticalIssues: report.criticalIssues
              }
            }
            
            controller.enqueue(`data: ${JSON.stringify(statusUpdate)}\n\n`)
            
            // If report is completed or failed, stop polling
            if (report.status === 'PUBLISHED' || report.status === 'FAILED') {
              controller.enqueue(`data: ${JSON.stringify({
                type: 'complete',
                reportId,
                status: report.status.toLowerCase(),
                timestamp: new Date().toISOString()
              })}\n\n`)
              
              // Clean up subscription
              activeSubscriptions.delete(subscriptionId)
              controller.close()
              return
            }
          } else {
            // Check if report is still generating (not in Neo4j yet)
            controller.enqueue(`data: ${JSON.stringify({
              type: 'status',
              reportId,
              status: 'generating',
              timestamp: new Date().toISOString()
            })}\n\n`)
          }
          
          // Continue polling if still active
          if (activeSubscriptions.has(subscriptionId)) {
            setTimeout(checkStatus, 2000) // Check every 2 seconds
          }
        } catch (error) {
          console.error('Error checking report status:', error)
          controller.enqueue(`data: ${JSON.stringify({
            type: 'error',
            reportId,
            error: 'Failed to check status',
            timestamp: new Date().toISOString()
          })}\n\n`)
        }
      }
      
      // Start status checking
      setTimeout(checkStatus, 1000) // Initial delay of 1 second
      
      // Cleanup after 5 minutes
      setTimeout(() => {
        if (activeSubscriptions.has(subscriptionId)) {
          activeSubscriptions.delete(subscriptionId)
          controller.close()
        }
      }, 300000) // 5 minutes
    },
    
    cancel() {
      // Clean up on client disconnect
      for (const [id, controller] of activeSubscriptions.entries()) {
        if (controller === this) {
          activeSubscriptions.delete(id)
          break
        }
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

// Endpoint to notify all subscribers about report updates
export async function POST(request: NextRequest) {
  try {
    const { reportId, status, metadata } = await request.json()
    
    if (!reportId || !status) {
      return NextResponse.json({ error: 'Report ID and status required' }, { status: 400 })
    }
    
    // Notify all active subscribers about this report
    const notification = {
      type: 'update',
      reportId,
      status,
      timestamp: new Date().toISOString(),
      metadata
    }
    
    let notifiedCount = 0
    for (const [subscriptionId, controller] of activeSubscriptions.entries()) {
      if (subscriptionId.includes(reportId)) {
        try {
          controller.enqueue(`data: ${JSON.stringify(notification)}\n\n`)
          notifiedCount++
        } catch (error) {
          console.error('Error notifying subscriber:', error)
          // Remove invalid subscription
          activeSubscriptions.delete(subscriptionId)
        }
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      notified: notifiedCount,
      activeSubscriptions: activeSubscriptions.size
    })
  } catch (error) {
    console.error('Error in status notification:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 