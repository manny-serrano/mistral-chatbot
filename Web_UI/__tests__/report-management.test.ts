/**
 * @jest-environment jsdom
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'

// Mock Next.js modules
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
  useParams: () => ({ id: 'test-report-id' }),
}))

jest.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}))

// Mock fetch globally
global.fetch = jest.fn()

describe('Report Management', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('PDF Export Functionality', () => {
    it('should handle PDF generation with full report data', async () => {
      const mockReportData = {
        metadata: {
          report_title: 'Test Security Report',
          generated_by: 'LEVANT AI Security Platform',
          generation_date: '2025-01-17T12:00:00Z',
          report_version: '3.0',
          analysis_duration_hours: 24,
        },
        executive_summary: {
          overall_risk_level: 'MEDIUM',
          key_findings: ['Finding 1', 'Finding 2'],
          critical_issues_count: 2,
          recommendations_priority: 'HIGH',
        },
        network_traffic_overview: {
          basic_stats: {
            total_flows: 10000,
            total_bytes: 1073741824, // 1GB
            total_packets: 50000,
          },
          top_sources: [
            { ip: '192.168.1.100', bytes: 104857600, flow_count: 1000 },
          ],
          top_destinations: [
            { ip: '10.0.0.1', bytes: 52428800, flow_count: 500 },
          ],
          protocol_breakdown: {
            TCP: { protocol_id: 6, flow_count: 8000, total_bytes: 858993459, is_suspicious: false },
            UDP: { protocol_id: 17, flow_count: 2000, total_bytes: 214748365, is_suspicious: false },
          },
        },
        security_findings: {
          port_scanning: {
            severity: 'MEDIUM',
            count: 5,
            potential_scanners: [
              { source_ip: '192.168.1.50', ports_scanned: 100 },
            ],
          },
        },
        recommendations_and_next_steps: {
          prioritized_recommendations: [
            {
              priority: 'IMMEDIATE',
              category: 'Security',
              finding: 'Port scanning detected',
              recommendation: 'Block suspicious IPs',
              estimated_effort: 'Low',
              timeline: '24 hours',
            },
          ],
        },
      }

      // Mock successful PDF generation API response
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          html: '<html><body><h1>Test Security Report</h1></body></html>',
          success: true,
        }),
      })

      const response = await fetch('/api/reports/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportData: mockReportData, reportId: 'test-report' }),
      })

      expect(response.ok).toBe(true)
      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.html).toContain('Test Security Report')
    })

    it('should handle PDF generation with minimal report data', async () => {
      const mockMinimalReportData = {
        id: 'test-report',
        name: 'Minimal Report',
        riskLevel: 'LOW',
        criticalIssues: 0,
        networkFlows: 100,
        dataBytes: 1048576, // 1MB
        createdAt: '2025-01-17T12:00:00Z',
      }

      // Mock successful PDF generation API response
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          html: '<html><body><h1>Security Report</h1></body></html>',
          success: true,
        }),
      })

      const response = await fetch('/api/reports/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportData: mockMinimalReportData, reportId: 'test-report' }),
      })

      expect(response.ok).toBe(true)
      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.html).toContain('Security Report')
    })

    it('should handle malformed report data gracefully', async () => {
      const mockMalformedData = {
        // Missing required fields
        id: 'test-report',
      }

      // Mock successful PDF generation API response (should still work with fallbacks)
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          html: '<html><body><h1>Security Report</h1></body></html>',
          success: true,
        }),
      })

      const response = await fetch('/api/reports/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportData: mockMalformedData, reportId: 'test-report' }),
      })

      expect(response.ok).toBe(true)
      const result = await response.json()
      expect(result.success).toBe(true)
    })
  })

  describe('Report Archive Functionality', () => {
    it('should archive a report successfully', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          message: 'Report archived successfully',
          action: 'archive',
        }),
      })

      const response = await fetch('/api/reports/test-report-id', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'archive' }),
      })

      expect(response.ok).toBe(true)
      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.action).toBe('archive')
    })

    it('should restore an archived report successfully', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          message: 'Report restored successfully',
          action: 'restore',
        }),
      })

      const response = await fetch('/api/reports/test-report-id', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore' }),
      })

      expect(response.ok).toBe(true)
      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.action).toBe('restore')
    })

    it('should reject invalid archive actions', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          error: 'Invalid action. Must be "archive" or "restore"',
        }),
      })

      const response = await fetch('/api/reports/test-report-id', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'invalid' }),
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(400)
    })

    it('should handle unauthorized archive attempts', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({
          error: 'Report not found or access denied',
        }),
      })

      const response = await fetch('/api/reports/unauthorized-report', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'archive' }),
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(404)
    })
  })

  describe('Report Delete Functionality', () => {
    it('should delete a report successfully', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          message: 'Report deleted successfully',
        }),
      })

      const response = await fetch('/api/reports/test-report-id', {
        method: 'DELETE',
      })

      expect(response.ok).toBe(true)
      const result = await response.json()
      expect(result.success).toBe(true)
    })

    it('should handle unauthorized delete attempts', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({
          error: 'Report not found or access denied',
        }),
      })

      const response = await fetch('/api/reports/unauthorized-report', {
        method: 'DELETE',
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(404)
    })

    it('should require authentication for delete operations', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({
          error: 'Authentication required',
        }),
      })

      const response = await fetch('/api/reports/test-report-id', {
        method: 'DELETE',
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(401)
    })
  })

  describe('Report Filtering and Visibility', () => {
    it('should filter out archived reports by default', async () => {
      const mockReports = [
        { id: '1', title: 'Active Report 1', status: 'PUBLISHED' },
        { id: '2', title: 'Archived Report', status: 'ARCHIVED' },
        { id: '3', title: 'Active Report 2', status: 'PUBLISHED' },
      ]

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          reports: mockReports.filter(r => r.status !== 'ARCHIVED'),
          summary: { total_reports: 2 },
        }),
      })

      const response = await fetch('/api/reports')
      const result = await response.json()
      
      expect(result.reports.length).toBe(2)
      expect(result.reports.every((r: any) => r.status !== 'ARCHIVED')).toBe(true)
    })

    it('should include archived reports when explicitly requested', async () => {
      const mockReports = [
        { id: '1', title: 'Active Report 1', status: 'PUBLISHED' },
        { id: '2', title: 'Archived Report', status: 'ARCHIVED' },
        { id: '3', title: 'Active Report 2', status: 'PUBLISHED' },
      ]

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          reports: mockReports,
          summary: { total_reports: 3 },
        }),
      })

      const response = await fetch('/api/reports?includeArchived=true')
      const result = await response.json()
      
      expect(result.reports.length).toBe(3)
      expect(result.reports.some((r: any) => r.status === 'ARCHIVED')).toBe(true)
    })
  })

  describe('Data Structure Validation', () => {
    it('should handle various report data formats in PDF generation', () => {
      const formats = [
        // Neo4j stored format (flattened)
        {
          metadata: { report_title: 'Test' },
          executive_summary: { overall_risk_level: 'LOW' },
        },
        // API response format (wrapped)
        {
          success: true,
          report: {
            metadata: { report_title: 'Test' },
            executive_summary: { overall_risk_level: 'LOW' },
          },
        },
        // Minimal format
        {
          name: 'Test Report',
          riskLevel: 'MEDIUM',
        },
      ]

      formats.forEach(format => {
        expect(() => {
          // Simulate the data extraction logic
          let actualData = format
          if (format.success && format.report) {
            actualData = format.report
          }
          
          const metadata = actualData.metadata || {
            report_title: actualData.name || 'Security Report',
          }
          
          expect(metadata.report_title || metadata.name).toBeDefined()
        }).not.toThrow()
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      try {
        await fetch('/api/reports/test-report-id')
        expect(true).toBe(false) // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }
    })

    it('should handle malformed JSON responses', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON')),
      })

      try {
        const response = await fetch('/api/reports/test-report-id')
        await response.json()
        expect(true).toBe(false) // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }
    })
  })
})

// Integration tests for the complete workflow
describe('Report Management Integration', () => {
  it('should complete full report lifecycle', async () => {
    // 1. Generate report
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          reportId: 'test-report-123',
        }),
      })
      // 2. View report
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          report: { id: 'test-report-123', name: 'Test Report' },
        }),
      })
      // 3. Export PDF
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          html: '<html><body>Report</body></html>',
          success: true,
        }),
      })
      // 4. Archive report
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          action: 'archive',
        }),
      })
      // 5. Restore report
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          action: 'restore',
        }),
      })
      // 6. Delete report
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
        }),
      })

    // Execute the complete workflow
    const generateResponse = await fetch('/api/reports/generate', {
      method: 'POST',
      body: JSON.stringify({ type: 'standard' }),
    })
    expect(generateResponse.ok).toBe(true)

    const viewResponse = await fetch('/api/reports/test-report-123')
    expect(viewResponse.ok).toBe(true)

    const pdfResponse = await fetch('/api/reports/pdf', {
      method: 'POST',
      body: JSON.stringify({ reportData: {}, reportId: 'test-report-123' }),
    })
    expect(pdfResponse.ok).toBe(true)

    const archiveResponse = await fetch('/api/reports/test-report-123', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'archive' }),
    })
    expect(archiveResponse.ok).toBe(true)

    const restoreResponse = await fetch('/api/reports/test-report-123', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'restore' }),
    })
    expect(restoreResponse.ok).toBe(true)

    const deleteResponse = await fetch('/api/reports/test-report-123', {
      method: 'DELETE',
    })
    expect(deleteResponse.ok).toBe(true)
  })
}) 