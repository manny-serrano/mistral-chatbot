// Neo4j Schema for Cybersecurity Reports & User Management
// This file defines the complete graph schema for user authentication and report storage

// ===========================================
// 1. CREATE CONSTRAINTS & INDEXES
// ===========================================

// User constraints - ensure unique NetIDs
CREATE CONSTRAINT IF NOT EXISTS FOR (u:User) REQUIRE u.netId IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE;

// Report constraints - ensure unique report IDs
CREATE CONSTRAINT IF NOT EXISTS FOR (r:Report) REQUIRE r.id IS UNIQUE;

// Performance indexes
CREATE INDEX IF NOT EXISTS FOR (u:User) ON (u.email);
CREATE INDEX IF NOT EXISTS FOR (u:User) ON (u.role);
CREATE INDEX IF NOT EXISTS FOR (u:User) ON (u.lastLogin);

CREATE INDEX IF NOT EXISTS FOR (r:Report) ON (r.createdAt);
CREATE INDEX IF NOT EXISTS FOR (r:Report) ON (r.type);
CREATE INDEX IF NOT EXISTS FOR (r:Report) ON (r.riskLevel);
CREATE INDEX IF NOT EXISTS FOR (r:Report) ON (r.status);

// ===========================================
// 2. NODE LABELS & PROPERTIES
// ===========================================

// User Node Structure:
// (:User {
//   id: string,           // duke_netid format
//   netId: string,        // Duke NetID (e.g., "abc123")
//   email: string,        // Duke email address
//   firstName: string,    // Given name
//   lastName: string,     // Surname  
//   displayName: string,  // Full display name
//   role: string,         // faculty|staff|student
//   dukeID: string,       // Duke ID number
//   isActive: boolean,    // Account status
//   lastLogin: datetime,  // Last login timestamp
//   createdAt: datetime,  // Account creation
//   updatedAt: datetime   // Last profile update
// })

// Report Node Structure:
// (:Report {
//   id: string,              // UUID or timestamp-based ID
//   name: string,            // Report title/name
//   type: string,            // "security_analysis"|"threat_detection"|"network_monitoring"
//   description: string,     // Brief description
//   content: string,         // Full report content (JSON or text)
//   riskLevel: string,       // "LOW"|"MEDIUM"|"HIGH"|"CRITICAL"
//   status: string,          // "DRAFT"|"PUBLISHED"|"ARCHIVED"
//   metadata: map,           // Additional report metadata
//   summary: map,            // Key findings summary
//   statistics: map,         // Network stats, metrics, etc.
//   findings: list,          // Key security findings
//   recommendations: list,   // Security recommendations
//   threatCount: integer,    // Number of threats detected
//   criticalIssues: integer, // Critical security issues
//   networkFlows: integer,   // Total network flows analyzed
//   dataBytes: long,         // Total bytes analyzed
//   avgBandwidth: float,     // Average bandwidth (Mbps)
//   riskScore: float,        // Risk score (0-10)
//   createdAt: datetime,     // Report generation time
//   updatedAt: datetime,     // Last modification
//   fileSize: integer,       // PDF file size (bytes)
//   pdfPath: string          // Path to PDF file (if stored separately)
// })

// ===========================================
// 3. RELATIONSHIP TYPES
// ===========================================

// User generates reports
// (:User)-[:GENERATED {
//   timestamp: datetime,     // When report was generated
//   role: string,           // User's role at time of generation
//   ip_address: string,     // IP where report was generated
//   session_id: string      // Session identifier
// }]->(:Report)

// User views/accesses reports (optional - for audit trail)
// (:User)-[:ACCESSED {
//   timestamp: datetime,     // When report was accessed
//   action: string,         // "VIEW"|"DOWNLOAD"|"EXPORT"
//   ip_address: string,     // Access IP
//   session_id: string      // Session identifier
// }]->(:Report)

// User manages/administers other users (optional - for admin features)
// (:User)-[:MANAGES {
//   since: datetime,        // When management started
//   permissions: list       // List of permissions granted
// }]->(:User)

// ===========================================
// 4. SAMPLE DATA CREATION QUERIES
// ===========================================

// Create sample admin user
CREATE (admin:User {
  id: 'duke_admin',
  netId: 'admin',
  email: 'admin@duke.edu',
  firstName: 'System',
  lastName: 'Administrator',
  displayName: 'System Administrator',
  role: 'faculty',
  dukeID: 'ADMIN001',
  isActive: true,
  lastLogin: datetime(),
  createdAt: datetime(),
  updatedAt: datetime()
});

