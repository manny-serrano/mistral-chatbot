import { NextRequest, NextResponse } from 'next/server'

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const metric = searchParams.get('metric') || 'alerts'
    const period = searchParams.get('period') || '24h'
    const granularity = searchParams.get('granularity') || '1h'
    const sourceIp = searchParams.get('sourceIp')
    const destIp = searchParams.get('destIp')
    
    // Validate parameters
    const validMetrics = ['bandwidth', 'flows', 'alerts', 'threats']
    const validPeriods = ['24h', '7d', '30d']
    const validGranularities = ['30m', '1h', '6h', '1d']
    
    if (!validMetrics.includes(metric)) {
      return NextResponse.json({
        data: [],
        error: `Invalid metric. Must be one of: ${validMetrics.join(', ')}`,
        success: false,
        timestamp: new Date().toISOString()
      }, { status: 400 })
    }
    
    if (!validPeriods.includes(period)) {
      return NextResponse.json({
        data: [],
        error: `Invalid period. Must be one of: ${validPeriods.join(', ')}`,
        success: false,
        timestamp: new Date().toISOString()
      }, { status: 400 })
    }
    
    if (!validGranularities.includes(granularity)) {
      return NextResponse.json({
        data: [],
        error: `Invalid granularity. Must be one of: ${validGranularities.join(', ')}`,
        success: false,
        timestamp: new Date().toISOString()
      }, { status: 400 })
    }
    
    // Build backend URL with parameters
    let backendUrl = `${API_BASE_URL}/visualization/time-series?metric=${metric}&period=${period}&granularity=${granularity}`
    if (sourceIp) {
      backendUrl += `&source_ip=${encodeURIComponent(sourceIp)}`
    }
    if (destIp) {
      backendUrl += `&dest_ip=${encodeURIComponent(destIp)}`
    }
    
    console.log('Proxying request to backend:', backendUrl)
    
    // Make request to FastAPI backend
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Parse response
    let errorData = null
    try {
      errorData = await response.json()
    } catch (parseError) {
      console.error('Failed to parse response:', parseError)
      return NextResponse.json({
        data: [],
        error: 'Failed to parse server response',
        success: false,
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }

    // Handle non-200 responses
    if (!response.ok) {
      const errorMessage = errorData?.detail || 
                         errorData?.error || 
                         `Backend API error: ${response.status}`
      
      // Map backend error codes to appropriate messages
      let statusCode = response.status
      let userMessage = errorMessage
      
      switch (response.status) {
        case 503:
          userMessage = 'Database connection failed. Please try again later.'
          break
        case 504:
          userMessage = 'Request timed out. Please try with a shorter time period.'
          break
        case 400:
          userMessage = `Invalid request: ${errorMessage}`
          break
        default:
          statusCode = 500
          userMessage = 'An unexpected error occurred while fetching data.'
      }
      
      return NextResponse.json({
        data: [],
        metric,
        period,
        granularity,
        total_points: 0,
        success: false,
        error: userMessage,
        timestamp: new Date().toISOString()
      }, { status: statusCode })
    }

    // Validate response data structure
    if (!Array.isArray(errorData.data)) {
      console.error('Invalid response format:', errorData)
      return NextResponse.json({
        data: [],
        error: 'Invalid response format from server',
        success: false,
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }
    
    return NextResponse.json({
      ...errorData,
      success: true,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Error proxying time-series request:', error)
    
    return NextResponse.json({
      data: [],
      metric: searchParams?.get('metric') || 'alerts',
      period: searchParams?.get('period') || '24h',
      granularity: searchParams?.get('granularity') || '1h',
      total_points: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch time-series data',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
} 