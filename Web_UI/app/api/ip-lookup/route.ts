import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ip = searchParams.get('ip')
    const detailed = searchParams.get('detailed') === 'true'

    if (!ip) {
      return NextResponse.json({ 
        success: false, 
        message: 'IP address is required' 
      }, { status: 400 })
    }

    // Validate IP format
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/
    
    if (!ipv4Regex.test(ip) && !ipv6Regex.test(ip)) {
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid IP address format' 
      }, { status: 400 })
    }

    // Fetch from IPWHOIS.io API
    const response = await fetch(`http://ipwho.is/${ip}`, {
      headers: {
        'User-Agent': 'CyberSense-AI/1.0'
      }
    })

    if (!response.ok) {
      throw new Error(`IPWHOIS API error: ${response.status}`)
    }

    const data = await response.json()

    if (!data.success) {
      return NextResponse.json({ 
        success: false, 
        message: data.message || 'IP location lookup failed' 
      }, { status: 404 })
    }

    // Return detailed or basic data based on request
    const response_data = {
      success: true,
      ip: data.ip,
      country: data.country,
      country_code: data.country_code,
      country_capital: data.country_capital,
      country_phone: data.country_phone,
      continent: data.continent,
      continent_code: data.continent_code,
      city: data.city,
      region: data.region,
      latitude: data.latitude,
      longitude: data.longitude,
      asn: data.asn,
      org: data.org,
      isp: data.isp,
      timezone: typeof data.timezone === 'string' ? data.timezone : data.timezone?.id || data.timezone?.utc,
      currency: data.currency,
      languages: data.languages,
      connection: {
        isp: data.connection?.isp,
        org: data.connection?.org,
        asn: data.connection?.asn,
        domain: data.connection?.domain
      },
      security: {
        anonymous: data.security?.anonymous || false,
        proxy: data.security?.proxy || false,
        vpn: data.security?.vpn || false,
        tor: data.security?.tor || false,
        hosting: data.security?.hosting || false,
        bogon: data.security?.bogon || false
      }
    }

    // If detailed is false, return only essential fields
    if (!detailed) {
      return NextResponse.json({
        success: response_data.success,
        ip: response_data.ip,
        country: response_data.country,
        city: response_data.city,
        region: response_data.region,
        latitude: response_data.latitude,
        longitude: response_data.longitude,
        timezone: response_data.timezone,
        connection: response_data.connection,
        security: response_data.security
      })
    }

    // Return all detailed information
    return NextResponse.json(response_data)

  } catch (error) {
    console.error('IP lookup error:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to lookup IP address' 
    }, { status: 500 })
  }
} 