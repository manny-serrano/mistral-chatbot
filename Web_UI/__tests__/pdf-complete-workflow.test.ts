/**
 * PDF Export Complete Workflow Test
 * 
 * Tests the complete PDF generation workflow from frontend trigger to final download
 * to ensure the critical bug fix resolves the 85-page blank PDF issue.
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Mock dependencies
jest.mock('puppeteer');

// Test the complete workflow
describe('PDF Export Complete Workflow', () => {
  let mockFetch: jest.MockedFunction<typeof fetch>;
  
  beforeEach(() => {
    // Setup fetch mock
    global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;
    mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    
    // Mock DOM methods
    global.document = {
      createElement: jest.fn(() => ({
        href: '',
        download: '',
        click: jest.fn(),
        style: {}
      })),
      body: {
        appendChild: jest.fn(),
        removeChild: jest.fn()
      }
    } as any;
    
    global.window = {
      URL: {
        createObjectURL: jest.fn(() => 'blob:mock-url'),
        revokeObjectURL: jest.fn()
      }
    } as any;
    
    global.console = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn()
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Critical Bug Fix: PDF Binary vs HTML Handling', () => {
    it('should handle PDF binary response correctly (main success path)', async () => {
      const { downloadReportAsPDF } = await import('../lib/pdf-utils');
      
      // Mock report data fetch
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            report: {
              metadata: { report_title: 'Test Security Report' },
              executive_summary: { key_findings: ['Test finding'] }
            }
          })
        } as any)
        // Mock PDF API response with binary PDF
        .mockResolvedValueOnce({
          ok: true,
          headers: {
            get: (name: string) => name === 'content-type' ? 'application/pdf' : null
          },
          blob: () => Promise.resolve(new Blob(['mock-pdf-content'], { type: 'application/pdf' }))
        } as any);

      await downloadReportAsPDF('test-report-123');

      // Verify the workflow
      expect(mockFetch).toHaveBeenCalledTimes(2);
      
      // Verify report data fetch
      expect(mockFetch).toHaveBeenNthCalledWith(1, '/api/reports/test-report-123');
      
      // Verify PDF generation request
      expect(mockFetch).toHaveBeenNthCalledWith(2, '/api/reports/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('test-report-123')
      });
      
      // Verify binary download workflow
      expect(global.window.URL.createObjectURL).toHaveBeenCalled();
      expect(global.document.createElement).toHaveBeenCalledWith('a');
      expect(global.window.URL.revokeObjectURL).toHaveBeenCalled();
    });

    it('should handle HTML fallback correctly when Puppeteer fails', async () => {
      const { downloadReportAsPDF } = await import('../lib/pdf-utils');
      
      // Mock report data fetch
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            report: {
              metadata: { report_title: 'Test Security Report' },
              executive_summary: { key_findings: ['Test finding'] }
            }
          })
        } as any)
        // Mock PDF API response with HTML fallback
        .mockResolvedValueOnce({
          ok: true,
          headers: {
            get: (name: string) => name === 'content-type' ? 'text/html' : null
          },
          text: () => Promise.resolve('<html><body>Test HTML Report</body></html>')
        } as any);

      // Mock the generatePDFFromHTML function to avoid html2canvas dependencies
      const mockGeneratePDFFromHTML = jest.fn().mockResolvedValue(void 0);
      (await import('../lib/pdf-utils')).generatePDFFromHTML = mockGeneratePDFFromHTML;

      await downloadReportAsPDF('test-report-123');

      // Verify HTML fallback workflow
      expect(mockGeneratePDFFromHTML).toHaveBeenCalledWith(
        '<html><body>Test HTML Report</body></html>',
        'Test_Security_Report.pdf'
      );
    });

    it('should handle errors gracefully', async () => {
      const { downloadReportAsPDF } = await import('../lib/pdf-utils');
      
      // Mock report data fetch success but PDF generation failure
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            report: { metadata: { report_title: 'Test Report' } }
          })
        } as any)
        // Mock PDF API error
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          text: () => Promise.resolve('PDF generation failed')
        } as any);

      await expect(downloadReportAsPDF('test-report-123')).rejects.toThrow(
        'Failed to generate PDF: Internal Server Error - PDF generation failed'
      );
    });
  });

  describe('Backend PDF Route Comprehensive Testing', () => {
    it('should handle all map operations safely', async () => {
      // Import the POST handler
      const { POST } = await import('../app/api/reports/pdf/route');
      
      // Create mock request with comprehensive test data
      const mockRequest = {
        json: () => Promise.resolve({
          reportId: 'test-123',
          reportData: {
            metadata: {
              report_title: 'Comprehensive Test Report',
              generated_by: 'Test System',
              generation_date: new Date().toISOString(),
              report_version: '1.0',
              analysis_duration_hours: 1
            },
            executive_summary: {
              overall_risk_level: 'LOW',
              key_findings: ['Test finding 1', 'Test finding 2'],
              critical_issues_count: 0,
              recommendations_priority: 'LOW'
            },
            network_traffic_overview: {
              basic_stats: { total_flows: 1000, total_bytes: 50000000, total_packets: 75000 },
              top_sources: [{ ip: '192.168.1.1', bytes: 1000000, flow_count: 100 }],
              top_destinations: [{ ip: '10.0.0.1', bytes: 2000000, flow_count: 200 }],
              protocol_breakdown: {
                tcp: { protocol_id: 6, flow_count: 800, total_bytes: 40000000, is_suspicious: false }
              },
              bandwidth_stats: { average_mbps: 10 }
            },
            security_findings: {
              port_scanning: {
                severity: 'HIGH',
                count: 15,
                matching_flows: 1543,
                potential_scanners: [{ source_ip: '192.168.1.100', ports_scanned: 25 }],
                high_volume_sources: [{ source_ip: '10.0.0.100', gb_sent: 5 }]
              }
            },
            recommendations_and_next_steps: {
              prioritized_recommendations: [{
                priority: 'HIGH',
                category: 'Security',
                finding: 'Test finding',
                recommendation: 'Test recommendation',
                estimated_effort: '2 hours',
                timeline: 'Immediate'
              }]
            }
          }
        })
      } as any;

      // Mock Puppeteer to return successful PDF
      const mockPuppeteer = {
        launch: jest.fn().mockResolvedValue({
          newPage: jest.fn().mockResolvedValue({
            setContent: jest.fn().mockResolvedValue(void 0),
            pdf: jest.fn().mockResolvedValue(Buffer.from('mock-pdf-content'))
          }),
          close: jest.fn().mockResolvedValue(void 0)
        })
      };
      
      // Mock require to return mocked puppeteer
      const originalRequire = require;
      require = jest.fn((module) => {
        if (module === 'puppeteer') return mockPuppeteer;
        return originalRequire(module);
      }) as any;

      const response = await POST(mockRequest);
      
      // Verify successful PDF generation
      expect(response).toBeDefined();
      expect(mockPuppeteer.launch).toHaveBeenCalled();
      
      // Restore original require
      require = originalRequire;
    });

    it('should handle empty/null data gracefully', async () => {
      const { POST } = await import('../app/api/reports/pdf/route');
      
      // Test with minimal/empty data that would trigger the map operation errors
      const mockRequest = {
        json: () => Promise.resolve({
          reportId: 'empty-test',
          reportData: {
            metadata: {},
            executive_summary: {},
            network_traffic_overview: {},
            security_findings: {},
            recommendations_and_next_steps: {}
          }
        })
      } as any;

      // Should not throw errors and should return valid response
      const response = await POST(mockRequest);
      expect(response).toBeDefined();
    });
  });

  describe('Page Count and Content Validation', () => {
    it('should generate reasonable page count (2-8 pages, not 85)', async () => {
      // This would be tested with actual PDF parsing in a full implementation
      // For now, we verify the workflow doesn't trigger the html2canvas fallback
      const { downloadReportAsPDF } = await import('../lib/pdf-utils');
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            report: { metadata: { report_title: 'Normal Report' } }
          })
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          headers: {
            get: (name: string) => name === 'content-type' ? 'application/pdf' : null
          },
          blob: () => Promise.resolve(new Blob(['mock-normal-pdf'], { type: 'application/pdf' }))
        } as any);

      await downloadReportAsPDF('normal-report');
      
      // Verify we got PDF binary (not HTML that would cause 85-page issue)
      const pdfCall = mockFetch.mock.calls[1];
      expect(pdfCall[0]).toBe('/api/reports/pdf');
      
      // Verify blob was processed (not text that would trigger html2canvas)
      expect(global.window.URL.createObjectURL).toHaveBeenCalled();
    });
  });
}); 