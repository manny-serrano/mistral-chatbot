import { NextRequest, NextResponse } from 'next/server'

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000'

export async function GET(request: NextRequest) {
  try {
    // Extract query parameters from the request
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit') || '100'
    const ipAddress = searchParams.get('ip_address')
    
    // Build backend URL with parameters
    let backendUrl = `${API_BASE_URL}/network/graph?limit=${limit}`
    if (ipAddress) {
      backendUrl += `&ip_address=${encodeURIComponent(ipAddress)}`
    }
    
    console.log('Proxying request to backend:', backendUrl)
    
    // Make request to FastAPI backend
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`)
    }

    const data = await response.json()
    console.log('Backend response:', data)
    
    // Forward the backend response directly without fallback data
    // The backend already handles validation and appropriate messaging
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('Error proxying network graph request:', error)
    
    // Return error response instead of fallback data
    return NextResponse.json({
      nodes: [],
      links: [],
      statistics: {},
      timestamp: new Date().toISOString(),
      success: false,
      error: `Failed to fetch network data: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 })
  }
} 