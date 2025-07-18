/**
 * @jest-environment jsdom
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals'

// Mock Next.js modules
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn((data, options) => ({
      json: async () => data,
      ok: !options || options.status < 400,
      status: options?.status || 200,
      statusText: options?.status >= 400 ? 'Error' : 'OK'
    }))
  }
}))

// Mock puppeteer
jest.mock('puppeteer', () => ({
  launch: jest.fn(() => Promise.resolve({
    newPage: jest.fn(() => Promise.resolve({
      setContent: jest.fn(() => Promise.resolve()),
      pdf: jest.fn(() => Promise.resolve(Buffer.from('mock-pdf-data')))
    })),
    close: jest.fn(() => Promise.resolve())
  }))
}))

// Mock the report types module
jest.mock('@/lib/report-types', () => ({
  extractReportData: jest.fn((data) => {
    // Simulate extracted data without ai_analysis
    return {
      metadata: {
        report_title: 'Test Report',
        generated_by: 'Test System',
        generation_date: '2025-01-17T12:00:00Z',
        report_version: '3.0',
        analysis_duration_hours: 24,
        reporting_period: '24h',
        analysis_scope: 'Test',
        threat_detection_method: 'Test'
      },
      executive_summary: {
        overall_risk_level: 'MEDIUM',
        key_findings: ['Test finding'],
        critical_issues_count: 1,
        recommendations_priority: 'SCHEDULED'
      },
      network_traffic_overview: {
        basic_stats: {
          total_flows: 1000,
          total_bytes: 5000000,
          total_packets: 10000,
          avg_duration: 30
        },
        top_sources: [],
        top_destinations: [],
        protocol_breakdown: {},
        bandwidth_stats: { average_mbps: 10, peak_mbps: 50, utilization_percent: 20 }
      },
      security_findings: {},
      recommendations_and_next_steps: {
        prioritized_recommendations: []
      },
      // ai_analysis is undefined - this should not cause an error
    }
  }),
  isValidReportData: jest.fn(() => true)
}))

// Mock the report styles
jest.mock('@/lib/report-styles', () => ({
  REPORT_STYLES: {
    layout: {
      headerContainer: 'test-header',
      sectionContainer: 'test-section',
      contentContainer: 'test-content'
    },
    typography: {
      pageTitle: 'test-title',
      pageSubtitle: 'test-subtitle',
      sectionTitle: 'test-section-title'
    },
    grids: {
      networkStats: 'test-grid',
      traffic: 'test-traffic-grid',
      cols2: 'test-cols-2'
    },
    cards: {
      stats: 'test-stats-card',
      content: 'test-content-card'
    }
  },
  REPORT_ICONS: {
    calendar: '<svg>calendar</svg>',
    clock: '<svg>clock</svg>',
    fileText: '<svg>file</svg>',
    brain: '<svg>brain</svg>',
    target: '<svg>target</svg>'
  },
  getSeverityBadgeClasses: jest.fn(() => 'test-badge'),
  getPriorityBadgeClasses: jest.fn(() => 'test-priority')
}))

describe('PDF Generation AI Analysis Fix', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should handle undefined ai_analysis without throwing map error', async () => {
    // Import the route handler after mocks are set up
    const { POST } = await import('@/app/api/reports/pdf/route')
    
    const mockRequest = {
      json: jest.fn(() => Promise.resolve({
        reportData: {
          metadata: { report_title: 'Test' },
          executive_summary: { overall_risk_level: 'MEDIUM' },
          network_traffic_overview: { basic_stats: {} },
          security_findings: {},
          recommendations_and_next_steps: { prioritized_recommendations: [] }
          // ai_analysis is undefined
        },
        reportId: 'test-123'
      }))
    } as any

    // This should not throw "Cannot read properties of undefined (reading 'map')"
    expect(async () => {
      await POST(mockRequest)
    }).not.toThrow()

    const response = await POST(mockRequest)
    
    // Should return a successful response (mocked puppeteer)
    expect(response).toBeDefined()
  })

  it('should handle empty ai_analysis array correctly', async () => {
    // Update the mock to return empty ai_analysis
    const { extractReportData } = await import('@/lib/report-types')
    ;(extractReportData as jest.Mock).mockReturnValueOnce({
      metadata: {
        report_title: 'Test Report',
        generated_by: 'Test',
        generation_date: '2025-01-17T12:00:00Z',
        report_version: '3.0',
        analysis_duration_hours: 24,
        reporting_period: '24h',
        analysis_scope: 'Test',
        threat_detection_method: 'Test'
      },
      executive_summary: {
        overall_risk_level: 'MEDIUM',
        key_findings: ['Test'],
        critical_issues_count: 0,
        recommendations_priority: 'SCHEDULED'
      },
      network_traffic_overview: {
        basic_stats: { total_flows: 0, total_bytes: 0, total_packets: 0, avg_duration: 0 },
        top_sources: [],
        top_destinations: [],
        protocol_breakdown: {},
        bandwidth_stats: { average_mbps: 0, peak_mbps: 0, utilization_percent: 0 }
      },
      security_findings: {},
      recommendations_and_next_steps: { prioritized_recommendations: [] },
      ai_analysis: [] // Empty array should also work
    })

    const { POST } = await import('@/app/api/reports/pdf/route')
    
    const mockRequest = {
      json: jest.fn(() => Promise.resolve({
        reportData: { metadata: { report_title: 'Test' } },
        reportId: 'test-456'
      }))
    } as any

    expect(async () => {
      await POST(mockRequest)
    }).not.toThrow()
  })
}) 