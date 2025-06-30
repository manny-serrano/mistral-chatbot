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
  const { pathname } = request.nextUrl
  
  // Allow all Next.js internal routes and static files
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.startsWith('/public/') ||
    pathname.includes('favicon.ico') ||
    pathname.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/) ||
    publicRoutes.some(route => pathname.startsWith(route))
  ) {
    return NextResponse.next()
  }
  
  // Check if route is protected
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  
  if (!isProtectedRoute) {
    return NextResponse.next()
  }
  
  // Check for authentication session
  const sessionCookie = request.cookies.get('duke-sso-session')
  
  if (!sessionCookie) {
    // Redirect to login if not authenticated
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }
  
  try {
    // Validate session
    const sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString())
    
    // Check if session is expired
    if (Date.now() > sessionData.expires) {
      // Clear expired session and redirect to login
      const response = NextResponse.redirect(new URL('/login?expired=true', request.url))
      response.cookies.delete('duke-sso-session')
      return response
    }
    
    // Session is valid, allow access
    return NextResponse.next()
    
  } catch (error) {
    // Invalid session, redirect to login
    const response = NextResponse.redirect(new URL('/login?error=invalid_session', request.url))
    response.cookies.delete('duke-sso-session')
    return response
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
} 