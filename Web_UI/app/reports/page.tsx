"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  ShieldCheck,
  FileText,
  Download,
  Calendar,
  TrendingUp,
  AlertTriangle,
  Shield,
  Activity,
  Clock,
  BarChart3,
  PieChart,
  LineChart,
  FileBarChart,
  Settings,
  Eye,
  Share,
  RefreshCw,
  CheckCircle,
  Users,
  Globe,
  Database,
  Zap,
} from "lucide-react"
import { ProfileDropdown } from "@/components/profile-dropdown"

interface ReportData {
  id: string
  title: string
  type: string
  date: string
  status: string
  size: string
  filename: string
  duration_hours: number
  risk_level: string
  flows_analyzed: number
  generated_by: string
}

interface ReportSummary {
  total_reports: number
  completed_reports: number
  failed_reports: number
  total_flows_analyzed: number
  latest_report: ReportData
  risk_distribution: {
    HIGH: number
    MEDIUM: number
    LOW: number
  }
}

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportData[]>([])
  const [summary, setSummary] = useState<ReportSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchReports()
  }, [])

  const fetchReports = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/reports')
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      setReports(data.reports || [])
      setSummary(data.summary || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports')
      console.error('Error fetching reports:', err)
    } finally {
      setLoading(false)
    }
  }

  const generateReport = async (duration_hours: number = 24) => {
    try {
      setLoading(true)
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ duration_hours }),
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      if (result.success) {
        // Refresh the reports list
        await fetchReports()
      } else {
        throw new Error(result.error || 'Failed to generate report')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report')
      console.error('Error generating report:', err)
    } finally {
      setLoading(false)
    }
  }

  const downloadReport = async (reportId: string) => {
    try {
      const response = await fetch(`/api/reports/download?id=${reportId}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${reportId}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download report')
      console.error('Error downloading report:', err)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <main className="flex min-h-screen flex-col bg-gradient-to-br from-black via-purple-950/40 to-gray-950 text-zinc-100 relative">
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>

      <header className="border-b border-purple-500/20 bg-black/80 backdrop-blur-xl sticky top-0 z-50 relative">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="rounded-md bg-gradient-to-r from-purple-500 to-violet-500 p-1.5 shadow-lg shadow-purple-500/25">
                <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                CyberSense AI
              </h1>
            </Link>

            {/* Centered Navigation */}
            <div className="absolute left-1/2 transform -translate-x-1/2">
              <nav className="flex items-center gap-2 sm:gap-4 md:gap-6">
                <Link
                  href="/dashboard"
                  className="text-xs sm:text-sm font-medium text-zinc-400 hover:text-purple-300 transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/chat"
                  className="text-xs sm:text-sm font-medium text-zinc-400 hover:text-purple-300 transition-colors"
                >
                  Chat
                </Link>
                <Link
                  href="/alerts"
                  className="text-xs sm:text-sm font-medium text-zinc-400 hover:text-purple-300 transition-colors"
                >
                  Alerts
                </Link>
                <span className="text-xs sm:text-sm font-medium text-purple-300">Reports</span>
                <Link
                  href="/visualization"
                  className="text-xs sm:text-sm font-medium text-zinc-400 hover:text-purple-300 transition-colors"
                >
                  <span className="hidden sm:inline">Visualization</span>
                  <span className="sm:hidden">Visual</span>
                </Link>
              </nav>
            </div>

            <ProfileDropdown />
          </div>
        </div>
      </header>

      {/* Main Content - Responsive */}
      <main className="relative py-6 sm:py-8">
        {/* Enhanced background for better contrast */}
        <div className="absolute inset-0 bg-gradient-to-r from-gray-950/90 via-purple-950/50 to-gray-950/90" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/40 via-transparent to-transparent" />

        <div className="relative mx-auto max-w-7xl px-3 sm:px-6">
          {/* Page Header - Responsive */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-purple-500/20 p-2 sm:p-3 border border-purple-400/30 backdrop-blur-sm">
                  <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-purple-300" />
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold text-white">Security Reports</h1>
                  <p className="text-base sm:text-lg text-zinc-200 mt-1">Generate and analyze comprehensive security reports</p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-purple-400/40 text-zinc-200 hover:bg-purple-900/40 bg-transparent backdrop-blur-sm text-xs sm:text-sm"
                  onClick={fetchReports}
                  disabled={loading}
                >
                  <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button 
                  size="sm" 
                  className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-xs sm:text-sm"
                  onClick={() => generateReport(24)}
                  disabled={loading}
                >
                  <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Generate Report
                </Button>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Reports Tabs - Responsive */}
          <Tabs defaultValue="overview" className="space-y-4 sm:space-y-6">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 bg-gray-900/80 border border-purple-500/20 backdrop-blur-xl">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-xs sm:text-sm"
              >
                <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="threats" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-xs sm:text-sm">
                <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Threats
              </TabsTrigger>
              <TabsTrigger
                value="incidents"
                className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-xs sm:text-sm"
              >
                <Shield className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Incidents
              </TabsTrigger>
              <TabsTrigger
                value="compliance"
                className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-xs sm:text-sm"
              >
                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Compliance
              </TabsTrigger>
              <TabsTrigger value="custom" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-xs sm:text-sm col-span-2 sm:col-span-1">
                <FileBarChart className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Custom
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab - Responsive */}
            <TabsContent value="overview" className="space-y-4 sm:space-y-6">
              {/* Quick Stats - Responsive Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <Card className="bg-gray-900/80 border-purple-400/40 backdrop-blur-xl">
                  <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs sm:text-sm font-medium text-zinc-300">Total Reports</CardTitle>
                      <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-purple-400" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6 pt-0">
                    <div className="text-xl sm:text-2xl font-bold text-white">
                      {loading ? '...' : summary?.total_reports || 0}
                    </div>
                    <p className="text-xs text-zinc-300 mt-1">
                      {loading ? 'Loading...' : 'Cybersecurity reports'}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gray-900/80 border-violet-400/40 backdrop-blur-xl">
                  <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs sm:text-sm font-medium text-zinc-300">Completed Reports</CardTitle>
                      <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-violet-400" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6 pt-0">
                    <div className="text-xl sm:text-2xl font-bold text-white">
                      {loading ? '...' : summary?.completed_reports || 0}
                    </div>
                    <p className="text-xs text-zinc-300 mt-1">
                      {loading ? 'Loading...' : 'Successfully generated'}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gray-900/80 border-fuchsia-400/40 backdrop-blur-xl">
                  <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs sm:text-sm font-medium text-zinc-300">Total Flows Analyzed</CardTitle>
                      <Activity className="h-3 w-3 sm:h-4 sm:w-4 text-fuchsia-400" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6 pt-0">
                    <div className="text-xl sm:text-2xl font-bold text-white">
                      {loading ? '...' : summary?.total_flows_analyzed?.toLocaleString() || 0}
                    </div>
                    <p className="text-xs text-zinc-300 mt-1">
                      {loading ? 'Loading...' : 'Network flows processed'}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gray-900/80 border-green-400/40 backdrop-blur-xl">
                  <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs sm:text-sm font-medium text-zinc-300">Data Coverage</CardTitle>
                      <Database className="h-3 w-3 sm:h-4 sm:w-4 text-green-400" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6 pt-0">
                    <div className="text-xl sm:text-2xl font-bold text-white">
                      {loading ? '...' : (summary?.total_reports && summary.total_reports > 0) ? '100%' : '0%'}
                    </div>
                    <p className="text-xs text-zinc-300 mt-1">
                      {loading ? 'Loading...' : 'Network visibility'}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Reports - Responsive */}
              <Card className="bg-gray-900/80 border-purple-400/40 backdrop-blur-xl">
                <CardHeader className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base sm:text-lg font-semibold text-white">Recent Reports</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-purple-400/40 text-zinc-200 hover:bg-purple-900/40 bg-transparent backdrop-blur-sm text-xs"
                      onClick={fetchReports}
                      disabled={loading}
                    >
                      <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                    </div>
                  ) : reports.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-zinc-400">No reports found. Generate your first report to get started.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 sm:space-y-4">
                      {reports.slice(0, 5).map((report) => (
                        <div
                          key={report.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-gray-800/50 rounded-lg border border-purple-500/20 hover:bg-gray-800/70 transition-colors"
                        >
                          <div className="flex items-center gap-3 mb-2 sm:mb-0">
                            <div className="p-2 bg-purple-500/20 rounded-lg">
                              <FileText className="h-4 w-4 text-purple-300" />
                            </div>
                            <div>
                              <h4 className="font-medium text-white text-sm sm:text-base truncate">
                                {report.title}
                              </h4>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-zinc-400">{report.type}</span>
                                <Separator orientation="vertical" className="h-3 bg-zinc-600" />
                                <span className="text-xs text-zinc-400">{formatDate(report.date)}</span>
                                <Separator orientation="vertical" className="h-3 bg-zinc-600" />
                                <span className="text-xs text-zinc-400">{report.size}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={report.status === 'completed' ? 'default' : 'secondary'}
                              className={`text-xs ${
                                report.status === 'completed'
                                  ? 'bg-green-500/20 text-green-300 border-green-500/30'
                                  : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                              }`}
                            >
                              {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                report.risk_level === 'HIGH'
                                  ? 'border-red-500/30 text-red-300'
                                  : report.risk_level === 'MEDIUM'
                                  ? 'border-yellow-500/30 text-yellow-300'
                                  : 'border-green-500/30 text-green-300'
                              }`}
                            >
                              {report.risk_level} Risk
                            </Badge>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-zinc-400 hover:text-white hover:bg-purple-900/40"
                                onClick={() => downloadReport(report.id)}
                              >
                                <Download className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-zinc-400 hover:text-white hover:bg-purple-900/40"
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Threats Tab - Responsive */}
            <TabsContent value="threats" className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
                {/* Report Configuration - Responsive */}
                <div className="xl:col-span-1">
                  <Card className="bg-gray-900/80 border-purple-400/40 backdrop-blur-xl">
                    <CardHeader className="p-3 sm:p-6">
                      <CardTitle className="text-base sm:text-lg text-white">Threat Report Configuration</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6 pt-0">
                      <div className="space-y-2">
                        <Label className="text-white text-xs sm:text-sm">Date Range</Label>
                        <Select defaultValue="7days">
                          <SelectTrigger className="bg-gray-800/50 border-purple-400/30 text-white text-xs sm:text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 border-purple-400/30">
                            <SelectItem value="24hours">Last 24 Hours</SelectItem>
                            <SelectItem value="7days">Last 7 Days</SelectItem>
                            <SelectItem value="30days">Last 30 Days</SelectItem>
                            <SelectItem value="90days">Last 90 Days</SelectItem>
                            <SelectItem value="custom">Custom Range</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-white text-xs sm:text-sm">Threat Severity</Label>
                        <Select defaultValue="all">
                          <SelectTrigger className="bg-gray-800/50 border-purple-400/30 text-white text-xs sm:text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 border-purple-400/30">
                            <SelectItem value="all">All Severities</SelectItem>
                            <SelectItem value="critical">Critical Only</SelectItem>
                            <SelectItem value="high">High & Critical</SelectItem>
                            <SelectItem value="medium">Medium & Above</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-white text-xs sm:text-sm">Report Format</Label>
                        <Select defaultValue="pdf">
                          <SelectTrigger className="bg-gray-800/50 border-purple-400/30 text-white text-xs sm:text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 border-purple-400/30">
                            <SelectItem value="pdf">PDF Report</SelectItem>
                            <SelectItem value="excel">Excel Spreadsheet</SelectItem>
                            <SelectItem value="csv">CSV Data</SelectItem>
                            <SelectItem value="json">JSON Export</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Separator className="bg-purple-500/20" />

                      <div className="space-y-3">
                        <Label className="text-white text-xs sm:text-sm">Include Sections</Label>
                        <div className="space-y-2">
                          <label className="flex items-center space-x-2">
                            <input type="checkbox" defaultChecked className="rounded border-purple-400" />
                            <span className="text-xs sm:text-sm text-zinc-300">Executive Summary</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input type="checkbox" defaultChecked className="rounded border-purple-400" />
                            <span className="text-xs sm:text-sm text-zinc-300">Threat Timeline</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input type="checkbox" defaultChecked className="rounded border-purple-400" />
                            <span className="text-xs sm:text-sm text-zinc-300">Geographic Analysis</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input type="checkbox" className="rounded border-purple-400" />
                            <span className="text-xs sm:text-sm text-zinc-300">Technical Details</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input type="checkbox" defaultChecked className="rounded border-purple-400" />
                            <span className="text-xs sm:text-sm text-zinc-300">Recommendations</span>
                          </label>
                        </div>
                      </div>

                      <Button className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-xs sm:text-sm">
                        <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        Generate Threat Report
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {/* Threat Summary - Responsive */}
                <div className="xl:col-span-2 space-y-4 sm:space-y-6">
                  <Card className="bg-gray-900/80 border-purple-400/40 backdrop-blur-xl">
                    <CardHeader className="p-3 sm:p-6">
                      <CardTitle className="text-base sm:text-lg text-white">Threat Summary (Last 7 Days)</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-6 pt-0">
                      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
                        <div className="text-center p-3 sm:p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                          <div className="text-2xl sm:text-3xl font-bold text-red-400">23</div>
                          <div className="text-xs sm:text-sm text-red-300">Critical Threats</div>
                        </div>
                        <div className="text-center p-3 sm:p-4 bg-amber-900/20 border border-amber-500/30 rounded-lg">
                          <div className="text-2xl sm:text-3xl font-bold text-amber-400">67</div>
                          <div className="text-xs sm:text-sm text-amber-300">High Priority</div>
                        </div>
                      </div>

                      <div className="space-y-3 sm:space-y-4">
                        <h4 className="text-white font-medium text-sm sm:text-base">Top Threat Categories</h4>
                        <div className="text-center py-8">
                          <AlertTriangle className="h-12 w-12 text-purple-400 mb-4 mx-auto" />
                          <h3 className="text-lg font-semibold text-white mb-2">Threat Analysis Coming Soon</h3>
                          <p className="text-zinc-400 text-center mb-6">
                            Advanced threat categorization is being developed. Use the Overview tab for comprehensive security reports.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-900/80 border-purple-400/40 backdrop-blur-xl">
                    <CardHeader className="p-3 sm:p-6">
                      <CardTitle className="text-base sm:text-lg text-white">Recent Threat Reports</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-6 pt-0">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-500/20 rounded-lg border border-red-500/30">
                              <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-red-400" />
                            </div>
                            <div>
                              <h5 className="font-medium text-white text-xs sm:text-sm">Critical Threat Analysis - Week 52</h5>
                              <p className="text-xs text-zinc-400">Generated 2 hours ago • 3.2 MB</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="ghost" className="text-zinc-400 hover:text-white">
                              <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-zinc-400 hover:text-white">
                              <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-500/20 rounded-lg border border-amber-500/30">
                              <Shield className="h-3 w-3 sm:h-4 sm:w-4 text-amber-400" />
                            </div>
                            <div>
                              <h5 className="font-medium text-white text-xs sm:text-sm">Monthly Threat Landscape</h5>
                              <p className="text-xs text-zinc-400">Generated yesterday • 5.8 MB</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="ghost" className="text-zinc-400 hover:text-white">
                              <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-zinc-400 hover:text-white">
                              <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Incidents Tab */}
            <TabsContent value="incidents" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-gray-900/80 border-purple-400/40 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="text-lg text-white">Incident Response Reports</CardTitle>
                    <CardDescription className="text-zinc-300">
                      Detailed analysis of security incidents and response actions
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                        <div className="text-2xl font-bold text-red-400">7</div>
                        <div className="text-xs text-red-300">Active Incidents</div>
                      </div>
                      <div className="text-center p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
                        <div className="text-2xl font-bold text-green-400">142</div>
                        <div className="text-xs text-green-300">Resolved This Month</div>
                      </div>
                    </div>

                    <div className="text-center py-8">
                      <Shield className="h-10 w-10 text-purple-400 mb-4 mx-auto" />
                      <h4 className="text-white font-medium mb-2">Incident Reports Coming Soon</h4>
                      <p className="text-zinc-400 text-sm">
                        Advanced incident tracking features are being developed. Current security analysis available in Overview tab.
                      </p>
                    </div>

                    <Button className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700">
                      <FileText className="h-4 w-4 mr-2" />
                      Generate Incident Report
                    </Button>
                  </CardContent>
                </Card>

                <Card className="bg-gray-900/80 border-purple-400/40 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="text-lg text-white">Response Metrics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-300">Average Response Time</span>
                        <span className="text-sm font-medium text-white">4.2 minutes</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-300">Resolution Rate</span>
                        <span className="text-sm font-medium text-white">94.7%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-300">Escalation Rate</span>
                        <span className="text-sm font-medium text-white">12.3%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-300">False Positive Rate</span>
                        <span className="text-sm font-medium text-white">3.1%</span>
                      </div>
                    </div>

                    <Separator className="bg-purple-500/20" />

                    <div className="space-y-3">
                      <h4 className="text-white font-medium">Response Team Performance</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-zinc-300">Tier 1 Analysts</span>
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Excellent</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-zinc-300">Tier 2 Engineers</span>
                          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Good</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-zinc-300">Senior Specialists</span>
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Excellent</Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Compliance Tab */}
            <TabsContent value="compliance" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <Card className="bg-gray-900/80 border-purple-400/40 backdrop-blur-xl">
                    <CardHeader>
                      <CardTitle className="text-lg text-white">Compliance Status Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
                          <div className="text-3xl font-bold text-green-400">87%</div>
                          <div className="text-sm text-green-300">Overall Compliance</div>
                        </div>
                        <div className="text-center p-4 bg-amber-900/20 border border-amber-500/30 rounded-lg">
                          <div className="text-3xl font-bold text-amber-400">23</div>
                          <div className="text-sm text-amber-300">Action Items</div>
                        </div>
                      </div>

                      <div className="text-center py-8">
                        <CheckCircle className="h-10 w-10 text-purple-400 mb-4 mx-auto" />
                        <h4 className="text-white font-medium mb-2">Compliance Framework Analysis Coming Soon</h4>
                        <p className="text-zinc-400 text-sm">
                          Regulatory compliance reporting features are being developed. Current security analysis available in Overview tab.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-6">
                  <Card className="bg-gray-900/80 border-purple-400/40 backdrop-blur-xl">
                    <CardHeader>
                      <CardTitle className="text-lg text-white">Generate Compliance Report</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-white">Framework</Label>
                        <Select defaultValue="all">
                          <SelectTrigger className="bg-gray-800/50 border-purple-400/30 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 border-purple-400/30">
                            <SelectItem value="all">All Frameworks</SelectItem>
                            <SelectItem value="soc2">SOC 2 Type II</SelectItem>
                            <SelectItem value="iso27001">ISO 27001</SelectItem>
                            <SelectItem value="nist">NIST CSF</SelectItem>
                            <SelectItem value="gdpr">GDPR</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-white">Report Period</Label>
                        <Select defaultValue="quarterly">
                          <SelectTrigger className="bg-gray-800/50 border-purple-400/30 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 border-purple-400/30">
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="quarterly">Quarterly</SelectItem>
                            <SelectItem value="annual">Annual</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Button className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Generate Report
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-900/80 border-purple-400/40 backdrop-blur-xl">
                    <CardHeader>
                      <CardTitle className="text-lg text-white">Upcoming Audits</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                        <div>
                          <h5 className="font-medium text-white">SOC 2 Annual</h5>
                          <p className="text-sm text-zinc-400">Jan 15, 2025</p>
                        </div>
                        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Upcoming</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                        <div>
                          <h5 className="font-medium text-white">ISO 27001 Review</h5>
                          <p className="text-sm text-zinc-400">Feb 28, 2025</p>
                        </div>
                        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Scheduled</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Custom Tab */}
            <TabsContent value="custom" className="space-y-6">
              <Card className="bg-gray-900/80 border-purple-400/40 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-lg text-white">Custom Report Builder</CardTitle>
                  <CardDescription className="text-zinc-300">
                    Create custom reports with specific data sources and visualizations
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-white">Report Name</Label>
                        <Input
                          placeholder="Enter report name"
                          className="bg-gray-800/50 border-purple-400/30 text-white focus:border-purple-400"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-white">Data Sources</Label>
                        <div className="space-y-2">
                          <label className="flex items-center space-x-2">
                            <input type="checkbox" defaultChecked className="rounded border-purple-400" />
                            <span className="text-sm text-zinc-300">Network Traffic Logs</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input type="checkbox" defaultChecked className="rounded border-purple-400" />
                            <span className="text-sm text-zinc-300">Security Alerts</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input type="checkbox" className="rounded border-purple-400" />
                            <span className="text-sm text-zinc-300">Vulnerability Scans</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input type="checkbox" className="rounded border-purple-400" />
                            <span className="text-sm text-zinc-300">User Activity Logs</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input type="checkbox" className="rounded border-purple-400" />
                            <span className="text-sm text-zinc-300">System Performance</span>
                          </label>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-white">Visualization Types</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant="outline"
                            className="border-purple-400/40 text-zinc-200 hover:bg-purple-900/40 bg-transparent h-auto p-3"
                          >
                            <div className="flex flex-col items-center gap-1">
                              <BarChart3 className="h-5 w-5" />
                              <span className="text-xs">Bar Chart</span>
                            </div>
                          </Button>
                          <Button
                            variant="outline"
                            className="border-purple-400/40 text-zinc-200 hover:bg-purple-900/40 bg-transparent h-auto p-3"
                          >
                            <div className="flex flex-col items-center gap-1">
                              <LineChart className="h-5 w-5" />
                              <span className="text-xs">Line Chart</span>
                            </div>
                          </Button>
                          <Button
                            variant="outline"
                            className="border-purple-400/40 text-zinc-200 hover:bg-purple-900/40 bg-transparent h-auto p-3"
                          >
                            <div className="flex flex-col items-center gap-1">
                              <PieChart className="h-5 w-5" />
                              <span className="text-xs">Pie Chart</span>
                            </div>
                          </Button>
                          <Button
                            variant="outline"
                            className="border-purple-400/40 text-zinc-200 hover:bg-purple-900/40 bg-transparent h-auto p-3"
                          >
                            <div className="flex flex-col items-center gap-1">
                              <Activity className="h-5 w-5" />
                              <span className="text-xs">Heatmap</span>
                            </div>
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-white">Schedule</Label>
                        <Select defaultValue="manual">
                          <SelectTrigger className="bg-gray-800/50 border-purple-400/30 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 border-purple-400/30">
                            <SelectItem value="manual">Manual Generation</SelectItem>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-white">Recipients</Label>
                        <Input
                          placeholder="Enter email addresses"
                          className="bg-gray-800/50 border-purple-400/30 text-white focus:border-purple-400"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-white">Output Format</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant="outline"
                            className="border-purple-400/40 text-zinc-200 hover:bg-purple-900/40 bg-transparent"
                          >
                            PDF
                          </Button>
                          <Button
                            variant="outline"
                            className="border-purple-400/40 text-zinc-200 hover:bg-purple-900/40 bg-transparent"
                          >
                            Excel
                          </Button>
                        </div>
                      </div>

                      <div className="pt-4">
                        <Button className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700">
                          <FileBarChart className="h-4 w-4 mr-2" />
                          Create Custom Report
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-purple-500/20 bg-gray-950/90 backdrop-blur-xl py-12 relative">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-gradient-to-r from-purple-500 to-violet-500 p-1.5 shadow-lg shadow-purple-500/25">
                <ShieldCheck className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                CyberSense AI
              </span>
            </div>
            <p className="text-sm text-zinc-400">© 2024 CyberSense AI. Built for cybersecurity professionals.</p>
          </div>
        </div>
      </footer>
    </main>
  )
}


