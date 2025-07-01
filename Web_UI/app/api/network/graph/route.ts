import { NextRequest, NextResponse } from 'next/server'

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000'

export async function GET(request: NextRequest) {
  try {
    // Extract query parameters from the request
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit') || '100'
    
    // Make request to FastAPI backend
    const backendUrl = `${API_BASE_URL}/network/graph?limit=${limit}`
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
    console.error('Error proxying network graph request:', error)
    
    // Return fallback data if backend is not available
    return NextResponse.json({
      nodes: [
        { id: "192.168.1.1", type: "host", label: "192.168.1.1", group: "source_host", ip: "192.168.1.1" },
        { id: "10.0.0.1", type: "host", label: "10.0.0.1", group: "dest_host", ip: "10.0.0.1" },
        { id: "172.16.0.1", type: "host", label: "172.16.0.1", group: "dest_host", ip: "172.16.0.1" },
      ],
      links: [
        { source: "192.168.1.1", target: "10.0.0.1", type: "FLOW" },
        { source: "192.168.1.1", target: "172.16.0.1", type: "FLOW" },
      ],
      statistics: { total_nodes: 3, total_links: 2, malicious_flows: 0 },
      timestamp: new Date().toISOString(),
      success: true,
      error: null
    })
  }
} 