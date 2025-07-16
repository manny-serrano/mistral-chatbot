import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Define protected routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/alerts',
  '/reports',
  '/settings',
  '/profile',
  '/security',
  '/notifications',
  '/data-usage',
  '/api-keys',
  '/help'
]

// Define public routes that don't require authentication
const publicRoutes = [
  '/',
  '/login',
  '/signup',
  '/forgot-password',
  '/about',
  '/api/auth/sso',
  '/api/auth/sso/mock',
  '/api/auth/session'
]

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // Skip middleware for static assets, API routes (except auth), and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/') ||
    pathname.includes('.') || // Static files like CSS, JS, images
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next()
  }

  // Check if the current path is a protected route
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  )
  
  // If it's not a protected route, allow access
  if (!isProtectedRoute) {
    return NextResponse.next()
  }

  // For protected routes, check authentication via session cookie
  const sessionCookie = request.cookies.get('duke-sso-session')
  
  if (!sessionCookie) {
    // No session cookie - redirect directly to SSO authentication
    const ssoUrl = new URL('/api/auth/sso', request.url)
    ssoUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(ssoUrl)
  }

  try {
    // Validate session cookie
    const sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString())
    
    // Check if session is expired
    if (Date.now() > sessionData.expires) {
      // Session expired - redirect to SSO and clear cookie
      const ssoUrl = new URL('/api/auth/sso', request.url)
      ssoUrl.searchParams.set('redirect', pathname)
      const response = NextResponse.redirect(ssoUrl)
      response.cookies.delete('duke-sso-session')
      return response
    }

    // Session is valid - allow access
    return NextResponse.next()
    
  } catch (error) {
    // Invalid session cookie - redirect to SSO and clear cookie
    console.error('Session validation error in middleware:', error)
    const ssoUrl = new URL('/api/auth/sso', request.url)
    ssoUrl.searchParams.set('redirect', pathname)
    const response = NextResponse.redirect(ssoUrl)
    response.cookies.delete('duke-sso-session')
    return response
  }
}

export const config = {
  matcher: [
    // Match all routes except static files and API routes
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*$).*)',
  ],
} 