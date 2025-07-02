import { NextRequest, NextResponse } from 'next/server'

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const metric = searchParams.get('metric') || 'alerts'
    const period = searchParams.get('period') || '24h'
    const granularity = searchParams.get('granularity') || '1h'
    
    // Make request to FastAPI backend
    const backendUrl = `${API_BASE_URL}/visualization/time-series?metric=${metric}&period=${period}&granularity=${granularity}`
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
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error proxying time-series request:', error)
    
    // Return fallback data if backend is not available
    return NextResponse.json({
      data: [
        { timestamp: new Date(Date.now() - 3600000).toISOString(), value: 25, metric: "alerts" },
        { timestamp: new Date(Date.now() - 7200000).toISOString(), value: 18, metric: "alerts" },
        { timestamp: new Date(Date.now() - 10800000).toISOString(), value: 32, metric: "alerts" },
        { timestamp: new Date().toISOString(), value: 41, metric: "alerts" }
      ],
      metric: "alerts",
      period: "24h", 
      granularity: "1h",
      total_points: 4,
      success: true,
      timestamp: new Date().toISOString(),
      error: `Backend unavailable: ${error}`
    })
  }
} 