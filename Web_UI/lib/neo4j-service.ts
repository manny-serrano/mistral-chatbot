import neo4j, { Driver, Session, Result, int } from 'neo4j-driver'

// Database connection configuration
const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687'
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j'
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'password123'

// Types for our application
interface DukeUser {
  eppn: string;
  affiliation: string;
  displayName: string;
  givenName: string;
  surname: string;
  mail: string;
  dukeID: string;
}

interface UserProfile {
  id: string;
  netId: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  role: string;
  dukeID: string;
  isActive: boolean;
  lastLogin: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface Report {
  id: string;
  name: string;
  type: string;
  description?: string;
  content: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  metadata?: any;
  summary?: any;
  statistics?: any;
  findings?: string[];
  recommendations?: string[];
  threatCount?: number;
  criticalIssues?: number;
  networkFlows?: number;
  dataBytes?: number;
  avgBandwidth?: number;
  riskScore?: number;
  createdAt: Date;
  updatedAt: Date;
  fileSize?: number;
  pdfPath?: string;
}

interface ReportWithUser extends Report {
  generatedBy: UserProfile;
  generatedAt: Date;
  generatorRole: string;
}

class Neo4jService {
  private driver: Driver | null = null;

  constructor() {
    this.initDriver();
  }

  private initDriver(): void {
    try {
      this.driver = neo4j.driver(
        NEO4J_URI,
        neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD),
        {
          disableLosslessIntegers: true,
          maxConnectionLifetime: 3 * 60 * 60 * 1000, // 3 hours
          maxConnectionPoolSize: 50,
          connectionAcquisitionTimeout: 120000, // 2 minutes
        }
      )
    } catch (error) {
      console.error('Failed to initialize Neo4j driver:', error)
      this.driver = null
    }
  }

  private async getSession(): Promise<Session> {
    if (!this.driver) {
      this.initDriver()
    }
    
    if (!this.driver) {
      throw new Error('Neo4j driver not available')
    }

    return this.driver.session()
  }

  async close(): Promise<void> {
    if (this.driver) {
      await this.driver.close()
      this.driver = null
    }
  }

  // ===========================================
  // USER MANAGEMENT METHODS
  // ===========================================

  /**
   * Create or update user profile from Duke SSO attributes
   */
  async createOrUpdateUser(dukeUser: DukeUser): Promise<UserProfile> {
    const session = await this.getSession()
    
    try {
      const netId = dukeUser.eppn.split('@')[0] // Extract NetID from eppn
      const role = this.parseRole(dukeUser.affiliation)
      
      const result = await session.run(
        `
        MERGE (u:User {netId: $netId})
        ON CREATE SET 
          u.id = $id,
          u.netId = $netId,
          u.email = $email,
          u.firstName = $firstName,
          u.lastName = $lastName,
          u.displayName = $displayName,
          u.role = $role,
          u.dukeID = $dukeID,
          u.isActive = true,
          u.createdAt = datetime(),
          u.updatedAt = datetime(),
          u.lastLogin = datetime()
        ON MATCH SET 
          u.email = $email,
          u.firstName = $firstName,
          u.lastName = $lastName,
          u.displayName = $displayName,
          u.role = $role,
          u.dukeID = $dukeID,
          u.updatedAt = datetime(),
          u.lastLogin = datetime()
        RETURN u
        `,
        {
          id: `duke_${netId}`,
          netId,
          email: dukeUser.mail,
          firstName: dukeUser.givenName,
          lastName: dukeUser.surname,
          displayName: dukeUser.displayName || `${dukeUser.givenName} ${dukeUser.surname}`,
          role,
          dukeID: dukeUser.dukeID,
        }
      )

      const userRecord = result.records[0]?.get('u')
      return this.mapNeo4jUserToProfile(userRecord)
    } finally {
      await session.close()
    }
  }

  /**
   * Get user by NetID
   */
  async getUserByNetId(netId: string): Promise<UserProfile | null> {
    const session = await this.getSession()
    
    try {
      const result = await session.run(
        'MATCH (u:User {netId: $netId}) RETURN u',
        { netId }
      )

      if (result.records.length === 0) {
        return null
      }

      const userRecord = result.records[0].get('u')
      return this.mapNeo4jUserToProfile(userRecord)
    } finally {
      await session.close()
    }
  }

