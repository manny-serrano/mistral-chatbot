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
  RefreshCw,
  CheckCircle,
  Database,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Archive,
  Trash2,
  RotateCcw,
  Loader2,
  Zap,
  X,
} from "lucide-react"
import { ProfileDropdown } from "@/components/profile-dropdown"
import { downloadReportAsPDF } from "@/lib/pdf-utils"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { DeleteConfirmationDialog, ArchiveConfirmationDialog, RestoreConfirmationDialog } from "@/components/ui/confirmation-dialog"
import { useReportStatus } from "@/hooks/useReportStatus"
import { ReportProgressCard } from "@/components/ui/report-progress-card"
import { Progress } from "@/components/ui/progress"

interface ReportData {
  id: string
  title: string
  type: string
  category: "shared" | "user" | "admin"
  date: string
  status: string
  size: string
  filename: string
  duration_hours: number
  risk_level: string
  flows_analyzed: number
  generated_by: string
  user_netid?: string
}

interface CategorizedReports {
  shared: ReportData[]
  user: ReportData[]
  admin: ReportData[]
}

interface ReportSummary {
  total_reports: number
  shared_reports: number
  user_reports: number
  admin_reports: number
  completed_reports: number
  failed_reports: number
  total_flows_analyzed: number
  latest_report: ReportData | null
  risk_distribution: {
    HIGH: number
    MEDIUM: number
    LOW: number
  }
  user_info: {
    netId: string
    role: string
    canAccessAdmin: boolean
  }
}

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportData[]>([])
  const [archivedReports, setArchivedReports] = useState<ReportData[]>([])
  const [, setCategorizedReports] = useState<CategorizedReports | null>(null)
  const [summary, setSummary] = useState<ReportSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloadingPDF, setDownloadingPDF] = useState<string | null>(null)
  const [isGeneratingStandard, setIsGeneratingStandard] = useState(false)
  const [generatingPlaceholders, setGeneratingPlaceholders] = useState<Map<string, ReportData>>(new Map())
  
  // Custom Report Builder state
  const [customReport, setCustomReport] = useState({
    reportName: '',
    dataSources: {
      networkTraffic: true,
      securityAlerts: true,
      vulnerabilityScans: false,
      userActivity: false,
      systemPerformance: false
    },
    visualizationTypes: {
      barChart: false,
      lineChart: false,
      pieChart: false,
      heatmap: false
    },
    schedule: 'manual',
    recipients: '',
    outputFormat: 'json',
    timeRange: 24
  })
  const [isGeneratingCustom, setIsGeneratingCustom] = useState(false)
  
  // Add pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const reportsPerPage = 10
  // Replace report type filter with date filter
  const [dateFilter, setDateFilter] = useState<'all' | 'last24h' | 'last7d' | 'last30d' | 'custom'>('all')
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' })
  
  // Add view state for active vs archived reports
  const [activeView, setActiveView] = useState<'active' | 'archived'>('active')
  
  // Confirmation dialog states
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; reportId: string; reportName: string; isLoading: boolean }>({
    open: false,
    reportId: '',
    reportName: '',
    isLoading: false
  })
  const [archiveDialog, setArchiveDialog] = useState<{ open: boolean; reportId: string; reportName: string; isLoading: boolean }>({
    open: false,
    reportId: '',
    reportName: '',
    isLoading: false
  })
  const [restoreDialog, setRestoreDialog] = useState<{ open: boolean; reportId: string; reportName: string; isLoading: boolean }>({
    open: false,
    reportId: '',
    reportName: '',
    isLoading: false
  })

  // State for cancel confirmation dialog
  const [cancelDialog, setCancelDialog] = useState({
    open: false,
    reportId: '',
    reportName: '',
    isLoading: false
  })

  // State for clear all confirmation dialog
  const [clearAllDialog, setClearAllDialog] = useState({
    open: false,
    isLoading: false
  })

  // Helper function to filter reports by date
  const filterReportsByDate = (reports: ReportData[]) => {
    if (dateFilter === 'all') return reports
    
    const now = new Date()
    const filterDate = new Date()
    
    switch (dateFilter) {
      case 'last24h':
        filterDate.setHours(now.getHours() - 24)
        break
      case 'last7d':
        filterDate.setDate(now.getDate() - 7)
        break
      case 'last30d':
        filterDate.setDate(now.getDate() - 30)
        break
      case 'custom':
        if (customDateRange.start && customDateRange.end) {
          return reports.filter(report => {
            const reportDate = new Date(report.date)
            const startDate = new Date(customDateRange.start)
            const endDate = new Date(customDateRange.end)
            endDate.setHours(23, 59, 59, 999) // Include full end date
            return reportDate >= startDate && reportDate <= endDate
          })
        }
        return reports
      default:
        return reports
    }
    
    return reports.filter(report => new Date(report.date) >= filterDate)
  }

  // Filtered and paginated reports - include generating placeholders only for active view
  const placeholderArray = Array.from(generatingPlaceholders.values())
  
  // Choose which reports to display based on active view
  let reportsToDisplay: ReportData[]
  
  if (activeView === 'active') {
    // For active view, include generating placeholders and deduplicate
    const allReports = [...placeholderArray, ...reports]
    
    // Deduplicate reports by ID to prevent React key conflicts
    // Use a Map to keep the most recent version of each report
    const reportMap = new Map<string, ReportData>()
    
    allReports.forEach(report => {
      const existing = reportMap.get(report.id)
      if (!existing) {
        reportMap.set(report.id, report)
      } else {
        // If duplicate exists, keep the one with more recent date or generating status
        const existingDate = new Date(existing.date).getTime()
        const newDate = new Date(report.date).getTime()
        
        // Prioritize generating reports over completed ones
        if (report.status === 'generating' && existing.status !== 'generating') {
          reportMap.set(report.id, report)
        } else if (existing.status === 'generating' && report.status !== 'generating') {
          // Keep existing generating report
        } else if (newDate > existingDate) {
          reportMap.set(report.id, report)
        }
        
        // Log duplicate report IDs for debugging
        if (process.env.NODE_ENV === 'development') {
          console.warn(`Duplicate report ID detected: ${report.id} - keeping most recent`)
        }
      }
    })
    
    reportsToDisplay = Array.from(reportMap.values())
  } else {
    // For archived view, only show archived reports (no generating placeholders)
    // Also deduplicate archived reports to prevent duplicates
    const archivedMap = new Map<string, ReportData>()
    
    archivedReports.forEach(report => {
      const existing = archivedMap.get(report.id)
      if (!existing) {
        archivedMap.set(report.id, report)
      } else {
        // Keep the most recent archived report
        const existingDate = new Date(existing.date).getTime()
        const newDate = new Date(report.date).getTime()
        
        if (newDate > existingDate) {
          archivedMap.set(report.id, report)
        }
        
        // Log duplicate archived report IDs for debugging
        if (process.env.NODE_ENV === 'development') {
          console.warn(`Duplicate archived report ID detected: ${report.id} - keeping most recent`)
        }
      }
    })
    
    reportsToDisplay = Array.from(archivedMap.values())
  }
  
  const filteredReports = filterReportsByDate(reportsToDisplay)
  const totalPages = Math.ceil(filteredReports.length / reportsPerPage)
  const paginatedReports = filteredReports.slice((currentPage - 1) * reportsPerPage, currentPage * reportsPerPage)
  
  const router = useRouter()
  const { toast } = useToast()

  // Real-time report status tracking
  const reportStatus = useReportStatus({
    onComplete: (reportId, metadata) => {
      console.log(`Report ${reportId} completed:`, metadata)
      
      // Remove placeholder and refresh reports list
      setGeneratingPlaceholders(prev => {
        const newMap = new Map(prev)
        newMap.delete(reportId)
        return newMap
      })
      
      // Refresh reports list to show the new report
      fetchReports({ silent: true })
       
      // Show success notification
      toast({
        title: 'Report Ready! 🎉',
        description: `${metadata?.name || 'Your report'} has been generated successfully.`,
      })
    },
    
    onError: (reportId, error) => {
      console.error(`Report ${reportId} failed:`, error)
      
      // Remove placeholder
      setGeneratingPlaceholders(prev => {
        const newMap = new Map(prev)
        newMap.delete(reportId)
        return newMap
      })
      
      // Show error notification
      toast({
        title: 'Report Generation Failed',
        description: error,
        variant: 'destructive',
      })
      
      // Refresh reports list
      fetchReports({ silent: true })
    },
    
    onStatusChange: (reportId, status, metadata) => {
      console.log(`Report ${reportId} status changed to ${status}:`, metadata)
      
      // Update placeholder with latest status and metadata
      setGeneratingPlaceholders(prev => {
        const existing = prev.get(reportId)
        if (existing) {
          const updated = {
            ...existing,
            status,
            title: metadata?.name || existing.title,
            risk_level: metadata?.riskLevel || existing.risk_level,
          }
          const newMap = new Map(prev)
          newMap.set(reportId, updated)
          return newMap
        }
        return prev
      })
    }
  })

  useEffect(() => {
    fetchReports()
    
    // Set up automatic background refresh every 30 seconds (only when no reports are being tracked)
    const backgroundRefresh = setInterval(() => {
      if (reportStatus.trackingCount === 0) {
        fetchReports({ silent: true })
      }
    }, 30000) // 30 seconds
    
    return () => clearInterval(backgroundRefresh)
  }, [reportStatus.trackingCount])

  // Helper function to flatten categorized reports
  const flattenReports = (categorizedReports: CategorizedReports | null): ReportData[] => {
    if (!categorizedReports) return []
    
    const allReports: ReportData[] = []
    if (Array.isArray(categorizedReports.shared)) {
      allReports.push(...categorizedReports.shared)
    }
    if (Array.isArray(categorizedReports.user)) {
      allReports.push(...categorizedReports.user)
    }
    if (Array.isArray(categorizedReports.admin)) {
      allReports.push(...categorizedReports.admin)
    }
    
    return allReports
  }

  const fetchReports = async (options = { silent: false }) => {
    try {
      if (!options.silent) {
      setLoading(true)
      setError(null)
      }
      
      const response = await fetch('/api/reports')
      
      if (!response.ok) {
        throw new Error(`Failed to fetch reports: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.categorized) {
        setCategorizedReports(data.categorized)
        setReports(flattenReports(data.categorized))
      } else {
        setReports([])
      }
      
      // Fetch archived reports
      const archivedResponse = await fetch('/api/reports?archived=true')
      if (archivedResponse.ok) {
        const archivedData = await archivedResponse.json()
        if (archivedData.categorized) {
          setArchivedReports(flattenReports(archivedData.categorized))
        } else {
          setArchivedReports([])
        }
      } else {
        setArchivedReports([])
      }
      
      if (data.summary) {
        setSummary(data.summary)
      }
      
    } catch (err) {
      console.error('Error fetching reports:', err)
      if (!options.silent) {
        setError(err instanceof Error ? err.message : 'Failed to load reports')
      }
    } finally {
      if (!options.silent) {
      setLoading(false)
      }
    }
  }

  const generateStandardReport = async () => {
      setIsGeneratingStandard(true)
    
    try {
      const response = await fetch('/api/reports/generate-optimized', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timeRange: 3.5,
          reportType: 'standard'
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to start report generation')
      }
      
      const result = await response.json()
      
      if (result.reportId) {
        // Create placeholder for immediate feedback with optimization notice
        const placeholder: ReportData = {
          id: result.reportId,
          title: 'Generating Security Report... (ANALYZING REAL DATA)',
          type: 'Cybersecurity Analysis',
          category: 'user',
          date: new Date().toISOString(),
          status: 'generating',
          size: 'Calculating...',
          filename: `report_${result.reportId}.json`,
          duration_hours: 3.5,
          risk_level: 'ANALYZING',
          flows_analyzed: 0,
          generated_by: summary?.user_info?.netId || 'current_user'
        }
        
        setGeneratingPlaceholders(prev => new Map(prev.set(result.reportId, placeholder)))
        
        // Start tracking this report's progress
        reportStatus.startTracking(result.reportId)
        
                toast({
          title: 'Real Report Generation Started',
          description: `${result.estimatedTime} - Analyzing actual network security data from your system.`,
        })
      }
      
          } catch (error) {
      console.error('Error generating report:', error)
              toast({
        title: 'Generation Failed',
        description: 'Failed to start report generation. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsGeneratingStandard(false)
    }
  }

  const generateCustomReport = async () => {
    if (!customReport.reportName.trim()) {
      toast({
        title: 'Invalid Report Name',
        description: 'Please enter a report name.',
        variant: 'destructive',
      })
      return
    }

      setIsGeneratingCustom(true)
    
    try {
      const response = await fetch('/api/reports/generate-optimized', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timeRange: customReport.timeRange,
          reportType: 'custom',
          customConfig: customReport
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to start custom report generation')
      }
      
      const result = await response.json()
      
      if (result.reportId) {
        // Create placeholder for immediate feedback
        const placeholder: ReportData = {
          id: result.reportId,
          title: `Generating ${customReport.reportName}...`,
          type: 'Custom Analysis',
          category: 'user',
          date: new Date().toISOString(),
          status: 'generating',
          size: 'Calculating...',
          filename: `custom_${result.reportId}.${customReport.outputFormat}`,
          duration_hours: customReport.timeRange,
          risk_level: 'ANALYZING',
          flows_analyzed: 0,
          generated_by: summary?.user_info?.netId || 'current_user'
        }
        
        setGeneratingPlaceholders(prev => new Map(prev.set(result.reportId, placeholder)))
        
        // Start tracking this report's progress
        reportStatus.startTracking(result.reportId)
        
        toast({
          title: 'Custom Report Generation Started',
          description: `Your custom report "${customReport.reportName}" is being generated.`,
        })
      }
      
    } catch (error) {
      console.error('Error generating custom report:', error)
      toast({
        title: 'Generation Failed',
        description: 'Failed to start custom report generation. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsGeneratingCustom(false)
    }
  }

  // Helper functions for custom report configuration
  const updateCustomReportField = (field: string, value: any) => {
    setCustomReport(prev => ({ ...prev, [field]: value }))
  }

  const updateDataSource = (source: string, enabled: boolean) => {
    setCustomReport(prev => ({
      ...prev,
      dataSources: { ...prev.dataSources, [source]: enabled }
    }))
  }

  const updateVisualizationType = (type: string, enabled: boolean) => {
    setCustomReport(prev => ({
      ...prev,
      visualizationTypes: { ...prev.visualizationTypes, [type]: enabled }
    }))
  }

  const updateOutputFormat = (format: string) => {
    setCustomReport(prev => ({ ...prev, outputFormat: format }))
  }

  const handleDownloadPDF = async (reportId: string, reportTitle: string) => {
    try {
      setDownloadingPDF(reportId)
      await downloadReportAsPDF(reportId)
      
      toast({
        title: 'PDF Downloaded',
        description: `${reportTitle} has been downloaded successfully.`,
      })
    } catch (error) {
      console.error('Error downloading PDF:', error)
      toast({
        title: 'Download Failed',
        description: 'Failed to download PDF. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setDownloadingPDF(null)
    }
  }

  const handleViewReport = (reportId: string) => {
    router.push(`/reports/${reportId}`)
  }

  const refreshAndResetPage = async () => {
    setCurrentPage(1)
    await fetchReports()
  }

  const handleDeleteReport = async () => {
    setDeleteDialog(prev => ({ ...prev, isLoading: true }))
    
    try {
      const response = await fetch(`/api/reports/${deleteDialog.reportId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete report')
      }

      toast({
        title: 'Report Deleted',
        description: `"${deleteDialog.reportName}" has been deleted.`,
      })

      // Refresh reports list
      await refreshAndResetPage()
    } catch (error) {
      console.error('Error deleting report:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete report. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setDeleteDialog({ open: false, reportId: '', reportName: '', isLoading: false })
    }
  }

  const handleArchiveReport = async () => {
    setArchiveDialog(prev => ({ ...prev, isLoading: true }))
    
    try {
      const response = await fetch(`/api/reports/${archiveDialog.reportId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'archive' }),
      })

      if (!response.ok) {
        throw new Error('Failed to archive report')
      }

      toast({
        title: 'Report Archived',
        description: `"${archiveDialog.reportName}" has been archived.`,
      })

      // Refresh both active and archived reports lists
      await fetchReports({ silent: true })
      setCurrentPage(1)
    } catch (error) {
      console.error('Error archiving report:', error)
      toast({
        title: 'Error',
        description: 'Failed to archive report. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setArchiveDialog({ open: false, reportId: '', reportName: '', isLoading: false })
    }
  }

  const handleRestoreReport = async () => {
    setRestoreDialog(prev => ({ ...prev, isLoading: true }))
    
    try {
      const response = await fetch(`/api/reports/${restoreDialog.reportId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'restore' }),
      })

      if (!response.ok) {
        throw new Error('Failed to restore report')
      }

      toast({
        title: 'Report Restored',
        description: `"${restoreDialog.reportName}" has been restored.`,
      })

      // Refresh both active and archived reports lists
      await fetchReports({ silent: true })
      setCurrentPage(1)
    } catch (error) {
      console.error('Error restoring report:', error)
      toast({
        title: 'Error',
        description: 'Failed to restore report. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setRestoreDialog({ open: false, reportId: '', reportName: '', isLoading: false })
    }
  }

  const handleClearAllReports = async () => {
    setClearAllDialog(prev => ({ ...prev, isLoading: true }))
    
    try {
      console.log('🧹 Starting bulk delete of all reports...')
      
      const response = await fetch('/api/reports/bulk', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ includeArchived: true }),
      })

      console.log('📡 API Response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      })

      if (!response.ok) {
        // Get the error details from the response
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('❌ API Error Details:', errorData)
        throw new Error(`Failed to clear all reports: ${errorData.error || response.statusText}`)
      }

      const result = await response.json()
      console.log('✅ Bulk delete successful:', result)

      toast({
        title: 'All Reports Cleared',
        description: result.message || 'All reports have been successfully deleted.',
      })

      // Refresh reports list
      await refreshAndResetPage()
    } catch (error) {
      console.error('💥 Error clearing all reports:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to clear all reports. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setClearAllDialog({ open: false, isLoading: false })
    }
  }

  // Helper function to cancel a generating report
  const handleCancelReport = async () => {
    if (!cancelDialog.reportId) return
    
    setCancelDialog(prev => ({ ...prev, isLoading: true }))
    
    try {
      const response = await fetch(`/api/reports/${cancelDialog.reportId}/cancel`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        // Remove from placeholders
        setGeneratingPlaceholders(prev => {
          const newMap = new Map(prev)
          newMap.delete(cancelDialog.reportId)
          return newMap
        })
        
        // Stop tracking
        reportStatus.stopTracking(cancelDialog.reportId)
        
        // Refresh reports list
        fetchReports({ silent: true })
        
        toast({
          title: 'Report Cancelled',
          description: 'The report generation has been cancelled and removed.',
        })
        
        setCancelDialog({ open: false, reportId: '', reportName: '', isLoading: false })
      } else {
        const data = await response.json()
        throw new Error(data.error || 'Failed to cancel report')
      }
    } catch (error) {
      console.error('Error cancelling report:', error)
      toast({
        title: 'Cancel Failed',
        description: error instanceof Error ? error.message : 'Failed to cancel report generation.',
        variant: 'destructive',
      })
      setCancelDialog(prev => ({ ...prev, isLoading: false }))
    }
  }

  // Helper function to check if a report has been generating too long
  const isGeneratingTooLong = (report: ReportData): boolean => {
    if (report.status !== 'generating' && report.status !== 'draft') return false
    const reportTime = new Date(report.date).getTime()
    const now = Date.now()
    const thirtySeconds = 30 * 1000 // 30 seconds in milliseconds
    return (now - reportTime) > thirtySeconds
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-black via-purple-950/40 to-gray-950 text-zinc-100 relative">
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
                LEVANT AI
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
                <Link
                  href="/reports"
                  className="text-xs sm:text-sm font-medium text-purple-300 border-b border-purple-400"
                >
                  Reports
                </Link>
                <Link
                  href="/visualization"
                  className="text-xs sm:text-sm font-medium text-zinc-400 hover:text-purple-300 transition-colors"
                >
                  Visualization
                </Link>
              </nav>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
            <ProfileDropdown />
            </div>
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Security Reports</h1>
                <p className="text-sm sm:text-base text-zinc-300">Generate and analyze comprehensive security reports</p>
                </div>
              <div className="flex items-center gap-2 sm:gap-4">
                <Button
                  onClick={() => fetchReports()} 
                  variant="outline"
                  className="border-purple-500/60 text-purple-300 hover:text-white hover:bg-purple-900/40 hover:border-purple-400/80 bg-purple-950/30 text-xs sm:text-sm px-3 py-2 h-auto transition-all duration-200"
                >
                  <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button 
                  onClick={generateStandardReport} 
                  disabled={isGeneratingStandard || loading}
                  className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-xs sm:text-sm px-3 py-2 h-auto"
                >
                  {isGeneratingStandard ? (
                    <>
                      <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin" />
                      Generating ({reportStatus.trackingCount})
                    </>
                  ) : (
                    <>
                      <Zap className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      Generate
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Progress Cards for Generating Reports */}
          {generatingPlaceholders.size > 0 && (
            <div className="mb-6 sm:mb-8 space-y-4">
              {Array.from(generatingPlaceholders.values()).map((placeholder) => {
                const isTracking = reportStatus.isTracking(placeholder.id)
                const progress = reportStatus.getProgress(placeholder.id)
                const progressMessage = reportStatus.getProgressMessage(placeholder.id)
                
                return (
                  <ReportProgressCard
                    key={placeholder.id}
                    reportId={placeholder.id}
                    progress={progress}
                    message={progressMessage || 'Initializing...'}
                    trackingCount={1}
                    estimatedTime="1-2 min"
                  />
                )
              })}
            </div>
          )}

          {/* Reports Content - Remove Tabs and show content directly */}
          <div className="space-y-4 sm:space-y-6">
              {/* Quick Stats - Responsive Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <Card className="bg-gray-900/80 border-purple-400/40 backdrop-blur-xl">
                  <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs sm:text-sm font-medium text-zinc-300">Total Reports</CardTitle>
                      <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-purple-400" />
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-white">
                      {summary?.total_reports || 0}
                    </div>
                  </CardHeader>
                </Card>

                <Card className="bg-gray-900/80 border-purple-400/40 backdrop-blur-xl">
                  <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs sm:text-sm font-medium text-zinc-300">Flows Analyzed</CardTitle>
                      <Database className="h-3 w-3 sm:h-4 sm:w-4 text-blue-400" />
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-white">
                      {summary?.latest_report?.flows_analyzed?.toLocaleString() || '0'}
                    </div>
                    <div className="text-xs text-zinc-500">Latest report</div>
                  </CardHeader>
                </Card>

                <Card className="bg-gray-900/80 border-purple-400/40 backdrop-blur-xl">
                  <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs sm:text-sm font-medium text-zinc-300">Latest Report</CardTitle>
                      <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-amber-400" />
                    </div>
                    <div className="text-xs sm:text-sm font-medium text-white">
                      {summary?.latest_report ? 
                        `${new Date(summary.latest_report.date).toLocaleDateString()} ${new Date(summary.latest_report.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` 
                        : 'No reports'}
                    </div>
                  </CardHeader>
                </Card>
              </div>

              {/* Filters and Controls - Responsive */}
              <Card className="bg-gray-900/80 border-purple-400/40 backdrop-blur-xl">
                <CardHeader className="p-3 sm:p-6">
                  <CardTitle className="text-base sm:text-lg text-white">Filter Reports</CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-6 pt-0">
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <div className="flex-1">
                      <Label className="text-zinc-200 text-xs sm:text-sm font-medium">Date Range</Label>
                      <Select value={dateFilter} onValueChange={(value: any) => setDateFilter(value)}>
                        <SelectTrigger className="bg-gray-800/50 border-purple-400/30 text-white text-xs sm:text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-purple-400/30 text-white">
                          <SelectItem value="all" className="text-white hover:bg-purple-900/40 hover:text-white focus:bg-purple-900/40 focus:text-white">All Time</SelectItem>
                          <SelectItem value="last24h" className="text-white hover:bg-purple-900/40 hover:text-white focus:bg-purple-900/40 focus:text-white">Last 24 Hours</SelectItem>
                          <SelectItem value="last7d" className="text-white hover:bg-purple-900/40 hover:text-white focus:bg-purple-900/40 focus:text-white">Last 7 Days</SelectItem>
                          <SelectItem value="last30d" className="text-white hover:bg-purple-900/40 hover:text-white focus:bg-purple-900/40 focus:text-white">Last 30 Days</SelectItem>
                          <SelectItem value="custom" className="text-white hover:bg-purple-900/40 hover:text-white focus:bg-purple-900/40 focus:text-white">Custom Range</SelectItem>
                        </SelectContent>
                      </Select>
                  </div>

                  {dateFilter === 'custom' && (
                      <>
                        <div className="flex-1">
                          <Label className="text-zinc-200 text-xs sm:text-sm font-medium">Start Date</Label>
                        <Input
                          type="date"
                          value={customDateRange.start}
                          onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                            className="bg-gray-800/50 border-purple-400/30 text-white text-xs sm:text-sm"
                        />
                      </div>
                        <div className="flex-1">
                          <Label className="text-zinc-200 text-xs sm:text-sm font-medium">End Date</Label>
                        <Input
                          type="date"
                          value={customDateRange.end}
                          onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                            className="bg-gray-800/50 border-purple-400/30 text-white text-xs sm:text-sm"
                        />
                      </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Reports Tabs - Responsive */}
              <Card className="bg-gray-900/80 border-purple-400/40 backdrop-blur-xl">
                <CardHeader className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <CardTitle className="text-base sm:text-lg text-white">Reports</CardTitle>
                      <Tabs value={activeView} onValueChange={(value) => {
                        setActiveView(value as 'active' | 'archived')
                        setCurrentPage(1) // Reset to first page when switching tabs
                      }}>
                                                    <TabsList className="bg-gray-800/50 border-purple-400/30">
                              <TabsTrigger 
                                value="active" 
                                className="text-xs sm:text-sm data-[state=active]:bg-purple-600 data-[state=active]:text-white"
                              >
                                Reports
                              </TabsTrigger>
                              <TabsTrigger 
                                value="archived" 
                                className="text-xs sm:text-sm data-[state=active]:bg-purple-600 data-[state=active]:text-white"
                              >
                                Archived Reports
                              </TabsTrigger>
                            </TabsList>
                      </Tabs>
                    </div>
                                            <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-purple-900/40 text-purple-200 border-purple-500/30 text-xs">
                            {reportsToDisplay.length} {activeView === 'active' ? 'reports' : 'archived reports'}
                          </Badge>
                      {filteredReports.length > 0 && activeView === 'active' && (
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => setClearAllDialog({ open: true, isLoading: false })}
                          className="text-xs bg-red-600/80 hover:bg-red-600 border-red-500/30"
                          disabled={clearAllDialog.isLoading}
                        >
                          {clearAllDialog.isLoading ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3 mr-1" />
                          )}
                          Clear All
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {loading ? (
                    <div className="flex items-center justify-center py-8 sm:py-12">
                      <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-purple-400" />
                      <span className="ml-2 text-zinc-400 text-sm sm:text-base">Loading reports...</span>
                    </div>
                  ) : error ? (
                    <div className="text-center py-8 sm:py-12 px-4 sm:px-6">
                      <AlertTriangle className="h-8 w-8 sm:h-12 sm:w-12 text-red-400 mb-4 mx-auto" />
                      <h3 className="text-base sm:text-lg font-semibold text-white mb-2">Error Loading Reports</h3>
                      <p className="text-xs sm:text-sm text-zinc-400 mb-4">{error}</p>
                      <Button 
                        onClick={() => fetchReports()} 
                        variant="outline" 
                        className="border-red-400/40 text-red-200 hover:bg-red-900/40 text-xs sm:text-sm"
                      >
                        <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        Retry
                      </Button>
                    </div>
                                        ) : paginatedReports.length === 0 ? (
                        <div className="text-center py-8 sm:py-12 px-4 sm:px-6">
                          <FileText className="h-8 w-8 sm:h-12 sm:w-12 text-purple-400 mb-4 mx-auto" />
                          <h3 className="text-base sm:text-lg font-semibold text-white mb-2">
                            {activeView === 'active' ? 'No Reports Found' : 'No Archived Reports'}
                          </h3>
                          <p className="text-xs sm:text-sm text-zinc-400 mb-6">
                            {activeView === 'active' 
                              ? 'Get started by generating your first security report.'
                              : 'No reports have been archived yet.'
                            }
                          </p>
                          {activeView === 'active' && (
                            <Button 
                              onClick={generateStandardReport} 
                              disabled={isGeneratingStandard}
                              className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-xs sm:text-sm"
                            >
                              <Zap className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                              Generate Report
                            </Button>
                          )}
                        </div>
                  ) : (
                    <>
                      <div className="space-y-3 sm:space-y-4 p-4 sm:p-6">
                        {paginatedReports.map((report) => {
                          const isTracking = reportStatus.isTracking(report.id)
                          const progress = reportStatus.getProgress(report.id)
                          const progressMessage = reportStatus.getProgressMessage(report.id)
                          
                          return (
                          <div
                            key={report.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-gray-800/50 rounded-lg border border-purple-500/20 hover:bg-gray-800/70 transition-colors"
                            data-testid={report.status === 'generating' ? 'generating-report-placeholder' : undefined}
                          >
                              <div className="flex-1 mb-3 sm:mb-0 sm:mr-4">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2">
                                  <h3 className="font-medium text-white text-sm sm:text-base">{report.title}</h3>
                            <div className="flex items-center gap-2">
                              <Badge
                                      variant={
                                        report.status === 'generating' ? 'default' :
                                        report.status === 'completed' ? 'secondary' : 
                                        report.status === 'failed' ? 'destructive' : 'outline'
                                      }
                                className={`text-xs ${
                                        report.status === 'generating' ? 'bg-blue-600 text-blue-100' :
                                        report.status === 'completed' ? 'bg-green-600 text-green-100' :
                                        report.status === 'failed' ? 'bg-red-600 text-red-100' :
                                        'bg-gray-600 text-gray-100'
                                }`}
                              >
                                      {report.status === 'generating' ? 'Generating...' : report.status}
                              </Badge>
                              <Badge
                                variant="outline"
                                      className={`text-xs border ${
                                        report.risk_level === 'HIGH' ? 'border-red-500/50 text-red-300' :
                                        report.risk_level === 'MEDIUM' ? 'border-amber-500/50 text-amber-300' :
                                        report.risk_level === 'LOW' ? 'border-green-500/50 text-green-300' :
                                        report.risk_level === 'ANALYZING' ? 'border-blue-500/50 text-blue-300' :
                                        'border-gray-500/50 text-gray-300'
                                }`}
                              >
                                      {report.risk_level === 'ANALYZING' ? 'Analyzing...' : `${report.risk_level} Risk`}
                              </Badge>
                                  </div>
                                </div>
                                
                                {/* Progress Bar for Generating Reports */}
                                {isTracking && (
                                  <div className="mb-2">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-xs text-zinc-400">
                                        {progressMessage || 'Initializing...'}
                                      </span>
                                      <span className="text-xs text-zinc-400">{Math.round(progress)}%</span>
                                    </div>
                                    <Progress value={progress} className="h-2 bg-gray-700" />
                                  </div>
                                )}
                                
                                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-zinc-400">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {new Date(report.date).toLocaleDateString()} {new Date(report.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {report.duration_hours}h analysis
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Database className="h-3 w-3" />
                                    {report.flows_analyzed.toLocaleString()} flows
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Settings className="h-3 w-3" />
                                    {report.size}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                {report.status === 'completed' && (
                                  <>
                                <Button
                                  size="sm"
                                      variant="ghost"
                                      onClick={() => handleViewReport(report.id)}
                                      className="text-zinc-400 hover:text-white hover:bg-purple-900/40 text-xs sm:text-sm px-2 py-1 h-auto"
                                >
                                      <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                      <span className="hidden sm:inline">View</span>
                                </Button>
                                <Button
                                  size="sm"
                                      variant="ghost"
                                      onClick={() => handleDownloadPDF(report.id, report.title)}
                                      disabled={downloadingPDF === report.id}
                                      className="text-zinc-400 hover:text-white hover:bg-purple-900/40 text-xs sm:text-sm px-2 py-1 h-auto"
                                    >
                                      {downloadingPDF === report.id ? (
                                        <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 animate-spin" />
                                      ) : (
                                        <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                      )}
                                      <span className="hidden sm:inline">PDF</span>
                                </Button>
                                  </>
                                )}

                                {(report.status === 'generating' || report.status === 'draft') && (
                                  <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-2 text-zinc-400">
                                      <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                                      <span className="text-xs sm:text-sm">Processing...</span>
                                    </div>
                                    {isGeneratingTooLong(report) && (
                                    <Button
                                      size="sm"
                                        variant="ghost"
                                        onClick={() => setCancelDialog({ open: true, reportId: report.id, reportName: report.title, isLoading: false })}
                                        className="text-red-400 hover:text-red-300 hover:bg-red-900/40 text-xs sm:text-sm px-2 py-1 h-auto"
                                        title="Cancel generation (running too long)"
                                      >
                                        <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                        <span className="hidden sm:inline">Cancel</span>
                                      </Button>
                                    )}
                                  </div>
                                )}

                                {report.status === 'completed' && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white hover:bg-purple-900/40 p-1">
                                        <MoreVertical className="h-3 w-3 sm:h-4 sm:w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                    <DropdownMenuContent className="bg-gray-800 border-purple-500/20">
                                      {activeView === 'active' ? (
                                        <DropdownMenuItem 
                                          onClick={() => setArchiveDialog({ open: true, reportId: report.id, reportName: report.title, isLoading: false })}
                                          className="text-zinc-300 hover:text-white hover:bg-purple-900/40"
                                        >
                                          <Archive className="h-4 w-4 mr-2" />
                                          Archive
                                        </DropdownMenuItem>
                                      ) : (
                                        <DropdownMenuItem 
                                          onClick={() => setRestoreDialog({ open: true, reportId: report.id, reportName: report.title, isLoading: false })}
                                          className="text-zinc-300 hover:text-white hover:bg-purple-900/40"
                                        >
                                          <RotateCcw className="h-4 w-4 mr-2" />
                                          Restore
                                        </DropdownMenuItem>
                                      )}
                                    <DropdownMenuSeparator className="bg-purple-500/20" />
                                    <DropdownMenuItem 
                                        onClick={() => setDeleteDialog({ open: true, reportId: report.id, reportName: report.title, isLoading: false })}
                                        className="text-red-400 hover:text-red-300 hover:bg-red-900/40"
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      
                      {/* Pagination - Responsive */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-t border-purple-500/20">
                          <div className="text-xs sm:text-sm text-zinc-400">
                            Showing {(currentPage - 1) * reportsPerPage + 1} to {Math.min(currentPage * reportsPerPage, filteredReports.length)} of {filteredReports.length} reports
                          </div>
                          <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                              variant="ghost"
                              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                              className="text-zinc-400 hover:text-white hover:bg-purple-900/40 text-xs sm:text-sm px-2 py-1 h-auto"
                          >
                              <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                            <span className="text-xs sm:text-sm text-zinc-300 px-2">
                              {currentPage} of {totalPages}
                            </span>
                          <Button
                            size="sm"
                              variant="ghost"
                              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                              className="text-zinc-400 hover:text-white hover:bg-purple-900/40 text-xs sm:text-sm px-2 py-1 h-auto"
                          >
                              <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
                      </div>
        </div>
      </main>
      
      {/* Confirmation Dialogs */}
      <DeleteConfirmationDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog(prev => ({ ...prev, open }))}
        onConfirm={handleDeleteReport}
        itemName={deleteDialog.reportName}
        isLoading={deleteDialog.isLoading}
      />
      
      <ArchiveConfirmationDialog
        open={archiveDialog.open}
        onOpenChange={(open) => setArchiveDialog(prev => ({ ...prev, open }))}
        onConfirm={handleArchiveReport}
        itemName={archiveDialog.reportName}
        isLoading={archiveDialog.isLoading}
      />
      
      <RestoreConfirmationDialog
        open={restoreDialog.open}
        onOpenChange={(open) => setRestoreDialog(prev => ({ ...prev, open }))}
        onConfirm={handleRestoreReport}
        itemName={restoreDialog.reportName}
        isLoading={restoreDialog.isLoading}
      />
        
        <DeleteConfirmationDialog
          open={cancelDialog.open}
          onOpenChange={(open) => setCancelDialog(prev => ({ ...prev, open }))}
          onConfirm={handleCancelReport}
          itemName={cancelDialog.reportName}
          isLoading={cancelDialog.isLoading}
      />

      <DeleteConfirmationDialog
        open={clearAllDialog.open}
        onOpenChange={(open) => setClearAllDialog(prev => ({ ...prev, open }))}
        onConfirm={handleClearAllReports}
        itemName="all reports"
        isLoading={clearAllDialog.isLoading}
      />
    </div>
  )
}
