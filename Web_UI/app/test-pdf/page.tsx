"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { generatePDFFromHTML, downloadReportAsPDF } from '@/lib/pdf-utils'
import { Shield, AlertTriangle, TrendingUp, Calendar, Clock, FileText } from 'lucide-react'

export default function TestPDFPage() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [testResults, setTestResults] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const addTestResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const testDirectHTML = async () => {
    try {
      setIsGenerating(true)
      setError(null)
      addTestResult('Starting direct HTML test...')

      const testHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Test PDF</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { font-size: 24px; font-weight: bold; margin-bottom: 20px; }
            .content { font-size: 16px; line-height: 1.6; }
            .card { background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 10px 0; }
            .red { color: red; }
            .green { color: green; }
            .blue { color: blue; }
          </style>
        </head>
        <body>
          <div class="header">PDF Generation Test</div>
          <div class="content">
            <div class="card">
              <h2>Test Section 1</h2>
              <p>This is a test paragraph with <span class="red">red text</span> and <span class="green">green text</span>.</p>
            </div>
            <div class="card">
              <h2>Test Section 2</h2>
              <p>This is another test paragraph with <span class="blue">blue text</span>.</p>
            </div>
          </div>
        </body>
        </html>
      `

      addTestResult('Calling generatePDFFromHTML...')
      await generatePDFFromHTML(testHTML, {
        filename: 'direct-test.pdf',
        quality: 1.0,
        margin: 10
      })
      addTestResult('✅ Direct HTML test successful!')

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      addTestResult(`❌ Direct HTML test failed: ${errorMsg}`)
      setError(errorMsg)
    } finally {
      setIsGenerating(false)
    }
  }

  const testAPIGeneration = async () => {
    try {
      setIsGenerating(true)
      setError(null)
      addTestResult('Starting API generation test...')

      const testData = {
        metadata: {
          report_title: 'Test Security Report',
          generated_by: 'LEVANT AI Security Platform',
          generation_date: new Date().toISOString(),
          report_version: '3.0',
          analysis_duration_hours: 24
        },
        executive_summary: {
          overall_risk_level: 'MEDIUM',
          critical_issues_count: 3,
          recommendations_priority: 'HIGH',
          key_findings: [
            'Test finding 1',
            'Test finding 2',
            'Test finding 3'
          ]
        },
        network_traffic_overview: {
          basic_stats: {
            total_flows: 1000,
            total_bytes: 50000000,
            total_packets: 10000
          },
          bandwidth_stats: {
            average_mbps: 25.5
          },
          top_sources: [
            { ip: '192.168.1.100', bytes: 10000000, flow_count: 100 }
          ],
          top_destinations: [
            { ip: '8.8.8.8', bytes: 5000000, flow_count: 50 }
          ],
          protocol_distribution: {
            'TCP': { flow_count: 800, total_bytes: 40000000, is_suspicious: false },
            'UDP': { flow_count: 200, total_bytes: 10000000, is_suspicious: false }
          }
        }
      }

      addTestResult('Calling PDF API...')
      const response = await fetch('/api/reports/pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reportData: testData })
      })

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`)
      }

      const result = await response.json()
      addTestResult(`✅ API returned HTML (${result.html.length} characters)`)

      addTestResult('Generating PDF from API HTML...')
      await generatePDFFromHTML(result.html, {
        filename: 'api-test.pdf',
        quality: 1.0,
        margin: 15
      })
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
                onClick={testDirectHTML}
                disabled={isGenerating}
                className="w-full"
              >
                Test Direct HTML
              </Button>
              <Button 
                onClick={testAPIGeneration}
                disabled={isGenerating}
                className="w-full"
              >
                Test API Generation
              </Button>
              <Button 
                onClick={testRealReport}
                disabled={isGenerating}
                className="w-full"
              >
                Test Real Report
              </Button>
              <Button 
                onClick={testCurrentPage}
                disabled={isGenerating}
                className="w-full"
              >
                Test Current Page
              </Button>
              <Button 
                onClick={clearResults}
                variant="outline"
                className="w-full"
              >
                Clear Results
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {testResults.map((result, index) => (
                  <div key={index} className="text-sm font-mono p-2 bg-gray-100 rounded">
                    {result}
                  </div>
                ))}
                {testResults.length === 0 && (
                  <div className="text-gray-500 text-center py-8">
                    No test results yet. Click a test button to start.
                  </div>
                )}
              </div>
              {error && (
                <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded text-red-700">
                  <strong>Error:</strong> {error}
                </div>
              )}
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