import { NextRequest } from 'next/server'

// Mock the PDF route handler
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn((data, options) => ({
      json: async () => data,
      status: options?.status || 200,
      ok: true
    }))
  }
}))

describe('PDF Generation Comprehensive Debug', () => {
  let mockPOST: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()
    
    // Mock the route handler
    mockPOST = require('../app/api/reports/pdf/route.ts').POST
  })

  const createMockRequest = (reportData: any) => ({
    json: jest.fn().mockResolvedValue({ reportData, reportId: 'test-report-123' })
  } as any)

  const sampleReportData = {
    metadata: {
      report_title: 'Test Security Report',
      generated_by: 'LEVANT AI Security Platform',
      generation_date: '2025-07-17T15:05:35.180201+00:00',
      report_version: '3.0',
      analysis_duration_hours: 3.5,
      analysis_scope: 'Normal network flows',
      threat_detection_method: 'Pattern matching'
    },
    executive_summary: {
      overall_risk_level: 'MEDIUM',
      key_findings: [
        'Network monitoring active',
        'No critical threats detected',
        'Standard security protocols in place'
      ],
      critical_issues_count: 0,
      recommendations_priority: 'MEDIUM'
    },
    network_traffic_overview: {
      basic_stats: {
        total_flows: 127473,
        total_bytes: 23990676301,
        total_packets: 500000,
        avg_duration: 30
      },
      top_sources: [
        { ip: '192.168.1.100', bytes: 1000000, flow_count: 100 },
        { ip: '10.0.0.50', bytes: 800000, flow_count: 80 }
      ],
      top_destinations: [
        { ip: '8.8.8.8', bytes: 1200000, flow_count: 120 },
        { ip: '1.1.1.1', bytes: 900000, flow_count: 90 }
      ],
      protocol_breakdown: {
        'tcp': {
          protocol_id: 6,
          flow_count: 50000,
          total_bytes: 15000000000,
          is_suspicious: false
        },
        'udp': {
          protocol_id: 17,
          flow_count: 30000,
          total_bytes: 8000000000,
          is_suspicious: false
        }
      },
      bandwidth_stats: {
        total_bytes: 23990676301,
        average_mbps: 150.5,
        duration_seconds: 12600
      }
    },
    security_findings: {
      port_scanning: {
        severity: 'MEDIUM',
        count: 5,
        matching_flows: 150,
        potential_scanners: [
          { source_ip: '192.168.1.50', ports_scanned: 100 }
        ]
      },
      data_exfiltration: {
        severity: 'HIGH',
        count: 2,
        matching_flows: 50,
        high_volume_sources: [
          { source_ip: '10.0.0.200', gb_sent: 5.2 }
        ]
      }
    },
    recommendations_and_next_steps: {
      prioritized_recommendations: [
        {
          priority: 'IMMEDIATE',
          category: 'Port Scanning',
          finding: 'Multiple port scan attempts detected',
          recommendation: 'Implement rate limiting and monitoring',
          estimated_effort: 'Medium',
          timeline: '24 hours'
        },
        {
          priority: 'SCHEDULED',
          category: 'Monitoring',
          finding: 'Need enhanced logging',
          recommendation: 'Deploy additional monitoring tools',
          estimated_effort: 'High',
          timeline: '1-2 weeks'
        }
      ]
    },
    ai_analysis: [
      {
        attack_technique: 'T1046',
        confidence_score: 0.85,
        finding: 'Network scanning activity detected',
        business_impact: 'Potential reconnaissance for future attacks',
        recommended_action: 'Block scanning sources immediately',
        timeline: 'Immediate'
      }
    ],
    id: 'test-report-123',
    name: 'Test Security Report',
    riskLevel: 'MEDIUM',
    threatCount: 7,
    criticalIssues: 0,
    networkFlows: 127473,
    dataBytes: 23990676301,
    riskScore: 45
  }

  test('should generate valid HTML for complete report data', async () => {
    const request = createMockRequest(sampleReportData)
    const response = await mockPOST(request)
    const result = await response.json()

    expect(result.success).toBe(true)
    expect(result.html).toBeDefined()
    expect(typeof result.html).toBe('string')
    
    // Validate HTML structure
    const html = result.html
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('<html>')
    expect(html).toContain('</html>')
    expect(html).toContain('<head>')
    expect(html).toContain('</head>')
    expect(html).toContain('<body>')
    expect(html).toContain('</body>')
    
    // Validate content
    expect(html).toContain('Test Security Report')
    expect(html).toContain('LEVANT AI Security Platform')
    expect(html).toContain('127,473') // formatted flow count
    expect(html).toContain('22.3 GB') // formatted bytes
    expect(html).toContain('MEDIUM') // risk level
    
    // Validate sections
    expect(html).toContain('Executive Summary')
    expect(html).toContain('Network Traffic Analysis')
    expect(html).toContain('Security Analysis')
    expect(html).toContain('Recommendations')
    expect(html).toContain('AI Security Analysis')
    
    // Validate no template literals remain
    expect(html).not.toContain('${')
    expect(html).not.toContain('`')
    
    // Validate no broken HTML tags
    expect(html).not.toContain('<>')
    expect(html).not.toContain('</>')
  })

  test('should handle minimal report data gracefully', async () => {
    const minimalData = {
      id: 'minimal-test',
      name: 'Minimal Report',
      riskLevel: 'LOW',
      networkFlows: 100,
      dataBytes: 1000000
    }
    
    const request = createMockRequest(minimalData)
    const response = await mockPOST(request)
    const result = await response.json()

    expect(result.success).toBe(true)
    expect(result.html).toBeDefined()
    
    const html = result.html
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('Minimal Report')
    expect(html).toContain('LOW')
    expect(html).toContain('100') // flow count
    
    // Should have fallback content
    expect(html).toContain('Security Report')
    expect(html).toContain('No data available')
  })

  test('should validate all HTML template interpolations are complete', async () => {
    const request = createMockRequest(sampleReportData)
    const response = await mockPOST(request)
    const result = await response.json()

    const html = result.html
    
    // Check for incomplete template strings
    const incompleteTemplates = html.match(/\$\{[^}]*$/g)
    expect(incompleteTemplates).toBeNull()
    
    // Check for unescaped template literals
    const unescapedTemplates = html.match(/`[^`]*\$\{/g)
    expect(unescapedTemplates).toBeNull()
    
    // Check for malformed HTML
    const malformedTags = html.match(/<[^>]*[<>][^>]*>/g)
    expect(malformedTags).toBeNull()
  })

  test('should properly format data values', async () => {
    const request = createMockRequest(sampleReportData)
    const response = await mockPOST(request)
    const result = await response.json()

    const html = result.html
    
    // Check byte formatting
    expect(html).toContain('22.3 GB') // 23990676301 bytes
    expect(html).toContain('976.6 KB') // 1000000 bytes
    
    // Check number formatting
    expect(html).toContain('127,473') // flow count with commas
    expect(html).toContain('500,000') // packet count
    
    // Check percentage formatting
    expect(html).toContain('85%') // AI confidence score
    
    // Check protocol names
    expect(html).toContain('TCP')
    expect(html).toContain('UDP')
  })

  test('should handle missing sections gracefully', async () => {
    const dataWithMissingSections = {
      metadata: {
        report_title: 'Incomplete Report'
      },
      // Missing other sections
      id: 'incomplete-test'
    }
    
    const request = createMockRequest(dataWithMissingSections)
    const response = await mockPOST(request)
    const result = await response.json()

    expect(result.success).toBe(true)
    
    const html = result.html
    expect(html).toContain('Incomplete Report')
    expect(html).toContain('No data available')
    expect(html).toContain('MONITORING') // default security status
    expect(html).toContain('Continue regular monitoring') // default recommendation
  })

  test('should validate HTML document structure', async () => {
    const request = createMockRequest(sampleReportData)
    const response = await mockPOST(request)
    const result = await response.json()

    const html = result.html
    
    // Count opening and closing tags to ensure they match
    const openTags = (html.match(/<[^/][^>]*>/g) || []).length
    const closeTags = (html.match(/<\/[^>]*>/g) || []).length
    const selfClosingTags = (html.match(/<[^>]*\/>/g) || []).length
    
    // For self-closing tags, they count as both open and close
    expect(openTags - selfClosingTags).toBe(closeTags)
    
    // Check for specific required sections
    expect(html).toMatch(/<section[^>]*>.*Executive Summary.*<\/section>/s)
    expect(html).toMatch(/<section[^>]*>.*Network Traffic Analysis.*<\/section>/s)
    expect(html).toMatch(/<section[^>]*>.*Security Analysis.*<\/section>/s)
    expect(html).toMatch(/<section[^>]*>.*Recommendations.*<\/section>/s)
  })

  test('should handle error cases', async () => {
    // Test with null data
    const requestWithNull = createMockRequest(null)
    const response = await mockPOST(requestWithNull)
    const result = await response.json()

    expect(result.error).toBeDefined()
    expect(response.status).toBe(400)
  })

  test('should generate PDF-ready HTML with proper styling', async () => {
    const request = createMockRequest(sampleReportData)
    const response = await mockPOST(request)
    const result = await response.json()

    const html = result.html
    
    // Check for essential CSS
    expect(html).toContain('@media print')
    expect(html).toContain('page-break-inside')
    expect(html).toContain('-webkit-print-color-adjust: exact')
    expect(html).toContain('print-color-adjust: exact')
    
    // Check for proper color styling
    expect(html).toContain('#111827') // primary text color
    expect(html).toContain('#6B7280') // secondary text color
    expect(html).toContain('#F9FAFB') // card background
    
    // Check for responsive design elements
    expect(html).toContain('grid-template-columns')
    expect(html).toContain('flex')
    expect(html).toContain('gap:')
  })
}) 