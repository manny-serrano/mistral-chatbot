import { NextRequest, NextResponse } from 'next/server'

interface IPWhoisResponse {
  ip: string
  success: boolean
  type: string
  continent: string
  continent_code: string
  country: string
  country_code: string
  country_capital: string
  country_phone: string
  region: string
  city: string
  latitude: number
  longitude: number
  asn: string
  org: string
  isp: string
  timezone: string
  timezone_name: string
  currency: string
  currency_code: string
  currency_symbol: string
  security?: {
    anonymous: boolean
    proxy: boolean
    vpn: boolean
    tor: boolean
    hosting: boolean
  }
}

// Cache for IP geolocation data to avoid repeated API calls
const geoCache = new Map<string, IPWhoisResponse>()
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

export async function POST(request: NextRequest) {
  try {
    const { ips } = await request.json()
    
    if (!ips || !Array.isArray(ips)) {
      return NextResponse.json({ error: 'Invalid IPs array provided' }, { status: 400 })
    }

    const results: Array<{
      ip: string
      country: string
      city: string
      latitude: number
      longitude: number
      region?: string
      timezone?: string
      isp?: string
      org?: string
      security?: any
      success: boolean
      error?: string
    }> = []

    // Process IPs in batches to respect rate limits
    for (const ip of ips) {
      try {
        // Skip private/internal IPs
        if (isPrivateIP(ip)) {
          results.push({
            ip,
            country: 'Private Network',
            city: 'Internal',
            latitude: 0,
            longitude: 0,
            success: true
          })
          continue
        }

        // Check cache first
        const cacheKey = `geo_${ip}`
        const cachedData = geoCache.get(cacheKey)
        
        if (cachedData && Date.now() - (cachedData as any).cachedAt < CACHE_DURATION) {
          results.push({
            ip: cachedData.ip,
            country: cachedData.country,
            city: cachedData.city,
            latitude: cachedData.latitude,
            longitude: cachedData.longitude,
            region: cachedData.region,
            timezone: cachedData.timezone,
            isp: cachedData.isp,
            org: cachedData.org,
            security: cachedData.security,
            success: true
          })
          continue
        }

        // Fetch from IPWHOIS.io API
        const geoResponse = await fetch(`http://ipwho.is/${ip}?fields=ip,success,country,region,city,latitude,longitude,timezone,isp,org,security`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'CyberSense-Security-Platform/1.0'
          },
          // Add timeout
          signal: AbortSignal.timeout(5000)
        })

        if (!geoResponse.ok) {
          throw new Error(`Geolocation API error: ${geoResponse.status}`)
        }

        const geoData: IPWhoisResponse = await geoResponse.json()

        if (geoData.success) {
          // Cache the result
          geoCache.set(cacheKey, { ...geoData, cachedAt: Date.now() } as any)

          results.push({
            ip: geoData.ip,
            country: geoData.country || 'Unknown',
            city: geoData.city || 'Unknown',
            latitude: geoData.latitude || 0,
            longitude: geoData.longitude || 0,
            region: geoData.region,
            timezone: geoData.timezone,
            isp: geoData.isp,
            org: geoData.org,
            security: geoData.security,
            success: true
          })
        } else {
          // Fallback to mock data if API fails
          const fallbackLocation = getFallbackLocation(ip)
          results.push({
            ip,
            ...fallbackLocation,
            success: false,
            error: 'Geolocation API failed, using fallback'
          })
        }

        // Rate limiting - small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (error) {
        console.error(`Error getting geolocation for IP ${ip}:`, error)
        
        // Fallback to mock data
        const fallbackLocation = getFallbackLocation(ip)
        results.push({
          ip,
          ...fallbackLocation,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({ results })
  } catch (error) {
    console.error('Error in geolocation API:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 })
  }
}

function isPrivateIP(ip: string): boolean {
  // Check for private IP ranges
  const privateRanges = [
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^127\./,
    /^169\.254\./,
    /^::1$/,
    /^fc00:/,
    /^fe80:/
  ]
  
  return privateRanges.some(range => range.test(ip))
}

function getFallbackLocation(ip: string): { country: string; city: string; latitude: number; longitude: number } {
  // Enhanced fallback mapping based on IP ranges
  const ipRanges: Record<string, any> = {
    // Major cloud providers and hosting
    "8.8.": { country: "United States", city: "Mountain View", latitude: 37.3860517, longitude: -122.0838511 },
    "1.1.": { country: "United States", city: "San Francisco", latitude: 37.7749, longitude: -122.4194 },
    "208.67.": { country: "United States", city: "San Francisco", latitude: 37.7749, longitude: -122.4194 },
    
    // Geographic IP ranges (examples)
    "203.": { country: "Australia", city: "Sydney", latitude: -33.8688, longitude: 151.2093 },
    "202.": { country: "Japan", city: "Tokyo", latitude: 35.6762, longitude: 139.6503 },
    "61.": { country: "China", city: "Beijing", latitude: 39.9042, longitude: 116.4074 },
    "185.": { country: "Germany", city: "Berlin", latitude: 52.5200, longitude: 13.4050 },
    "151.": { country: "Brazil", city: "São Paulo", latitude: -23.5505, longitude: -46.6333 },
    "103.": { country: "Singapore", city: "Singapore", latitude: 1.3521, longitude: 103.8198 },
    "46.": { country: "France", city: "Paris", latitude: 48.8566, longitude: 2.3522 },
    "94.": { country: "United Kingdom", city: "London", latitude: 51.5074, longitude: -0.1278 },
    
    // Default regions by first octet
    "1": { country: "United States", city: "New York", latitude: 40.7128, longitude: -74.0060 },
    "2": { country: "Europe", city: "Amsterdam", latitude: 52.3676, longitude: 4.9041 },
    "41": { country: "South Africa", city: "Cape Town", latitude: -33.9249, longitude: 18.4241 },
    "58": { country: "Brazil", city: "São Paulo", latitude: -23.5505, longitude: -46.6333 },
    "101": { country: "Australia", city: "Melbourne", latitude: -37.8136, longitude: 144.9631 },
    "116": { country: "South Korea", city: "Seoul", latitude: 37.5665, longitude: 126.9780 },
    "125": { country: "Japan", city: "Tokyo", latitude: 35.6762, longitude: 139.6503 },
    "180": { country: "India", city: "Mumbai", latitude: 19.0760, longitude: 72.8777 },
    "200": { country: "Mexico", city: "Mexico City", latitude: 19.4326, longitude: -99.1332 }
  }
  
  // Try to match IP ranges
  for (const prefix in ipRanges) {
    if (ip.startsWith(prefix)) {
      return ipRanges[prefix]
    }
  }
  
  // Fallback based on first octet
  const firstOctet = ip.split('.')[0]
  const firstOctetNum = parseInt(firstOctet)
  
  if (firstOctetNum >= 1 && firstOctetNum <= 126) {
    return { country: "United States", city: "Unknown", latitude: 39.8283, longitude: -98.5795 }
  } else if (firstOctetNum >= 128 && firstOctetNum <= 191) {
    return { country: "Europe", city: "Unknown", latitude: 54.526, longitude: 15.2551 }
  } else if (firstOctetNum >= 192 && firstOctetNum <= 223) {
    return { country: "Asia", city: "Unknown", latitude: 34.0479, longitude: 100.6197 }
  } else {
    return { country: "Unknown", city: "Unknown", latitude: 0, longitude: 0 }
  }
} 