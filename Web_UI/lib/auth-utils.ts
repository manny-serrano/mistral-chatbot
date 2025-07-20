import { NextRequest } from 'next/server'

export interface AuthenticatedUser {
  netId: string
  role: string
  email: string
  displayName: string
  affiliation: string
  permissions: string[]
}

export function getUserFromSession(request: NextRequest): AuthenticatedUser | null {
  try {
    const sessionCookie = request.cookies.get('duke-sso-session')
    if (!sessionCookie) return null
    
    const sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString())
    if (Date.now() > sessionData.expires) return null
    
    const user = sessionData.user
    // Duke EPPN is just the NetID (no @duke.edu suffix)
    const netId = user.eppn || 'unknown'
    const role = user.affiliation ? (
      user.affiliation.includes('faculty') ? 'faculty' :
      user.affiliation.includes('staff') ? 'staff' : 'student'
    ) : 'student'
    
    return {
      netId,
      role,
      email: user.mail || `${netId}@duke.edu`,
      displayName: user.displayName || `${user.givenName || 'Unknown'} ${user.surname || 'User'}`,
      affiliation: user.affiliation || 'student@duke.edu',
      permissions: sessionData.permissions || []
    }
  } catch {
    return null
  }
} 