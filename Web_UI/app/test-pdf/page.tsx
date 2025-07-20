"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { generatePDFFromHTML, downloadReportAsPDF } from '@/lib/pdf-utils'
import { Shield, AlertTriangle, TrendingUp, Calendar, Clock, FileText } from 'lucide-react'

export default function TestPDFPage() {
  const [testResults, setTestResults] = useState<string[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, result])
  }

  const testRealReportStructure = async () => {
    try {
      setIsGenerating(true)
      setError(null)
      addTestResult('Testing with real report structure from wrapped_report.json...')

      // Use the actual report structure from your wrapped_report.json
      const testReportData = {
        success: true,
        report: {
          metadata: {
            report_title: "Test Network Traffic Analysis Report",
            reporting_period: "2024-05-31T07:36:19.896000+00:00 to 2024-05-31T11:06:19.029000+00:00",
            generated_by: "LEVANT AI Security Platform",
            generation_date: new Date().toISOString(),
            report_version: "3.0",
            analysis_duration_hours: 3.5,
            analysis_scope: "Normal network flows (excluding known malicious/honeypot traffic)"
          },
          executive_summary: {
            overall_risk_level: "MEDIUM",
            key_findings: [
              "High-severity port scanning detected",
              "High-severity data exfiltration detected"
            ],
            critical_issues_count: 2,
            recommendations_priority: "SCHEDULED"
          },
          network_traffic_overview: {
            basic_stats: {
              total_flows: 127473,
              total_bytes: 23990676301,
              total_packets: 38931511,
              avg_duration: 223.82
            },
            top_sources: [
              {
                ip: "10.183.3.60",
                bytes: 6534054600,
                flow_count: 9
              }
            ],
            protocol_breakdown: {
              protocol_6: {
                protocol_id: 6,
                flow_count: 98765,
                total_bytes: 12345678901,
                is_suspicious: false
              },
              protocol_17: {
                protocol_id: 17,
                flow_count: 28708,
                total_bytes: 11644997400,
                is_suspicious: false
              }
            }
          },
          security_findings: {
            port_scanning: {
              severity: "HIGH",
              count: 15,
              matching_flows: 1543,
              potential_scanners: [
                {
                  source_ip: "192.168.1.100",
                  ports_scanned: 25
                }
              ]
            }
          },
          recommendations_and_next_steps: {
            prioritized_recommendations: [
              {
                priority: "HIGH",
                category: "Network Security",
                finding: "Port scanning activity detected",
                recommendation: "Implement port scan detection and blocking",
                estimated_effort: "2-4 hours",
                timeline: "Immediate"
              }
            ]
          },
          ai_analysis: [
            {
              attack_technique: "T1046",
              confidence_score: 0.85,
              finding: "Network service scanning detected",
              business_impact: "Medium risk of reconnaissance",
              recommended_action: "Monitor and block suspicious scanning",
              timeline: "24-48 hours"
            }
          ]
        }
      }

      addTestResult('Sending test data to PDF API...')

      const pdfResponse = await fetch('/api/reports/pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          reportData: testReportData, 
          reportId: 'test-report-' + Date.now() 
        })
      })

      if (!pdfResponse.ok) {
        const errorText = await pdfResponse.text()
        throw new Error(`PDF API error: ${pdfResponse.status} - ${errorText}`)
      }

      const result = await pdfResponse.json()
      addTestResult(`✅ PDF API returned: ${result.success ? 'SUCCESS' : 'FAILED'}`)

      if (result.html) {
        addTestResult('Generating PDF from HTML...')
        await generatePDFFromHTML(result.html, 'test-real-structure.pdf')
        addTestResult('✅ Real structure test successful!')
      } else {
        throw new Error('No HTML returned from PDF API')
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      addTestResult(`❌ Real structure test failed: ${errorMsg}`)
      setError(errorMsg)
    } finally {
      setIsGenerating(false)
    }
  }

  const testAPIGeneration = async () => {
    try {
      setIsGenerating(true)
      setError(null)
      addTestResult('Starting PDF API generation test...')

      const testData = {
        metadata: {
          report_title: 'API Test Report',
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
          basic_stats: {
            total_flows: 1000,
            total_bytes: 50000000,
            total_packets: 75000,
            avg_duration: 120
          },
          protocol_breakdown: {
            tcp: { protocol_id: 6, flow_count: 800, total_bytes: 40000000, is_suspicious: false },
            udp: { protocol_id: 17, flow_count: 200, total_bytes: 10000000, is_suspicious: false }
          }
        }
      }

      const response = await fetch('/api/reports/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportData: testData, reportId: 'test-123' })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      addTestResult(`Received response: ${result.success ? 'Success' : 'Failed'}`)

      if (!result.html) {
        throw new Error('No HTML content in response')
      }

      await generatePDFFromHTML(result.html, 'api-test.pdf')
      addTestResult('✅ API generation test successful!')

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      addTestResult(`❌ API generation test failed: ${errorMsg}`)
      setError(errorMsg)
    } finally {
      setIsGenerating(false)
    }
  }

  const testRealReport = async () => {
    try {
      setIsGenerating(true)
      setError(null)
      addTestResult('Starting real report test...')

      // Use the first available report
      const reportResponse = await fetch('/api/reports')
      const reportsData = await reportResponse.json()
      
      if (!reportsData.reports || reportsData.reports.length === 0) {
        throw new Error('No reports available for testing')
      }

      const reportId = reportsData.reports[0].id
      addTestResult(`Using report ID: ${reportId}`)

      await downloadReportAsPDF(reportId)
      addTestResult('✅ Real report test successful!')

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      addTestResult(`❌ Real report test failed: ${errorMsg}`)
      setError(errorMsg)
    } finally {
      setIsGenerating(false)
    }
  }

  const testCurrentPage = async () => {
    try {
      setIsGenerating(true)
      setError(null)
      addTestResult('Starting current page test...')

      const testElement = document.getElementById('test-content')
      if (!testElement) {
        throw new Error('Test content element not found')
      }

      // Use html2canvas directly on the test element
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(testElement, {
        scale: 1.0,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: true,
        width: testElement.offsetWidth,
        height: testElement.offsetHeight
      })

      addTestResult(`Canvas created: ${canvas.width}x${canvas.height}`)

      // Create PDF from canvas
      const jsPDF = (await import('jspdf')).default
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      const imgData = canvas.toDataURL('image/png', 0.95)
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = 15
      const contentWidth = pageWidth - (margin * 2)
      const contentHeight = pageHeight - (margin * 2)
      
      const canvasAspectRatio = canvas.width / canvas.height
      const imgWidth = contentWidth
      const imgHeight = imgWidth / canvasAspectRatio

      pdf.addImage(
        imgData,
        'PNG',
        margin,
        margin,
        imgWidth,
        Math.min(imgHeight, contentHeight),
        '',
        'FAST'
      )

      pdf.save('current-page-test.pdf')
      addTestResult('✅ Current page test successful!')

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      addTestResult(`❌ Current page test failed: ${errorMsg}`)
      setError(errorMsg)
    } finally {
      setIsGenerating(false)
    }
  }

  const clearResults = () => {
    setTestResults([])
    setError(null)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">PDF Generation Test Suite</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Test Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={testRealReportStructure}
                disabled={isGenerating}
                className="w-full"
                variant="default"
              >
                {isGenerating ? 'Testing...' : 'Test Real Report Structure'}
              </Button>
              
              <Button 
                onClick={testAPIGeneration}
                disabled={isGenerating}
                className="w-full"
                variant="outline"
              >
                {isGenerating ? 'Testing...' : 'Test API Generation'}
              </Button>

              <Button 
                onClick={testRealReport}
                disabled={isGenerating}
                className="w-full"
                variant="secondary"
              >
                {isGenerating ? 'Testing...' : 'Test Real Report Download'}
              </Button>

              {error && (
                <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded text-red-700">
                  <strong>Error:</strong> {error}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {testResults.length === 0 ? (
                  <p className="text-gray-500 italic">No tests run yet</p>
                ) : (
                  testResults.map((result, index) => (
                  <div key={index} className="text-sm font-mono p-2 bg-gray-100 rounded">
                    {result}
                  </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Test Content for Visual Testing */}
        <Card id="test-content">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-6 w-6" />
              Sample Report Content
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-600">Risk Level</span>
                  </div>
                  <Badge variant="outline" className="border-yellow-200 text-yellow-700 bg-yellow-50">
                    MEDIUM
                  </Badge>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-600">Critical Issues</span>
                  </div>
                  <span className="text-2xl font-bold text-gray-900">3</span>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-600">Priority</span>
                  </div>
                  <Badge variant="outline" className="border-red-200 text-red-700 bg-red-50">
                    HIGH
                  </Badge>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Key Findings</h3>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span>Multiple port scanning attempts detected from external sources</span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span>Suspicious data transfer patterns identified</span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span>Potential insider threat activity requires investigation</span>
                  </li>
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Network Statistics</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Total Flows:</span>
                      <span className="font-medium">1,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Bytes:</span>
                      <span className="font-medium">50 MB</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Avg Bandwidth:</span>
                      <span className="font-medium">25.5 Mbps</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Security Metrics</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Threats Detected:</span>
                      <span className="font-medium text-red-600">5</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Blocked Attempts:</span>
                      <span className="font-medium text-green-600">12</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Risk Score:</span>
                      <span className="font-medium text-yellow-600">7.2/10</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 