import { NextRequest, NextResponse } from 'next/server'

interface DukeUser {
  eppn: string // NetID (e.g., "jsmith@duke.edu" or just "jsmith")
  affiliation: string // Role (e.g., "faculty@duke.edu", "student@duke.edu")
  displayName: string
  givenName: string
  sn: string // surname (official Duke attribute name)
  mail: string
  duDukeID: string // Official Duke unique ID attribute name
  uid: string // unscoped NetID
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
                   headers.get('HTTP_CN') ||
                   '', 
      givenName: headers.get('http_givenname') ||
                 headers.get('HTTP_GIVENNAME') ||
                 headers.get('givenname') || 
                 headers.get('shib-givenname') || 
                 '',
      sn: headers.get('http_sn') ||
          headers.get('HTTP_SN') ||
          headers.get('sn') || 
          headers.get('shib-sn') ||
          headers.get('http_surname') ||
          headers.get('HTTP_SURNAME') ||
          headers.get('surname') || 
          headers.get('shib-surname') || 
          '',
      mail: headers.get('http_mail') ||
            headers.get('HTTP_MAIL') ||
            headers.get('mail') || 
            headers.get('shib-mail') || 
            headers.get('email') || 
            '',
      duDukeID: headers.get('http_dudukeid') ||
                headers.get('HTTP_DUDUKEID') ||
                headers.get('dudukeid') || 
                headers.get('shib-dudukeid') ||
                headers.get('http_dukeid') ||
                headers.get('HTTP_DUKEID') ||
                headers.get('dukeid') || 
                headers.get('shib-dukeid') || 
                '',
      uid: headers.get('http_uid') ||
           headers.get('HTTP_UID') ||
           headers.get('uid') || 
           headers.get('shib-uid') || 
           ''
    }

    // Get the redirect parameter
    const { searchParams } = new URL(req.url)
    
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
            "4. Verify attribute-map.xml correctly maps eppn attribute with ScopedAttributeDecoder",
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
      lastName: extractedData.sn || 'User',
      displayName: extractedData.displayName || `${extractedData.givenName || 'Unknown'} ${extractedData.sn || 'User'}`,
      role,
      dukeID: extractedData.duDukeID,
      uid: extractedData.uid || netId,
      lastLogin: new Date().toISOString(),
      createdAt: new Date().toISOString()
    }
    
    // Simple permissions based on role
    const permissions = ['view_dashboard']
    if (role === 'faculty' || role === 'staff') {
      permissions.push('admin_access', 'view_reports')
    }
    
    console.log('Duke SSO User profile created:', userProfile)
    
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
    
    response.cookies.set('duke-sso-session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 // 8 hours in seconds
    })
    
    return response
    
  } catch (error) {
    console.error('Shibboleth SSO error:', error)
    return NextResponse.redirect(new URL('/login?error=sso_failed', req.url).toString())
  }
} 