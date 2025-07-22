import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    // Get the redirect parameter from the request URL
    const url = new URL(req.url)
    const redirectPath = url.searchParams.get('redirect') || '/dashboard'
    
    // For development, return mock SSO URL for frontend redirect
    if (process.env.NODE_ENV === 'development') {
      const baseUrl = new URL(req.url).origin
      const mockSsoUrl = new URL('/api/auth/sso/mock', baseUrl)
      mockSsoUrl.searchParams.set('target', redirectPath)
      
      return NextResponse.json({
        redirectUrl: mockSsoUrl.toString(),
        environment: 'development'
      })
    }
    
    // Production SSO configuration - return Duke Shibboleth URL for frontend redirect
    const entityId = 'https://levantai.colab.duke.edu'
    
    // Use the registered Shibboleth.sso endpoint with target parameter for post-auth redirect
    const shibbolethUrl = `${entityId}/Shibboleth.sso/Login`
    const targetUrl = `${entityId}/api/auth/shibboleth?target=${encodeURIComponent(redirectPath)}`
    
    // Build the Shibboleth SSO URL using your registered ACS endpoint
    const dukeSSO = new URL(shibbolethUrl)
    dukeSSO.searchParams.set('target', targetUrl)
    
    return NextResponse.json({
      redirectUrl: dukeSSO.toString(),
      environment: 'production'
    })
    
  } catch (error) {
    console.error('SSO redirect error:', error)
    return NextResponse.json(
      { error: 'SSO authentication failed' }, 
      { status: 500 }
    )
  }
} 