// Create sample test user (for development)
CREATE (testuser:User {
  id: 'duke_testuser',
  netId: 'testuser',
  email: 'testuser@duke.edu',
  firstName: 'Test',
  lastName: 'User',
  displayName: 'Test User',
  role: 'faculty',
  dukeID: '123456789',
  isActive: true,
  lastLogin: datetime(),
  createdAt: datetime(),
  updatedAt: datetime()
});

// ===========================================
// 5. UTILITY QUERIES FOR APPLICATION
// ===========================================

// Query: Get user by NetID
// MATCH (u:User {netId: $netId}) RETURN u

// Query: Get all reports for a user
// MATCH (u:User {netId: $netId})-[:GENERATED]->(r:Report) 
// RETURN r ORDER BY r.createdAt DESC

// Query: Get recent reports (last 30 days)
// MATCH (u:User {netId: $netId})-[:GENERATED]->(r:Report)
// WHERE r.createdAt >= datetime() - duration('P30D')
// RETURN r ORDER BY r.createdAt DESC

// Query: Get high-risk reports
// MATCH (u:User {netId: $netId})-[:GENERATED]->(r:Report)
// WHERE r.riskLevel IN ['HIGH', 'CRITICAL']
// RETURN r ORDER BY r.riskScore DESC

// Query: Create new report
// MATCH (u:User {netId: $netId})
// CREATE (r:Report {
//   id: $reportId,
//   name: $name,
//   type: $type,
//   content: $content,
//   riskLevel: $riskLevel,
//   status: 'PUBLISHED',
//   createdAt: datetime(),
//   updatedAt: datetime()
// })
// CREATE (u)-[:GENERATED {
//   timestamp: datetime(),
//   role: u.role,
//   ip_address: $ipAddress,
//   session_id: $sessionId
// }]->(r)
// RETURN r

// Query: Update report
// MATCH (r:Report {id: $reportId})
// SET r.updatedAt = datetime(), r += $updateFields
// RETURN r

// Query: Delete report (admin only)
// MATCH (r:Report {id: $reportId})<-[:GENERATED]-(u:User {netId: $netId})
// WHERE u.role = 'faculty' // or appropriate admin check
// DETACH DELETE r

// ===========================================
// 6. PERFORMANCE & CLEANUP QUERIES
// ===========================================

// Query: Archive old reports (older than 1 year)
// MATCH (r:Report)
// WHERE r.createdAt < datetime() - duration('P365D')
// SET r.status = 'ARCHIVED'
// RETURN count(r) as archivedCount

// Query: Clean up old access logs (if using ACCESSED relationships)
// MATCH ()-[a:ACCESSED]->()
// WHERE a.timestamp < datetime() - duration('P90D')
// DELETE a
// RETURN count(a) as cleanedAccessLogs

// ===========================================
// 7. ADMIN & REPORTING QUERIES
// ===========================================

// Query: Get all users and their report counts
// MATCH (u:User)
// OPTIONAL MATCH (u)-[:GENERATED]->(r:Report)
// RETURN u.netId, u.displayName, u.role, count(r) as reportCount
// ORDER BY reportCount DESC

// Query: Get system statistics
// MATCH (u:User) 
// WITH count(u) as userCount
// MATCH (r:Report) 
// WITH userCount, count(r) as reportCount, 
//      avg(r.riskScore) as avgRiskScore,
//      count(CASE WHEN r.riskLevel = 'CRITICAL' THEN 1 END) as criticalReports
// RETURN userCount, reportCount, avgRiskScore, criticalReports

// ===========================================
// 8. MIGRATION QUERIES (for existing data)
// ===========================================

// Query template for migrating existing file-based reports:
// CREATE (r:Report {
//   id: $fileBasedId,
//   name: $extractedName,
//   type: 'security_analysis',
//   content: $jsonContent,
//   riskLevel: $extractedRiskLevel,
//   status: 'PUBLISHED',
//   createdAt: datetime($extractedTimestamp),
//   updatedAt: datetime($extractedTimestamp),
//   // ... other extracted fields
// })
// WITH r
// MATCH (u:User {netId: $ownerNetId})
// CREATE (u)-[:GENERATED {
//   timestamp: datetime($extractedTimestamp),
//   role: u.role
// }]->(r)
// RETURN r 