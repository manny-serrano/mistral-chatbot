"use client"

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Download, Printer, FileText, Calendar, Clock, Shield, Database, TrendingUp, AlertTriangle } from 'lucide-react'
import { downloadReportAsPDF, generatePDFFromCurrentPage } from '@/lib/pdf-utils'

interface ReportData {
  metadata: {
    report_title: string
    reporting_period: string
    generated_by: string
    generation_date: string
    report_version: string
    analysis_duration_hours: number
    analysis_scope: string
    threat_detection_method: string
  }
  executive_summary: {
    overall_risk_level: string
    key_findings: string[]
    critical_issues_count: number
    recommendations_priority: string
  }
  network_traffic_overview: {
    basic_stats: {
      total_flows: number
      total_bytes: number
      total_packets: number
      avg_duration: number
    }
    top_sources: Array<{
      ip: string
      bytes: number
      flow_count: number
    }>
    top_destinations: Array<{
      ip: string
      bytes: number
      flow_count: number
    }>
    protocol_breakdown: Record<string, {
      protocol_id: number
      flow_count: number
      total_bytes: number
      is_suspicious: boolean
    }>
    bandwidth_stats: {
      total_bytes: number
      average_mbps: number
      duration_seconds: number
    }
  }
  security_findings: Record<string, any>
  recommendations_and_next_steps: {
    prioritized_recommendations: Array<{
      priority: string
      category: string
      finding: string
      recommendation: string
      estimated_effort: string
      timeline: string
    }>
  }
  ai_analysis?: Array<{
    finding: string
    attack_technique: string
    confidence_score: number
    business_impact: string
    recommended_action: string
    timeline: string
  }>
}

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
      setReport(data.report)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report')
      console.error('Error fetching report:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handlePrint = () => {
    window.print()
  }

  const handleDownload = async () => {
    try {
      setDownloadingPDF(true)
      await downloadReportAsPDF(reportId)
    } catch (error) {
      console.error('Error downloading PDF:', error)
      setError('Failed to download PDF. Please try again.')
    } finally {
      setDownloadingPDF(false)
    }
  }

  // Map of protocol numbers to names (subset for display)
  const PROTOCOL_MAP: Record<number, string> = {
    1: 'ICMP',
    2: 'IGMP',
    6: 'TCP',
    17: 'UDP',
    41: 'IPv6',
    47: 'GRE',
    50: 'ESP',
    51: 'AH',
    58: 'ICMPv6',
    89: 'OSPF',
    112: 'VRRP',
  }

  const getProtocolName = (protoKey: string, protoData: any): string => {
    // Prefer explicit ID from data if present
    if (protoData && typeof protoData.protocol_id === 'number') {
      const name = PROTOCOL_MAP[protoData.protocol_id]
      if (name) return name
    }

    // Handle keys like "Protocol_112"
    const match = protoKey.match(/(?:protocol_)?(\d+)/i)
    if (match) {
      const id = Number(match[1])
      return PROTOCOL_MAP[id] || `Protocol ${id}`
    }

    // Not numeric, just return capitalized
    return protoKey.toUpperCase()
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
        <div className="text-center mb-8 print:mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 print:text-2xl">
            {report.metadata.report_title}
          </h1>
          <p className="text-lg text-gray-600 mb-4 print:text-base">
            Generated by {report.metadata.generated_by}
          </p>
          <div className="flex items-center justify-center gap-6 text-sm text-gray-500 print:gap-4">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              {formatDate(report.metadata.generation_date)}
            </div>
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              {report.metadata.analysis_duration_hours} hour analysis
            </div>
            <div className="flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Version {report.metadata.report_version}
            </div>
          </div>
        </div>

        <Separator className="mb-8 print:mb-6" />

        {/* Executive Summary */}
        <section className="mb-8 print:mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 print:text-xl">Executive Summary</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 print:grid-cols-3">
            <div className="bg-gray-50 p-4 rounded-lg print:border print:bg-white">
              <div className="flex items-center mb-2">
                <Shield className="h-5 w-5 text-gray-600 mr-2" />
                <span className="text-sm font-medium text-gray-600">Risk Level</span>
              </div>
              <Badge 
                variant="outline"
                className={`text-sm ${
                  report.executive_summary.overall_risk_level === 'HIGH' 
                    ? 'border-red-200 text-red-700 bg-red-50' 
                    : report.executive_summary.overall_risk_level === 'MEDIUM'
                    ? 'border-yellow-200 text-yellow-700 bg-yellow-50'
                    : 'border-green-200 text-green-700 bg-green-50'
                }`}
              >
                {report.executive_summary.overall_risk_level}
              </Badge>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg print:border print:bg-white">
              <div className="flex items-center mb-2">
                <AlertTriangle className="h-5 w-5 text-gray-600 mr-2" />
                <span className="text-sm font-medium text-gray-600">Critical Issues</span>
              </div>
              <span className="text-2xl font-bold text-gray-900">
                {report.executive_summary.critical_issues_count}
              </span>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg print:border print:bg-white">
              <div className="flex items-center mb-2">
                <TrendingUp className="h-5 w-5 text-gray-600 mr-2" />
                <span className="text-sm font-medium text-gray-600">Priority</span>
              </div>
              <Badge variant="outline" className="text-sm">
                {report.executive_summary.recommendations_priority}
              </Badge>
            </div>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mb-3">Key Findings</h3>
          <ul className="space-y-2">
            {report.executive_summary.key_findings.map((finding, index) => (
              <li key={index} className="flex items-start">
                <span className="w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                <span className="text-gray-700">{finding}</span>
              </li>
            ))}
          </ul>
        </section>

        <Separator className="mb-8 print:mb-6" />

        {/* Network Traffic Overview */}
        <section className="mb-8 print:mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 print:text-xl">Network Traffic Analysis</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 print:grid-cols-4">
            <div className="bg-gray-50 p-4 rounded-lg print:border print:bg-white">
              <h4 className="text-sm font-medium text-gray-600 mb-1">Total Flows</h4>
              <p className="text-xl font-bold text-gray-900">
                {report.network_traffic_overview.basic_stats.total_flows.toLocaleString()}
              </p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg print:border print:bg-white">
              <h4 className="text-sm font-medium text-gray-600 mb-1">Total Data</h4>
              <p className="text-xl font-bold text-gray-900">
                {formatBytes(report.network_traffic_overview.basic_stats.total_bytes)}
              </p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg print:border print:bg-white">
              <h4 className="text-sm font-medium text-gray-600 mb-1">Total Packets</h4>
              <p className="text-xl font-bold text-gray-900">
                {report.network_traffic_overview.basic_stats.total_packets.toLocaleString()}
              </p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg print:border print:bg-white">
              <h4 className="text-sm font-medium text-gray-600 mb-1">Avg Bandwidth</h4>
              <p className="text-xl font-bold text-gray-900">
                {report.network_traffic_overview.bandwidth_stats.average_mbps} Mbps
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Top Sources */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Top Traffic Sources</h3>
              <div className="space-y-2">
                {report.network_traffic_overview.top_sources.slice(0, 5).map((source, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded print:border print:bg-white">
                    <span className="font-mono text-sm text-gray-700">{source.ip}</span>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">{formatBytes(source.bytes)}</div>
                      <div className="text-xs text-gray-500">{source.flow_count} flows</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Destinations */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Top Traffic Destinations</h3>
              <div className="space-y-2">
                {report.network_traffic_overview.top_destinations.slice(0, 5).map((dest, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded print:border print:bg-white">
                    <span className="font-mono text-sm text-gray-700">{dest.ip}</span>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">{formatBytes(dest.bytes)}</div>
                      <div className="text-xs text-gray-500">{dest.flow_count} flows</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Protocol Breakdown */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Protocol Distribution</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(report.network_traffic_overview.protocol_breakdown).slice(0, 6).map(([protocol, data]) => (
                <div key={protocol} className="p-3 bg-gray-50 rounded print:border print:bg-white">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">{getProtocolName(protocol, data)}</span>
                    {data.is_suspicious && (
                      <Badge variant="outline" className="text-xs border-yellow-200 text-yellow-700 bg-yellow-50">
                        Suspicious
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-gray-600">
                    {data.flow_count.toLocaleString()} flows • {formatBytes(data.total_bytes)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Separator className="mb-8 print:mb-6" />

        {/* Security Findings */}
        <section className="mb-8 print:mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 print:text-xl">Security Analysis</h2>
          
          {Object.entries(report.security_findings).map(([category, findings]) => {
            if (typeof findings !== 'object' || !findings) return null
            
            return (
              <div key={category} className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 capitalize">
                  {category.replace(/_/g, ' ')}
                </h3>
                
                <div className="bg-gray-50 p-4 rounded-lg print:border print:bg-white">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <span className="text-sm text-gray-600">Severity</span>
                      <Badge 
                        variant="outline" 
                        className={`ml-2 text-xs ${
                          findings.severity === 'HIGH' 
                            ? 'border-red-200 text-red-700 bg-red-50'
                            : findings.severity === 'MEDIUM'
                            ? 'border-yellow-200 text-yellow-700 bg-yellow-50'
                            : 'border-green-200 text-green-700 bg-green-50'
                        }`}
                      >
                        {findings.severity}
                      </Badge>
                    </div>
                    {findings.count !== undefined && (
                      <div>
                        <span className="text-sm text-gray-600">Count: </span>
                        <span className="font-medium">{findings.count}</span>
                      </div>
                    )}
                    {findings.matching_flows !== undefined && (
                      <div>
                        <span className="text-sm text-gray-600">Matching Flows: </span>
                        <span className="font-medium">{findings.matching_flows}</span>
                      </div>
                    )}
                  </div>
                  
                  {findings.potential_scanners && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Potential Scanners Detected</h4>
                      <div className="space-y-1">
                        {findings.potential_scanners.slice(0, 5).map((scanner: any, index: number) => (
                          <div key={index} className="text-sm text-gray-700">
                            <span className="font-mono">{scanner.source_ip}</span> - {scanner.ports_scanned} ports scanned
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {findings.high_volume_sources && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">High Volume Sources</h4>
                      <div className="space-y-1">
                        {findings.high_volume_sources.slice(0, 5).map((source: any, index: number) => (
                          <div key={index} className="text-sm text-gray-700">
                            <span className="font-mono">{source.source_ip}</span> - {source.gb_sent} GB transferred
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </section>

        <Separator className="mb-8 print:mb-6" />

        {/* Recommendations */}
        <section className="mb-8 print:mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 print:text-xl">Recommendations</h2>
          
          <div className="space-y-4">
            {report.recommendations_and_next_steps.prioritized_recommendations.map((rec, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 print:break-inside-avoid">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-base font-semibold text-gray-900">{rec.category}</h3>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${
                      rec.priority === 'IMMEDIATE' 
                        ? 'border-red-200 text-red-700 bg-red-50'
                        : rec.priority === 'SCHEDULED'
                        ? 'border-yellow-200 text-yellow-700 bg-yellow-50'
                        : 'border-blue-200 text-blue-700 bg-blue-50'
                    }`}
                  >
                    {rec.priority}
                  </Badge>
                </div>
                
                <p className="text-sm text-gray-700 mb-2">
                  <strong>Finding:</strong> {rec.finding}
                </p>
                
                <p className="text-sm text-gray-700 mb-2">
                  <strong>Recommendation:</strong> {rec.recommendation}
                </p>
                
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span><strong>Effort:</strong> {rec.estimated_effort}</span>
                  <span><strong>Timeline:</strong> {rec.timeline}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* AI Analysis */}
        {report.ai_analysis && report.ai_analysis.length > 0 && (
          <>
            <Separator className="mb-8 print:mb-6" />
            
            <section className="mb-8 print:mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 print:text-xl">AI Security Analysis</h2>
              
              <div className="space-y-4">
                {report.ai_analysis.map((analysis, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 print:break-inside-avoid">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xs text-gray-500">MITRE ATT&CK: {analysis.attack_technique}</span>
                      <span className="text-xs text-gray-500">
                        Confidence: {Math.round(analysis.confidence_score * 100)}%
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-700 mb-2">
                      <strong>Finding:</strong> {analysis.finding}
                    </p>
                    
                    <p className="text-sm text-gray-700 mb-2">
                      <strong>Business Impact:</strong> {analysis.business_impact}
                    </p>
                    
                    <p className="text-sm text-gray-700 mb-2">
                      <strong>Recommended Action:</strong> {analysis.recommended_action}
                    </p>
                    
                    <div className="text-xs text-gray-500">
                      <strong>Timeline:</strong> {analysis.timeline}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-gray-200 text-center text-sm text-gray-500 print:mt-8">
          <p>This report was automatically generated by LEVANT AI Security Platform</p>
          <p className="mt-1">Report ID: {reportId}</p>
        </div>
      </div>
    </div>
  )
} 