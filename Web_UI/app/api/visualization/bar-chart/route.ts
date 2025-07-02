import { NextRequest, NextResponse } from 'next/server'

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const chartType = searchParams.get('chart_type') || 'protocols'
    
    // Make request to FastAPI backend
    const backendUrl = `${API_BASE_URL}/visualization/bar-chart?chart_type=${chartType}`
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
    console.error('Error proxying bar chart request:', error)
    
    // Return fallback data if backend is not available
    return NextResponse.json({
      data: [
        { name: "TCP", value: 2847, percentage: 68.5 },
        { name: "UDP", value: 1044, percentage: 25.1 },
        { name: "ICMP", value: 234, percentage: 5.6 },
        { name: "GRE", value: 32, percentage: 0.8 }
      ],
      chart_type: chartType,
      total: 4157,
      success: true,
      timestamp: new Date().toISOString(),
      error: `Backend unavailable: ${error}`
    })
  }
} 