import { NextRequest, NextResponse } from 'next/server'
import { UserManager, DukeUser } from '@/lib/user-management'

export async function GET(req: NextRequest) {
  try {
    // In production, Shibboleth passes user attributes via HTTP headers
    const headers = req.headers
    
    // Extract Duke user attributes from Shibboleth headers
    const shibbolethUser: DukeUser = {
      eppn: headers.get('eppn') || headers.get('HTTP_EPPN') || '', // eduPersonPrincipalName
      affiliation: headers.get('affiliation') || headers.get('HTTP_AFFILIATION') || '', // eduPersonScopedAffiliation
      displayName: headers.get('displayname') || headers.get('HTTP_DISPLAYNAME') || '',
      givenName: headers.get('givenname') || headers.get('HTTP_GIVENNAME') || '',
      surname: headers.get('surname') || headers.get('HTTP_SURNAME') || '',
      mail: headers.get('mail') || headers.get('HTTP_MAIL') || '',
      dukeID: headers.get('dukeid') || headers.get('HTTP_DUKEID') || ''
    }
    
    // Validate required attributes
    if (!shibbolethUser.eppn) {
      return NextResponse.json(
        { error: 'Missing required Duke NetID (eppn)' }, 
        { status: 400 }
      )
    }
    
    // Create or update user profile in your system
    const userProfile = await UserManager.createOrUpdateUser(shibbolethUser)
    
    // Log the login activity
    await UserManager.logUserActivity(userProfile.netId, 'login', {
      method: 'duke_sso',
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    })
    
    // Create session token with user profile data
    const sessionToken = Buffer.from(JSON.stringify({
      user: userProfile,
      permissions: UserManager.getUserPermissions(userProfile),
      timestamp: Date.now(),
      expires: Date.now() + (8 * 60 * 60 * 1000) // 8 hours
    })).toString('base64')
    
    // Get redirect target
    const { searchParams } = new URL(req.url)
    const target = searchParams.get('target') || '/dashboard'
    
    // Set secure session cookie and redirect
    const response = NextResponse.redirect(new URL(target, req.url))
    
    response.cookies.set('duke-sso-session', sessionToken, {
      httpOnly: true,
      secure: true, // Always secure in production
      sameSite: 'lax',
      maxAge: 8 * 60 * 60, // 8 hours
      domain: new URL(req.url).hostname
    })
    
    return response
    
  } catch (error) {
    console.error('Shibboleth authentication error:', error)
    return NextResponse.redirect(new URL('/login?error=shibboleth_failed', req.url))
  }
} 