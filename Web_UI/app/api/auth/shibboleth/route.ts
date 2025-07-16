import { NextRequest, NextResponse } from 'next/server'

interface DukeUser {
  eppn: string // NetID (e.g., "jsmith@duke.edu" or just "jsmith")
  affiliation: string // Role (e.g., "faculty@duke.edu", "student@duke.edu")
  displayName: string
  givenName: string
  surname: string
  mail: string
  dukeID: string
}

export async function GET(req: NextRequest) {
  try {
    // In production, Shibboleth passes user attributes via HTTP headers
    const headers = req.headers
    
    // Extract Duke user attributes from Shibboleth headers
    // Try multiple header formats that Shibboleth might use
    const extractedData: DukeUser = {
      // Try various header formats for EPPN
      eppn: headers.get('http_eppn') || 
            headers.get('HTTP_EPPN') ||
            headers.get('eppn') || 
            headers.get('HTTP-EPPN') ||
            headers.get('shib-eppn') || 
            headers.get('remote_user') ||
            headers.get('HTTP_REMOTE_USER') ||
            headers.get('REMOTE_USER') || 
            '', 
      affiliation: headers.get('http_affiliation') ||
                   headers.get('HTTP_AFFILIATION') ||
                   headers.get('affiliation') || 
                   headers.get('shib-edupersonscopedaffiliation') || 
                   '',
      displayName: headers.get('http_displayname') ||
                   headers.get('HTTP_DISPLAYNAME') ||
                   headers.get('displayname') || 
                   headers.get('shib-displayname') || 
                   headers.get('cn') || 
                   '',
      givenName: headers.get('http_givenname') ||
                 headers.get('HTTP_GIVENNAME') ||
                 headers.get('givenname') || 
                 headers.get('shib-givenname') || 
                 '',
      surname: headers.get('http_surname') ||
               headers.get('HTTP_SURNAME') ||
               headers.get('surname') || 
               headers.get('shib-surname') || 
               headers.get('sn') || 
               '',
      mail: headers.get('http_mail') ||
            headers.get('HTTP_MAIL') ||
            headers.get('mail') || 
            headers.get('shib-mail') || 
            headers.get('email') || 
            '',
      dukeID: headers.get('http_dukeid') ||
              headers.get('HTTP_DUKEID') ||
              headers.get('dukeid') || 
              headers.get('shib-dukeid') || 
              ''
    }
    
    // Debug log all headers to see what we're receiving
    console.log('=== SHIBBOLETH DEBUG ===')
    console.log('Request URL:', req.url)
    console.log('Raw extracted data:', extractedData)
    console.log('All headers:')
    req.headers.forEach((value, key) => {
      console.log(`  ${key}: ${value}`)
    })
    console.log('======================')
    
    // If debug parameter is present, return debug info instead of processing
    const { searchParams } = new URL(req.url)
    if (searchParams.get('debug') === 'true') {
      const allHeaders: Record<string, string> = {}
      req.headers.forEach((value, key) => {
        allHeaders[key] = value
      })
      
      return NextResponse.json({
        message: 'Shibboleth Debug Information',
        timestamp: new Date().toISOString(),
        extractedUser: extractedData,
        allHeaders: allHeaders,
        specificHeaders: {
          eppn: headers.get('eppn'),
          http_eppn: headers.get('http_eppn'),
          HTTP_EPPN: headers.get('HTTP_EPPN'),
          remote_user: headers.get('remote_user'),
          HTTP_REMOTE_USER: headers.get('HTTP_REMOTE_USER'),
          REMOTE_USER: headers.get('REMOTE_USER'),
          'shib-eppn': headers.get('shib-eppn')
        }
      })
    }
    
    // Handle the case where we don't have proper eppn
    if (!extractedData.eppn) {
      console.error('Missing required Duke NetID (eppn)')
      console.error('Available headers:', Array.from(headers.keys()))
      console.error('Shibboleth headers found:')
      
      // Log all possible Shibboleth headers for debugging
      const shibHeadersFound: string[] = []
      headers.forEach((value, key) => {
        if (key.toLowerCase().includes('shib') || 
            key.toLowerCase().includes('remote') ||
            key.toLowerCase().includes('eppn') ||
            key.toLowerCase().includes('saml') ||
            key.toLowerCase().includes('http_')) {
          console.error(`  ${key}: ${value}`)
          shibHeadersFound.push(`${key}: ${value}`)
        }
      })
      
      // Return error response with debugging information
      return NextResponse.json({
        error: "Missing required Duke NetID (eppn)",
        message: "No EPPN attribute found in Shibboleth headers. This usually means the user authentication was not completed properly or the Service Provider is not configured correctly with Duke's Identity Provider.",
        debug: {
          expectedHeaders: ['eppn', 'http_eppn', 'HTTP_EPPN', 'remote_user', 'REMOTE_USER'],
          shibbolethHeadersFound: shibHeadersFound,
          allHeaders: Array.from(headers.keys()),
          troubleshooting: [
            "1. Verify that your Service Provider is registered with Duke IdP",
            "2. Check that eduPersonPrincipalName attribute is requested in SP registration",
            "3. Ensure Apache Location directives require authentication",
            "4. Verify attribute-map.xml correctly maps eppn attribute",
            "5. Check Shibboleth logs: /var/log/shibboleth/shibd.log",
            "6. Check Apache headers with 'RequestHeader set' directives"
          ]
        }
      }, { status: 400 })
    }
    
    // Normalize EPPN - handle both formats: "netid@duke.edu" and just "netid"
    let netId = extractedData.eppn
    
    // If EPPN contains @duke.edu, extract just the NetID part
    if (netId.includes('@')) {
      const parts = netId.split('@')
      netId = parts[0] // Take the part before @
      console.log(`Normalized EPPN from "${extractedData.eppn}" to NetID: "${netId}"`)
    }
    
    // Create simple user profile without database dependency
    const role = extractedData.affiliation.toLowerCase().includes('faculty') ? 'faculty' :
                 extractedData.affiliation.toLowerCase().includes('staff') ? 'staff' :
                 extractedData.affiliation.toLowerCase().includes('student') ? 'student' : 'other'
    
    const userProfile = {
      id: `duke_${netId}`,
      netId,
      email: extractedData.mail || `${netId}@duke.edu`,
      firstName: extractedData.givenName || 'Unknown',
      lastName: extractedData.surname || 'User',
      displayName: extractedData.displayName || `${extractedData.givenName || 'Unknown'} ${extractedData.surname || 'User'}`,
      role,
      lastLogin: new Date().toISOString(),
      createdAt: new Date().toISOString()
    }
    
    // Simple permissions based on role
    const permissions = ['view_dashboard']
    if (role === 'faculty' || role === 'staff') {
      permissions.push('admin_access', 'view_reports')
    }
    
    console.log('User profile created:', userProfile)
    
    // Create session token with user profile data
    const sessionToken = Buffer.from(JSON.stringify({
      user: userProfile,
      permissions: permissions,
      timestamp: Date.now(),
      expires: Date.now() + (8 * 60 * 60 * 1000) // 8 hours
    })).toString('base64')
    
    // Get redirect target
    const target = searchParams.get('target') || '/dashboard'
    
    // Set secure session cookie and redirect
    const response = NextResponse.redirect(new URL(target, req.url))
    
    // Fix: Don't specify domain, let it default to current domain
    response.cookies.set('duke-sso-session', sessionToken, {
      httpOnly: true,
      secure: true, // Always secure in production
      sameSite: 'lax',
      maxAge: 8 * 60 * 60, // 8 hours
      path: '/' // Ensure cookie is available for entire site
      // Removed domain specification to use current domain
    })
    
    console.log('Session cookie set, redirecting to:', target)
    return response
    
  } catch (error) {
    console.error('Shibboleth authentication error:', error)
    return NextResponse.redirect(new URL('/login?error=shibboleth_failed', req.url))
  }
} 