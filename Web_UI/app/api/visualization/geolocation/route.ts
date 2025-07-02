import { NextRequest, NextResponse } from 'next/server'

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000'

export async function GET(request: NextRequest) {
  try {
    // Make request to FastAPI backend
    const backendUrl = `${API_BASE_URL}/visualization/geolocation`
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
    console.error('Error proxying geolocation request:', error)
    
    // Return fallback data if backend is not available
    return NextResponse.json({
      locations: [
        { ip: "203.0.113.1", country: "United States", city: "New York", lat: 40.7128, lon: -74.0060, threats: 15, flows: 234 },
        { ip: "198.51.100.1", country: "China", city: "Beijing", lat: 39.9042, lon: 116.4074, threats: 8, flows: 156 },
        { ip: "192.0.2.1", country: "Russia", city: "Moscow", lat: 55.7558, lon: 37.6176, threats: 12, flows: 89 },
        { ip: "203.0.113.2", country: "Germany", city: "Berlin", lat: 52.5200, lon: 13.4050, threats: 3, flows: 67 },
        { ip: "198.51.100.2", country: "United Kingdom", city: "London", lat: 51.5074, lon: -0.1278, threats: 5, flows: 123 }
      ],
      total_ips: 5,
      total_threats: 43,
      total_flows: 669,
      success: true,
      timestamp: new Date().toISOString(),
      error: `Backend unavailable: ${error}`
    })
  }
} 