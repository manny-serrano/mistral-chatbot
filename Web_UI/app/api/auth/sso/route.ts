import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    // For development, redirect directly to mock SSO
    if (process.env.NODE_ENV === 'development') {
      // Use the request URL to get the correct host and protocol
      const baseUrl = new URL(req.url).origin
      const mockSsoUrl = new URL('/api/auth/sso/mock', baseUrl)
      mockSsoUrl.searchParams.set('target', '/dashboard')
      return NextResponse.redirect(mockSsoUrl.toString())
    }
    
    // Production SSO configuration
    const entityId = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin
    
    // Build the SSO redirect URL for production
    // This redirects to your own Shibboleth.sso endpoint which handles Duke SSO
    const ssoUrl = new URL('/Shibboleth.sso/Login', entityId)
    ssoUrl.searchParams.set('target', '/api/auth/shibboleth?target=/dashboard')
    
    return NextResponse.redirect(ssoUrl.toString())
    
  } catch (error) {
    console.error('SSO redirect error:', error)
    return NextResponse.json(
      { error: 'SSO authentication failed' }, 
      { status: 500 }
    )
  }
} 