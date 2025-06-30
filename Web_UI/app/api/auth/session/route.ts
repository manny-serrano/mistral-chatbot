import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('duke-sso-session')
    
    if (!sessionCookie) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }
    
    // Decode and validate session
    const sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString())
    
    // Check if session is expired
    if (Date.now() > sessionData.expires) {
      // Clear expired session
      const response = NextResponse.json({ authenticated: false }, { status: 401 })
      response.cookies.delete('duke-sso-session')
      return response
    }
    
    return NextResponse.json({
      authenticated: true,
      user: sessionData.user
    })
    
  } catch (error) {
    console.error('Session validation error:', error)
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // Logout - clear session
    const response = NextResponse.json({ success: true })
    response.cookies.delete('duke-sso-session')
    
    return response
    
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 })
  }
} 