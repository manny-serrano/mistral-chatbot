// Import Neo4j service for database operations
import neo4jService, { type DukeUser, type UserProfile } from './neo4j-service'

export class UserManager {
  /**
   * Create or update user profile from Duke SSO attributes
   */
  static async createOrUpdateUser(dukeUser: DukeUser): Promise<UserProfile> {
    try {
      // Use Neo4j service to create/update user
      const userProfile = await neo4jService.createOrUpdateUser(dukeUser)
      console.log('Created/updated user in Neo4j:', userProfile)
      return userProfile
    } catch (error) {
      console.error('Failed to create/update user in Neo4j:', error)
      
      // Fallback: create profile without persisting to database
      const netId = dukeUser.eppn.split('@')[0]
      const role = this.parseRole(dukeUser.affiliation)
      
      return {
        id: `duke_${netId}`,
        netId,
        email: dukeUser.mail,
        firstName: dukeUser.givenName,
        lastName: dukeUser.surname,
        displayName: dukeUser.displayName || `${dukeUser.givenName} ${dukeUser.surname}`,
        role,
        dukeID: dukeUser.dukeID,
        isActive: true,
        lastLogin: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    }
  }

  /**
   * Get user by NetID from Neo4j
   */
  static async getUserByNetId(netId: string): Promise<UserProfile | null> {
    try {
      return await neo4jService.getUserByNetId(netId)
    } catch (error) {
      console.error('Failed to get user from Neo4j:', error)
      return null
    }
  }

  /**
   * Log user activity
   */
  static async logUserActivity(netId: string, action: string, metadata: any = {}): Promise<void> {
    try {
      await neo4jService.logUserActivity(netId, action, metadata)
    } catch (error) {
      console.error('Failed to log user activity:', error)
    }
  }
  
  /**
   * Parse Duke affiliation to determine user role
   */
  private static parseRole(affiliation: string): string {
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
    
    // Add role-specific permissions
    switch (userProfile.role) {
      case 'faculty':
        permissions.push(
          'generate_reports',
          'view_all_data',
          'export_data',
          'manage_settings',
          'view_admin_panel',
          'delete_reports'
        )
        break
      
      case 'staff':
        permissions.push(
          'generate_reports',
          'view_limited_data',
          'export_data'
        )
        break
      
      case 'student':
        permissions.push(
          'view_limited_data'
        )
        break
      
      default:
        // 'other' role gets minimal permissions
        break
    }
    
    return permissions
  }
  
  /**
   * Validate user session data
   */
  static validateSession(sessionData: any): UserProfile | null {
    if (!sessionData || !sessionData.user) {
      return null
    }
    
    // Check if session is expired
    if (Date.now() > sessionData.expires) {
      return null
    }
    
    return sessionData.user
  }
}

// Re-export types for backward compatibility
export type { DukeUser, UserProfile } 