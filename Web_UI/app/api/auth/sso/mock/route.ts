import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const target = searchParams.get('target') || '/dashboard'
    
    // Mock Duke user attributes (in production, these come from Shibboleth)
    const mockUser = {
      eppn: 'testuser@duke.edu', // eduPersonPrincipalName
      affiliation: 'faculty@duke.edu', // eduPersonScopedAffiliation
      displayName: 'Test User',
      givenName: 'Test',
      surname: 'User',
      mail: 'testuser@duke.edu',
      dukeID: '123456789'
    }
    
    // Create a simple session token (in production, use proper JWT or session management)
    const sessionToken = Buffer.from(JSON.stringify({
      user: mockUser,
      timestamp: Date.now(),
      expires: Date.now() + (8 * 60 * 60 * 1000) // 8 hours
    })).toString('base64')
    
    // Set secure cookie
    const response = NextResponse.redirect(new URL(target, req.url).toString())
    
    response.cookies.set('duke-sso-session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 // 8 hours in seconds
    })
    
    return response
    
  } catch (error) {
    console.error('Mock SSO error:', error)
    return NextResponse.redirect(new URL('/login?error=sso_failed', req.url).toString())
  }
} 