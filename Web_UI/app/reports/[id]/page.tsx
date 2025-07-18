"use client"

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Download, Printer } from 'lucide-react'
import { downloadReportAsPDF } from '@/lib/pdf-utils'
import { ReportData, extractReportData, isValidReportData } from '@/lib/report-types'

// Import modular components
import { ReportHeader } from '@/components/reports/ReportHeader'
import { ExecutiveSummary } from '@/components/reports/ExecutiveSummary'
import { NetworkAnalysis } from '@/components/reports/NetworkAnalysis'
import { SecurityFindings } from '@/components/reports/SecurityFindings'
import { Recommendations } from '@/components/reports/Recommendations'
import { DataSourcesConfiguration } from '@/components/reports/DataSourcesConfiguration'
import { ComplianceGovernance } from '@/components/reports/ComplianceGovernance'
import { AIAnalysis } from '@/components/reports/AIAnalysis'

export default function ReportViewerPage() {
  const params = useParams()
  const reportId = params.id as string
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloadingPDF, setDownloadingPDF] = useState(false)

  useEffect(() => {
    fetchReport()
  }, [reportId])

  const fetchReport = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/reports/${reportId}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      // Extract and validate report data using our type system
      const extractedData = extractReportData(data.report)
      
      if (!isValidReportData(extractedData)) {
        console.warn('Report validation failed - using extracted data anyway')
      }
      
      setReport(extractedData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report')
      console.error('Error fetching report:', err)
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleDownload = async () => {
    try {
      setDownloadingPDF(true)
      setError(null) // Clear any previous errors
      
      // Show progress toast
      const { toast } = await import('@/components/ui/use-toast')
      toast({
        title: 'PDF Generation',
        description: 'Generating PDF report... This may take a few moments.',
      })
      
      await downloadReportAsPDF(reportId)
      
      // Show success toast
      toast({
        title: 'PDF Ready',
        description: 'Your PDF report has been downloaded successfully.',
      })
      
    } catch (error) {
      console.error('Error downloading PDF:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to download PDF. Please try again.'
      setError(errorMessage)
      
      // Show error toast
      const { toast } = await import('@/components/ui/use-toast')
      toast({
        title: 'PDF Generation Failed',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setDownloadingPDF(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto p-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <span className="ml-3 text-gray-600">Loading report...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto p-8">
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">Error loading report: {error}</p>
            <Link href="/reports">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Reports
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto p-8">
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">Report not found</p>
            <Link href="/reports">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Reports
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header - No Print */}
      <div className="print:hidden border-b bg-gray-50">
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex items-center justify-between">
            <Link href="/reports">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Reports
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDownload}
                disabled={downloadingPDF}
              >
                <Download className={`h-4 w-4 mr-2 ${downloadingPDF ? 'animate-spin' : ''}`} />
                {downloadingPDF ? 'Generating PDF...' : 'Download PDF'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div className="max-w-4xl mx-auto p-8 print:p-6">
        {/* Report Header */}
        <ReportHeader metadata={report.metadata} />

        {/* Executive Summary */}
        <ExecutiveSummary summary={report.executive_summary} />
        <Separator className="my-8 print:my-6" />

        {/* Network Traffic Analysis */}
        <NetworkAnalysis networkData={report.network_traffic_overview} />
        <Separator className="my-8 print:my-6" />

        {/* Security Findings */}
        <SecurityFindings findings={report.security_findings} />
        <Separator className="my-8 print:my-6" />

        {/* Data Sources & Configuration */}
        {report.data_sources_and_configuration && (
          <>
            <DataSourcesConfiguration data={report.data_sources_and_configuration} />
            <Separator className="my-8 print:my-6" />
          </>
        )}

        {/* Compliance & Governance */}
        {report.compliance_and_governance && (
          <>
            <ComplianceGovernance data={report.compliance_and_governance} />
            <Separator className="my-8 print:my-6" />
          </>
        )}

        {/* AI Analysis */}
        {report.ai_analysis && report.ai_analysis.length > 0 && (
          <>
            <AIAnalysis analysis={report.ai_analysis} />
            <Separator className="my-8 print:my-6" />
          </>
        )}

        {/* Recommendations */}
        <Recommendations recommendations={report.recommendations_and_next_steps} />

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-gray-200 text-center text-sm text-gray-500 print:mt-8">
          <p>This report was automatically generated by LEVANT AI Security Platform</p>
          <p className="mt-1">Report ID: {reportId}</p>
        </div>
      </div>
    </div>
  )
} 