interface DukeUser {
  eppn: string // NetID (e.g., "jsmith@duke.edu")
  affiliation: string // Role (e.g., "faculty@duke.edu", "student@duke.edu")
  displayName: string
  givenName: string
  surname: string
  mail: string
  dukeID: string
}

interface UserProfile {
  id: string
  netId: string
  email: string
  firstName: string
  lastName: string
  displayName: string
  role: 'faculty' | 'staff' | 'student' | 'other'
  department?: string
  lastLogin: Date
  createdAt: Date
  updatedAt: Date
}

export class UserManager {
  /**
   * Create or update user profile from Duke SSO attributes
   */
  static async createOrUpdateUser(dukeUser: DukeUser): Promise<UserProfile> {
    const netId = dukeUser.eppn.split('@')[0] // Extract NetID from eppn
    const role = this.parseRole(dukeUser.affiliation)
    
    const userProfile: UserProfile = {
      id: `duke_${netId}`,
      netId,
      email: dukeUser.mail,
      firstName: dukeUser.givenName,
      lastName: dukeUser.surname,
      displayName: dukeUser.displayName || `${dukeUser.givenName} ${dukeUser.surname}`,
      role,
      lastLogin: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    // In a real application, you would save this to your database
    // Example with Prisma/MongoDB/SQL:
    /*
    const existingUser = await db.user.findUnique({
      where: { netId }
    })
    
    if (existingUser) {
      return await db.user.update({
        where: { netId },
        data: {
          ...userProfile,
          lastLogin: new Date(),
          updatedAt: new Date()
        }
      })
    } else {
      return await db.user.create({
        data: userProfile
      })
    }
    */
    
    // For now, return the profile (you'd implement database storage)
    console.log('Creating/updating user:', userProfile)
    return userProfile
  }
  
  /**
   * Parse Duke affiliation to determine user role
   */
  private static parseRole(affiliation: string): 'faculty' | 'staff' | 'student' | 'other' {
    const affiliationLower = affiliation.toLowerCase()
    
    if (affiliationLower.includes('faculty')) return 'faculty'
    if (affiliationLower.includes('staff')) return 'staff'
    if (affiliationLower.includes('student')) return 'student'
    
    return 'other'
  }
  
  /**
   * Check if user has admin privileges
   */
  static hasAdminAccess(userProfile: UserProfile): boolean {
    // Define your admin criteria
    return userProfile.role === 'faculty' || userProfile.role === 'staff'
  }
  
  /**
   * Get user permissions based on role
   */
  static getUserPermissions(userProfile: UserProfile): string[] {
    const permissions: string[] = ['view_dashboard']
    
    switch (userProfile.role) {
      case 'faculty':
        permissions.push('admin_access', 'manage_users', 'view_reports', 'export_data')
        break
      case 'staff':
        permissions.push('admin_access', 'view_reports', 'manage_alerts')
        break
      case 'student':
        permissions.push('view_reports')
        break
    }
    
    return permissions
  }
  
  /**
   * Log user activity for audit purposes
   */
  static async logUserActivity(netId: string, action: string, details?: any): Promise<void> {
    const logEntry = {
      netId,
      action,
      details,
      timestamp: new Date(),
      ip: 'unknown' // You'd get this from request headers
    }
    
    // In a real application, save to audit log
    console.log('User activity:', logEntry)
  }
}

export type { DukeUser, UserProfile } 