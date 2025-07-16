import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    // Simple health check - could be expanded to check database connections, etc.
    return NextResponse.json(
      { 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        service: 'frontend'
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'error', 
        timestamp: new Date().toISOString(),
        service: 'frontend',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Support HEAD requests for load balancer health checks
export async function HEAD(request: NextRequest) {
  try {
    return new NextResponse(null, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error) {
    return new NextResponse(null, { status: 500 });
  }
} 