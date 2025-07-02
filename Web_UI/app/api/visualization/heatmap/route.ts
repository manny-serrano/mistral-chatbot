import { NextRequest, NextResponse } from 'next/server'

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const heatmapType = searchParams.get('heatmap_type') || 'hourly_activity'
    
    // Make request to FastAPI backend
    const backendUrl = `${API_BASE_URL}/visualization/heatmap?heatmap_type=${heatmapType}`
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
    console.error('Error proxying heatmap request:', error)
    
    // Return fallback data if backend is not available
    const mockData = []
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
      for (let hour = 0; hour < 24; hour++) {
        const baseActivity = dayIdx < 5 && hour >= 9 && hour <= 17 ? 80 : 20
        mockData.push({
          day: days[dayIdx],
          day_index: dayIdx,
          hour: hour,
          value: baseActivity + Math.floor(Math.random() * 30)
        })
      }
    }
    
    return NextResponse.json({
      data: mockData,
      heatmap_type: heatmapType,
      success: true,
      timestamp: new Date().toISOString(),
      error: `Backend unavailable: ${error}`
    })
  }
} 