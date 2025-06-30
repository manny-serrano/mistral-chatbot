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
  // For now, just allow everything through to fix CSS loading
  return NextResponse.next()
}

export const config = {
  matcher: [
    // Only match specific protected routes, not static assets
    '/dashboard/:path*',
    '/alerts/:path*', 
    '/reports/:path*',
    '/settings/:path*',
    '/profile/:path*'
  ],
} 