  /**
   * Log user activity for audit trail
   */
  async logUserActivity(netId: string, action: string, metadata: any = {}): Promise<void> {
    const session = await this.getSession()
    
    try {
      await session.run(
        `
        MATCH (u:User {netId: $netId})
        CREATE (a:Activity {
          action: $action,
          metadata: $metadata,
          timestamp: datetime(),
          ip: $ip
        })
        CREATE (u)-[:PERFORMED]->(a)
        `,
        {
          netId,
          action,
          metadata: JSON.stringify(metadata),
          ip: metadata.ip || 'unknown'
        }
      )
    } finally {
      await session.close()
    }
  }

  // ===========================================
  // REPORT MANAGEMENT METHODS  
  // ===========================================

  /**
   * Create a new report and link it to a user
   */
  async createReport(
    netId: string, 
    reportData: Omit<Report, 'id' | 'createdAt' | 'updatedAt'>,
    sessionInfo: { ip?: string; sessionId?: string } = {}
  ): Promise<Report> {
    const session = await this.getSession()
    
    try {
      const reportId = `report_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
      
      const result = await session.run(
        `
        MATCH (u:User {netId: $netId})
        CREATE (r:Report {
          id: $reportId,
          name: $name,
          type: $type,
          description: $description,
          content: $content,
          riskLevel: $riskLevel,
          status: $status,
          metadata: $metadata,
          summary: $summary,
          statistics: $statistics,
          findings: $findings,
          recommendations: $recommendations,
          threatCount: $threatCount,
          criticalIssues: $criticalIssues,
          networkFlows: $networkFlows,
          dataBytes: $dataBytes,
          avgBandwidth: $avgBandwidth,
          riskScore: $riskScore,
          fileSize: $fileSize,
          pdfPath: $pdfPath,
          createdAt: datetime(),
          updatedAt: datetime()
        })
        CREATE (u)-[:GENERATED {
          timestamp: datetime(),
          role: u.role,
          ip_address: $ip,
          session_id: $sessionId
        }]->(r)
        RETURN r
        `,
        {
          netId,
          reportId,
          name: reportData.name,
          type: reportData.type,
          description: reportData.description || '',
          content: JSON.stringify(reportData.content),
          riskLevel: reportData.riskLevel,
          status: reportData.status || 'PUBLISHED',
          metadata: JSON.stringify(reportData.metadata || {}),
          summary: JSON.stringify(reportData.summary || {}),
          statistics: JSON.stringify(reportData.statistics || {}),
          findings: reportData.findings || [],
          recommendations: reportData.recommendations || [],
          threatCount: reportData.threatCount || 0,
          criticalIssues: reportData.criticalIssues || 0,
          networkFlows: reportData.networkFlows || 0,
          dataBytes: reportData.dataBytes || 0,
          avgBandwidth: reportData.avgBandwidth || 0,
          riskScore: reportData.riskScore || 0,
          fileSize: reportData.fileSize || 0,
          pdfPath: reportData.pdfPath || '',
          ip: sessionInfo.ip || 'unknown',
          sessionId: sessionInfo.sessionId || 'unknown'
        }
      )

      const reportRecord = result.records[0]?.get('r')
      return this.mapNeo4jReportToReport(reportRecord)
    } finally {
      await session.close()
    }
  }

  /**
   * Get reports for a specific user
   */
  async getReportsForUser(
    netId: string, 
    options: {
      limit?: number;
      offset?: number;
      riskLevel?: string;
      type?: string;
      status?: string;
      sortBy?: 'createdAt' | 'riskScore' | 'name';
      sortOrder?: 'ASC' | 'DESC';
      includeArchived?: boolean;
    } = {}
  ): Promise<ReportWithUser[]> {
    const session = await this.getSession()
    
    try {
      const { 
        limit = 50, 
        offset = 0, 
        riskLevel, 
        type, 
        status,
        sortBy = 'createdAt',
        sortOrder = 'DESC',
        includeArchived = false
      } = options

      // Ensure limit and offset are integers for Neo4j
      const limitInt = Math.floor(Number(limit) || 50)
      const offsetInt = Math.floor(Number(offset) || 0)

      let whereClause = ''
      const params: any = { 
        netId, 
        limit: int(limitInt), 
        offset: int(offsetInt) 
      }

      if (riskLevel) {
        whereClause += ' AND r.riskLevel = $riskLevel'
        params.riskLevel = riskLevel
      }
      if (type) {
        whereClause += ' AND r.type = $type'
        params.type = type
      }
      if (status) {
        whereClause += ' AND r.status = $status'
        params.status = status
      }
      
      // Filter out archived reports by default unless explicitly requested
      if (!includeArchived && !status) {
        whereClause += ' AND r.status <> "ARCHIVED"'
      }

      const result = await session.run(
        `
        MATCH (u:User {netId: $netId})-[g:GENERATED]->(r:Report)
        WHERE 1=1 ${whereClause}
        RETURN r, u, g
        ORDER BY r.${sortBy} ${sortOrder}
        SKIP $offset
        LIMIT $limit
        `,
        params
      )

      return result.records.map(record => {
        const reportRecord = record.get('r')
        const userRecord = record.get('u')
        const generatedRecord = record.get('g')
        
        const report = this.mapNeo4jReportToReport(reportRecord)
        const user = this.mapNeo4jUserToProfile(userRecord)
        
        return {
          ...report,
          generatedBy: user,
          generatedAt: new Date(generatedRecord.properties.timestamp),
          generatorRole: generatedRecord.properties.role
        }
      })
    } finally {
      await session.close()
    }
  }

  /**
   * Get a specific report by ID (with user access check)
   */
  async getReport(reportId: string, netId: string, allowAdmin: boolean = false): Promise<ReportWithUser | null> {
    const session = await this.getSession()
    
    try {
      let query = `
        MATCH (u:User {netId: $netId})-[g:GENERATED]->(r:Report {id: $reportId})
        RETURN r, u, g
      `
      
      // Allow admin users to access any report
      if (allowAdmin) {
        query = `
          MATCH (requestingUser:User {netId: $netId})
          MATCH (u:User)-[g:GENERATED]->(r:Report {id: $reportId})
          WHERE u.netId = $netId OR requestingUser.role IN ['faculty', 'staff']
          RETURN r, u, g
        `
      }

      const result = await session.run(query, { reportId, netId })

      if (result.records.length === 0) {
        return null
      }

      const record = result.records[0]
      const reportRecord = record.get('r')
      const userRecord = record.get('u')
      const generatedRecord = record.get('g')
      
      const report = this.mapNeo4jReportToReport(reportRecord)
      const user = this.mapNeo4jUserToProfile(userRecord)
      
      return {
        ...report,
        generatedBy: user,
        generatedAt: new Date(generatedRecord.properties.timestamp),
        generatorRole: generatedRecord.properties.role
      }
    } finally {
      await session.close()
    }
  }

  /**
   * Update a report 
   */
  async updateReport(
    reportId: string, 
    netId: string, 
    updateData: Partial<Omit<Report, 'id' | 'createdAt'>>
  ): Promise<Report | null> {
    const session = await this.getSession()
    
    try {
      const setClause = Object.keys(updateData)
        .map(key => `r.${key} = $${key}`)
        .join(', ')

      if (setClause.length === 0) {
        return null
      }

      const result = await session.run(
        `
        MATCH (u:User {netId: $netId})-[:GENERATED]->(r:Report {id: $reportId})
        SET ${setClause}, r.updatedAt = datetime()
        RETURN r
        `,
        { reportId, netId, ...updateData }
      )

      if (result.records.length === 0) {
        return null
      }

      const reportRecord = result.records[0].get('r')
      return this.mapNeo4jReportToReport(reportRecord)
    } finally {
      await session.close()
    }
  }

  /**
   * Delete a report
   */
  async deleteReport(reportId: string, netId: string, allowAdmin: boolean = false): Promise<boolean> {
    const session = await this.getSession()
    
    try {
      let query = `
        MATCH (u:User {netId: $netId})-[:GENERATED]->(r:Report {id: $reportId})
        DETACH DELETE r
        RETURN count(r) as deletedCount
      `
      
      if (allowAdmin) {
        query = `
          MATCH (requestingUser:User {netId: $netId})
          MATCH (u:User)-[:GENERATED]->(r:Report {id: $reportId})
          WHERE u.netId = $netId OR requestingUser.role = 'faculty'
          DETACH DELETE r
          RETURN count(r) as deletedCount
        `
      }

      const result = await session.run(query, { reportId, netId })
      const deletedCount = result.records[0]?.get('deletedCount')
      return deletedCount > 0
    } finally {
      await session.close()
    }
  }

  /**
   * Archive a report (soft delete)
   */
  async archiveReport(reportId: string, netId: string, allowAdmin: boolean = false): Promise<boolean> {
    const session = await this.getSession()
    
    try {
      let query = `
        MATCH (u:User {netId: $netId})-[:GENERATED]->(r:Report {id: $reportId})
        SET r.status = 'ARCHIVED', r.updatedAt = datetime()
        RETURN count(r) as archivedCount
      `
      
      if (allowAdmin) {
        query = `
          MATCH (requestingUser:User {netId: $netId})
          MATCH (u:User)-[:GENERATED]->(r:Report {id: $reportId})
          WHERE u.netId = $netId OR requestingUser.role = 'faculty'
          SET r.status = 'ARCHIVED', r.updatedAt = datetime()
          RETURN count(r) as archivedCount
        `
      }

      const result = await session.run(query, { reportId, netId })
      const archivedCount = result.records[0]?.get('archivedCount')
      return archivedCount > 0
    } finally {
      await session.close()
    }
  }

  /**
   * Restore an archived report
   */
  async restoreReport(reportId: string, netId: string, allowAdmin: boolean = false): Promise<boolean> {
    const session = await this.getSession()
    
    try {
      let query = `
        MATCH (u:User {netId: $netId})-[:GENERATED]->(r:Report {id: $reportId})
        WHERE r.status = 'ARCHIVED'
        SET r.status = 'PUBLISHED', r.updatedAt = datetime()
        RETURN count(r) as restoredCount
      `
      
      if (allowAdmin) {
        query = `
          MATCH (requestingUser:User {netId: $netId})
          MATCH (u:User)-[:GENERATED]->(r:Report {id: $reportId})
          WHERE (u.netId = $netId OR requestingUser.role = 'faculty') AND r.status = 'ARCHIVED'
          SET r.status = 'PUBLISHED', r.updatedAt = datetime()
          RETURN count(r) as restoredCount
        `
      }

      const result = await session.run(query, { reportId, netId })
      const restoredCount = result.records[0]?.get('restoredCount')
      return restoredCount > 0
    } finally {
      await session.close()
    }
  }

  // ===========================================
  // UTILITY METHODS
  // ===========================================

  /**
   * Get system statistics
   */
  async getSystemStatistics(): Promise<{
    userCount: number;
    reportCount: number;
    avgRiskScore: number;
    criticalReports: number;
    recentUsers: number;
  }> {
    const session = await this.getSession()
    
    try {
      const result = await session.run(`
        MATCH (u:User) 
        WITH count(u) as userCount,
             count(CASE WHEN u.lastLogin >= datetime() - duration('P7D') THEN 1 END) as recentUsers
        MATCH (r:Report) 
        WITH userCount, recentUsers, count(r) as reportCount, 
             avg(r.riskScore) as avgRiskScore,
             count(CASE WHEN r.riskLevel = 'CRITICAL' THEN 1 END) as criticalReports
        RETURN userCount, reportCount, avgRiskScore, criticalReports, recentUsers
      `)

      const record = result.records[0]
      return {
        userCount: record.get('userCount'),
        reportCount: record.get('reportCount'),
        avgRiskScore: record.get('avgRiskScore') || 0,
        criticalReports: record.get('criticalReports'),
        recentUsers: record.get('recentUsers')
      }
    } finally {
      await session.close()
    }
  }

  // ===========================================
  // PRIVATE HELPER METHODS
  // ===========================================

  private parseRole(affiliation: string): string {
    if (affiliation.includes('faculty')) return 'faculty'
    if (affiliation.includes('staff')) return 'staff'
    return 'student'
  }

  private mapNeo4jUserToProfile(userRecord: any): UserProfile {
    const props = userRecord.properties
    return {
      id: props.id,
      netId: props.netId,
      email: props.email,
      firstName: props.firstName,
      lastName: props.lastName,
      displayName: props.displayName,
      role: props.role,
      dukeID: props.dukeID,
      isActive: props.isActive,
      lastLogin: new Date(props.lastLogin),
      createdAt: new Date(props.createdAt),
      updatedAt: new Date(props.updatedAt)
    }
  }

  private mapNeo4jReportToReport(reportRecord: any): Report {
    const props = reportRecord.properties
    return {
      id: props.id,
      name: props.name,
      type: props.type,
      description: props.description,
      content: props.content,
      riskLevel: props.riskLevel,
      status: props.status,
      metadata: props.metadata ? JSON.parse(props.metadata) : {},
      summary: props.summary ? JSON.parse(props.summary) : {},
      statistics: props.statistics ? JSON.parse(props.statistics) : {},
      findings: props.findings || [],
      recommendations: props.recommendations || [],
      threatCount: props.threatCount,
      criticalIssues: props.criticalIssues,
      networkFlows: props.networkFlows,
      dataBytes: props.dataBytes,
      avgBandwidth: props.avgBandwidth,
      riskScore: props.riskScore,
      createdAt: new Date(props.createdAt),
      updatedAt: new Date(props.updatedAt),
      fileSize: props.fileSize,
      pdfPath: props.pdfPath
    }
  }
}

// Export singleton instance
export const neo4jService = new Neo4jService()
export default neo4jService

// Export types for use in other files
export type { UserProfile, Report, ReportWithUser, DukeUser } 