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
} from "lucide-react"
import { ProfileDropdown } from "@/components/profile-dropdown"
import { downloadReportAsPDF } from "@/lib/pdf-utils"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { DeleteConfirmationDialog, ArchiveConfirmationDialog, RestoreConfirmationDialog } from "@/components/ui/confirmation-dialog"

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
  const [, setCategorizedReports] = useState<CategorizedReports | null>(null)
  const [summary, setSummary] = useState<ReportSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloadingPDF, setDownloadingPDF] = useState<string | null>(null)
  const [isGeneratingStandard, setIsGeneratingStandard] = useState(false)
  const [generatingPlaceholder, setGeneratingPlaceholder] = useState<ReportData | null>(null)
  
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
  const [currentPage, setCurrentPage] = useState(1);
  const reportsPerPage = 10;
  // Replace report type filter with date filter
  const [dateFilter, setDateFilter] = useState<'all' | 'last24h' | 'last7d' | 'last30d' | 'custom'>('all');
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
  
  // Confirmation dialog states
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; reportId: string; reportName: string; isLoading: boolean }>({
    open: false,
    reportId: '',
    reportName: '',
    isLoading: false
  });
  const [archiveDialog, setArchiveDialog] = useState<{ open: boolean; reportId: string; reportName: string; isLoading: boolean }>({
    open: false,
    reportId: '',
    reportName: '',
    isLoading: false
  });
  const [restoreDialog, setRestoreDialog] = useState<{ open: boolean; reportId: string; reportName: string; isLoading: boolean }>({
    open: false,
    reportId: '',
    reportName: '',
    isLoading: false
  });

  // Helper function to filter reports by date
  const filterReportsByDate = (reports: ReportData[]) => {
    if (dateFilter === 'all') return reports;
    
    const now = new Date();
    const filterDate = new Date();
    
    switch (dateFilter) {
      case 'last24h':
        filterDate.setHours(now.getHours() - 24);
        break;
      case 'last7d':
        filterDate.setDate(now.getDate() - 7);
        break;
      case 'last30d':
        filterDate.setDate(now.getDate() - 30);
        break;
      case 'custom':
        if (customDateRange.start && customDateRange.end) {
          return reports.filter(report => {
            const reportDate = new Date(report.date);
            const startDate = new Date(customDateRange.start);
            const endDate = new Date(customDateRange.end);
            endDate.setHours(23, 59, 59, 999); // Include full end date
            return reportDate >= startDate && reportDate <= endDate;
          });
        }
        return reports;
      default:
        return reports;
    }
    
    return reports.filter(report => new Date(report.date) >= filterDate);
  };

  // Filtered and paginated reports
  const allReports = generatingPlaceholder ? [generatingPlaceholder, ...reports] : reports;
  
  // Deduplicate reports by ID to prevent React key conflicts
  const deduplicatedReports = allReports.reduce((unique: ReportData[], report: ReportData) => {
    if (!unique.some(r => r.id === report.id)) {
      unique.push(report);
    } else {
      // Log duplicate report IDs for debugging
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Duplicate report ID detected: ${report.id}`);
      }
    }
    return unique;
  }, []);
  
  const filteredReports = filterReportsByDate(deduplicatedReports);
  const totalPages = Math.ceil(filteredReports.length / reportsPerPage);
  const paginatedReports = filteredReports.slice((currentPage - 1) * reportsPerPage, currentPage * reportsPerPage);
  
  const router = useRouter()
  const { toast } = useToast();

  useEffect(() => {
    fetchReports()
  }, [])

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
    
    // Log potential duplicates before deduplication
    if (process.env.NODE_ENV === 'development') {
      const reportIds = allReports.map(r => r.id);
      const duplicateIds = reportIds.filter((id, index) => reportIds.indexOf(id) !== index);
      if (duplicateIds.length > 0) {
        console.warn('Duplicate report IDs found in API response:', duplicateIds);
      }
    }
    
    // Deduplicate by ID to prevent React key conflicts
    const uniqueReports = allReports.reduce((unique: ReportData[], report: ReportData) => {
      if (!unique.some(r => r.id === report.id)) {
        unique.push(report);
      }
      return unique;
    }, []);
    
    // Sort by date (newest first)
    return uniqueReports.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  const fetchReports = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/reports')
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      // Handle new categorized structure
      if (data.reports && typeof data.reports === 'object') {
        setCategorizedReports(data.reports)
        setReports(flattenReports(data.reports))
      } else {
        // Fallback for old structure
        setReports(data.reports || [])
        setCategorizedReports(null)
      }
      
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
      setIsGeneratingStandard(true)
      setError(null) // Clear any previous errors
      
      // Create a loading placeholder immediately
      const placeholderReport: ReportData = {
        id: `generating-${Date.now()}`,
        title: 'Generating New Report...',
        type: 'standard',
        category: 'shared',
        date: new Date().toISOString(),
        status: 'generating',
        size: 'Calculating...',
        filename: 'generating...',
        duration_hours: duration_hours,
        risk_level: 'unknown',
        flows_analyzed: 0,
        generated_by: 'system'
      }
      setGeneratingPlaceholder(placeholderReport)
      
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ duration_hours }),
      })
      
      if (!response.ok) {
        // Try to get error details from response
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorData.details || errorMessage
        } catch {
          // If response isn't JSON, use the HTTP error
        }
        throw new Error(errorMessage)
      }
      
      const result = await response.json()
      
      // Validate response structure
      if (typeof result !== 'object' || result === null) {
        throw new Error('Invalid response format from server')
      }
      
      // Check for success (multiple possible indicators)
      const isSuccess = result.success === true || 
                       (result.message && !result.error) ||
                       result.status === 'generating'
      
      if (isSuccess) {
        // Show success message if available
        toast({
          title: 'Report Generation',
          description: 'New report is being generated and will appear in the list shortly.'
        });
        
        // Enhanced loading feedback - poll for completion
        const checkReportCompletion = async () => {
          try {
            const checkResponse = await fetch('/api/reports');
            if (checkResponse.ok) {
              const checkData = await checkResponse.json();
              const flatReports = flattenReports(checkData.reports);
              
              // Check if any new completed reports appeared
              const newCompletedReports = flatReports.filter(r => 
                r.status === 'completed' && 
                !reports.some(existing => existing.id === r.id)
              );
              
              if (newCompletedReports.length > 0) {
                // New report completed, update the list and remove placeholder
                await refreshAndResetPage();
                setGeneratingPlaceholder(null);
                toast({
                  title: 'Report Ready',
                  description: 'Your new report has been generated successfully.'
                });
                return true; // Stop polling
              }
            }
            return false; // Continue polling
          } catch (error) {
            console.error('Error checking report completion:', error);
            return false;
          }
        };
        
        // Poll every 3 seconds for up to 5 minutes
        let pollCount = 0;
        const maxPolls = 100; // 5 minutes
        const pollInterval = setInterval(async () => {
          pollCount++;
          const completed = await checkReportCompletion();
          
          if (completed || pollCount >= maxPolls) {
            clearInterval(pollInterval);
            if (pollCount >= maxPolls) {
              // Timeout - remove placeholder and refresh anyway
              setGeneratingPlaceholder(null);
              await refreshAndResetPage();
              toast({
                title: 'Generation Timeout',
                description: 'Report generation is taking longer than expected. Please refresh manually.',
                variant: 'destructive'
              });
            }
          }
        }, 3000);
        
        // Also refresh immediately to show any changes
        setTimeout(async () => {
          await refreshAndResetPage();
        }, 2000);
        
      } else {
        // Handle various error formats
        const errorMessage = result.error || 
                           result.details || 
                           result.message || 
                           'Failed to generate report'
        throw new Error(errorMessage)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate report'
      setError(errorMessage)
      console.error('Error generating report:', err)
      setGeneratingPlaceholder(null) // Remove placeholder on error
    } finally {
      setIsGeneratingStandard(false)
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

  const generateCustomReport = async () => {
    if (!customReport.reportName.trim()) {
      setError('Please enter a report name')
      return
    }

    // Get selected data sources
    const selectedDataSources = Object.entries(customReport.dataSources)
      .filter(([_, selected]) => selected)
      .map(([source, _]) => source)

    if (selectedDataSources.length === 0) {
      setError('Please select at least one data source')
      return
    }

    // Get selected visualization types
    const selectedVisualizations = Object.entries(customReport.visualizationTypes)
      .filter(([_, selected]) => selected)
      .map(([type, _]) => type)

    try {
      setIsGeneratingCustom(true)
      setError(null)

      const requestBody = {
        type: 'custom',
        report_name: customReport.reportName,
        data_sources: selectedDataSources,
        visualization_types: selectedVisualizations.length > 0 ? selectedVisualizations : ['summary'],
        time_range: customReport.timeRange,
        schedule: customReport.schedule,
        recipients: customReport.recipients.split(',').map(email => email.trim()).filter(email => email),
        output_format: customReport.outputFormat,
        duration_hours: customReport.timeRange
      }

      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      
      // Validate response structure
      if (typeof result !== 'object' || result === null) {
        throw new Error('Invalid response format from server')
      }
      
      // Check for success (multiple possible indicators)
      const isSuccess = result.success === true || 
                       result.message || 
                       result.status === 'generating'
      
      if (isSuccess) {
        await refreshAndResetPage();
        setCustomReport(prev => ({
          ...prev,
          reportName: '',
          recipients: ''
        }))
        toast({
          title: 'Custom Report',
          description: 'Your custom report is being generated and will appear in the list shortly.'
        });
      } else {
        // Handle various error formats
        const errorMessage = result.error || 
                           result.details || 
                           'Failed to generate custom report'
        throw new Error(errorMessage)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate custom report')
      console.error('Error generating custom report:', err)
    } finally {
      setIsGeneratingCustom(false)
    }
  }

  const updateCustomReportField = (field: string, value: any) => {
    setCustomReport(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const updateDataSource = (source: string, checked: boolean) => {
    setCustomReport(prev => ({
      ...prev,
      dataSources: {
        ...prev.dataSources,
        [source]: checked
      }
    }))
  }

  const updateVisualizationType = (type: string, selected: boolean) => {
    setCustomReport(prev => ({
      ...prev,
      visualizationTypes: {
        ...prev.visualizationTypes,
        [type]: selected
      }
    }))
  }

  const updateOutputFormat = (format: string) => {
    setCustomReport(prev => ({
      ...prev,
      outputFormat: format
    }))
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



  const handleViewReport = (reportId: string) => {
    router.push(`/reports/${reportId}`)
  }

  const handleDownloadPDF = async (reportId: string) => {
    try {
      setDownloadingPDF(reportId)
      await downloadReportAsPDF(reportId)
    } catch (error) {
      console.error('Error downloading PDF:', error)
      setError('Failed to download PDF. Please try again.')
    } finally {
      setDownloadingPDF(null)
    }
  }

  // After fetchReports or report generation, reset to first page
  const refreshAndResetPage = async () => {
    await fetchReports();
    setCurrentPage(1);
  };

  // Delete/Archive/Restore handlers
  const handleDeleteReport = async () => {
    setDeleteDialog(prev => ({ ...prev, isLoading: true }));
    
    try {
      const response = await fetch(`/api/reports/${deleteDialog.reportId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete report');
      }

      toast({
        title: "Report Deleted",
        description: `"${deleteDialog.reportName}" has been permanently deleted.`,
      });

      // Refresh reports list
      await refreshAndResetPage();
    } catch (error) {
      console.error('Error deleting report:', error);
      toast({
        title: "Error",
        description: "Failed to delete report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeleteDialog({ open: false, reportId: '', reportName: '', isLoading: false });
    }
  };

  const handleArchiveReport = async () => {
    setArchiveDialog(prev => ({ ...prev, isLoading: true }));
    
    try {
      const response = await fetch(`/api/reports/${archiveDialog.reportId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'archive' }),
      });

      if (!response.ok) {
        throw new Error('Failed to archive report');
      }

      toast({
        title: "Report Archived",
        description: `"${archiveDialog.reportName}" has been archived.`,
      });

      // Refresh reports list
      await refreshAndResetPage();
    } catch (error) {
      console.error('Error archiving report:', error);
      toast({
        title: "Error",
        description: "Failed to archive report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setArchiveDialog({ open: false, reportId: '', reportName: '', isLoading: false });
    }
  };

  const handleRestoreReport = async () => {
    setRestoreDialog(prev => ({ ...prev, isLoading: true }));
    
    try {
      const response = await fetch(`/api/reports/${restoreDialog.reportId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'restore' }),
      });

      if (!response.ok) {
        throw new Error('Failed to restore report');
      }

      toast({
        title: "Report Restored",
        description: `"${restoreDialog.reportName}" has been restored.`,
      });

      // Refresh reports list
      await refreshAndResetPage();
    } catch (error) {
      console.error('Error restoring report:', error);
      toast({
        title: "Error",
        description: "Failed to restore report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRestoreDialog({ open: false, reportId: '', reportName: '', isLoading: false });
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-black via-purple-950/40 to-gray-950 text-zinc-100 relative">
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
                  disabled={loading || isGeneratingStandard}
                >
                  <Download className={`h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 ${isGeneratingStandard ? 'animate-spin' : ''}`} />
                  {isGeneratingStandard ? 'Generating...' : 'Generate Report'}
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
              <TabsTrigger value="custom" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-xs sm:text-sm col-span-2 sm:col-span-1">
                <FileBarChart className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Custom
              </TabsTrigger>
            </TabsList>
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
                      {loading ? '...' : reports.length}
                    </div>
                    <p className="text-xs text-zinc-300 mt-1">
                      {loading ? 'Loading...' : 'Total available reports'}
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
                  {/* Enhanced Date/Time Filter UI */}
                  <div className="flex flex-wrap gap-2 mb-4 justify-center">
                    <Button
                      variant={dateFilter === 'all' ? 'default' : 'outline'}
                      size="sm"
                      className={dateFilter === 'all' 
                        ? 'bg-purple-600 text-white hover:bg-purple-700' 
                        : 'border-purple-400 text-zinc-200 bg-gray-800/50 hover:bg-purple-900/40 hover:border-purple-300'
                      }
                      onClick={() => { setDateFilter('all'); setCurrentPage(1); }}
                    >
                      <Calendar className="h-3 w-3 mr-1" />
                      All Time
                    </Button>
                    <Button
                      variant={dateFilter === 'last24h' ? 'default' : 'outline'}
                      size="sm"
                      className={dateFilter === 'last24h' 
                        ? 'bg-purple-600 text-white hover:bg-purple-700' 
                        : 'border-purple-400 text-zinc-200 bg-gray-800/50 hover:bg-purple-900/40 hover:border-purple-300'
                      }
                      onClick={() => { setDateFilter('last24h'); setCurrentPage(1); }}
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      Last 24h
                    </Button>
                    <Button
                      variant={dateFilter === 'last7d' ? 'default' : 'outline'}
                      size="sm"
                      className={dateFilter === 'last7d' 
                        ? 'bg-purple-600 text-white hover:bg-purple-700' 
                        : 'border-purple-400 text-zinc-200 bg-gray-800/50 hover:bg-purple-900/40 hover:border-purple-300'
                      }
                      onClick={() => { setDateFilter('last7d'); setCurrentPage(1); }}
                    >
                      <Calendar className="h-3 w-3 mr-1" />
                      Last 7 Days
                    </Button>
                    <Button
                      variant={dateFilter === 'last30d' ? 'default' : 'outline'}
                      size="sm"
                      className={dateFilter === 'last30d' 
                        ? 'bg-purple-600 text-white hover:bg-purple-700' 
                        : 'border-purple-400 text-zinc-200 bg-gray-800/50 hover:bg-purple-900/40 hover:border-purple-300'
                      }
                      onClick={() => { setDateFilter('last30d'); setCurrentPage(1); }}
                    >
                      <Calendar className="h-3 w-3 mr-1" />
                      Last 30 Days
                    </Button>
                    <Button
                      variant={dateFilter === 'custom' ? 'default' : 'outline'}
                      size="sm"
                      className={dateFilter === 'custom' 
                        ? 'bg-purple-600 text-white hover:bg-purple-700' 
                        : 'border-purple-400 text-zinc-200 bg-gray-800/50 hover:bg-purple-900/40 hover:border-purple-300'
                      }
                      onClick={() => { setDateFilter('custom'); setCurrentPage(1); }}
                    >
                      <Settings className="h-3 w-3 mr-1" />
                      Custom Range
                    </Button>
                  </div>

                  {/* Custom Date Range Inputs */}
                  {dateFilter === 'custom' && (
                    <div className="flex flex-col sm:flex-row gap-2 mb-4 justify-center items-center">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="start-date" className="text-xs text-zinc-300">From:</Label>
                        <Input
                          id="start-date"
                          type="date"
                          value={customDateRange.start}
                          onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                          className="w-auto text-xs bg-gray-800/50 border-purple-400/40 text-zinc-200"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="end-date" className="text-xs text-zinc-300">To:</Label>
                        <Input
                          id="end-date"
                          type="date"
                          value={customDateRange.end}
                          onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                          className="w-auto text-xs bg-gray-800/50 border-purple-400/40 text-zinc-200"
                        />
                      </div>
                    </div>
                  )}

                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                    </div>
                  ) : filteredReports.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-zinc-400">
                        {dateFilter === 'all' 
                          ? 'No reports found. Generate your first report to get started.'
                          : `No reports found for the selected time period.`
                        }
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3 sm:space-y-4">
                        {paginatedReports.map((report) => (
                          <div
                            key={report.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-gray-800/50 rounded-lg border border-purple-500/20 hover:bg-gray-800/70 transition-colors"
                            data-testid={report.status === 'generating' ? 'generating-report-placeholder' : undefined}
                          >
                            <div className="flex items-center gap-3 mb-2 sm:mb-0">
                              <div className="p-2 bg-purple-500/20 rounded-lg">
                                <FileText className="h-4 w-4 text-purple-300" />
                              </div>
                              <div>
                                <h4 className="font-medium text-white text-sm sm:text-base truncate">
                                  {report.title}
                                </h4>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  <span className="text-xs text-zinc-400">{report.type}</span>
                                  <Separator orientation="vertical" className="h-3 bg-zinc-600" />
                                  <span className="text-xs text-zinc-400">{formatDate(report.date)}</span>
                                  <Separator orientation="vertical" className="h-3 bg-zinc-600" />
                                  <span className="text-xs text-zinc-400">{report.size}</span>
                                  {report.category && (
                                    <>
                                      <Separator orientation="vertical" className="h-3 bg-zinc-600" />
                                      <Badge
                                        variant="outline"
                                        className={`text-xs ${
                                          report.category === 'shared' 
                                            ? 'border-blue-500/30 text-blue-300'
                                            : report.category === 'user'
                                            ? 'border-purple-500/30 text-purple-300'
                                            : 'border-orange-500/30 text-orange-300'
                                        }`}
                                      >
                                        {report.category === 'shared' ? 'Shared' : 
                                         report.category === 'user' ? 'Personal' : 'Admin'}
                                      </Badge>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={report.status === 'completed' ? 'default' : 'secondary'}
                                className={`text-xs ${
                                  report.status === 'completed'
                                    ? 'bg-green-500/20 text-green-300 border-green-500/30'
                                    : report.status === 'generating'
                                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                                    : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                                }`}
                              >
                                {report.status === 'generating' && (
                                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                )}
                                {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={`text-xs ${
                                  report.risk_level === 'HIGH' || report.risk_level === 'high'
                                    ? 'border-red-500/30 text-red-300'
                                    : report.risk_level === 'MEDIUM' || report.risk_level === 'medium'
                                    ? 'border-yellow-500/30 text-yellow-300'
                                    : report.risk_level === 'unknown'
                                    ? 'border-gray-500/30 text-gray-300'
                                    : 'border-green-500/30 text-green-300'
                                }`}
                              >
                                {report.risk_level === 'unknown' ? 'Analyzing...' : `${report.risk_level} Risk`}
                              </Badge>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-zinc-400 hover:text-white hover:bg-purple-900/40"
                                  onClick={() => handleDownloadPDF(report.id)}
                                  disabled={downloadingPDF === report.id || report.status === 'generating'}
                                >
                                  <Download className={`h-3 w-3 ${downloadingPDF === report.id ? 'animate-spin' : ''}`} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-zinc-400 hover:text-white hover:bg-purple-900/40"
                                  onClick={() => handleViewReport(report.id)}
                                  disabled={report.status === 'generating'}
                                >
                                  <Eye className="h-3 w-3" />
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 text-zinc-400 hover:text-white hover:bg-purple-900/40"
                                      disabled={report.status === 'generating'}
                                    >
                                      <MoreVertical className="h-3 w-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent className="bg-gray-800 border-purple-400/30" align="end">
                                    {report.status === 'archived' ? (
                                      <DropdownMenuItem 
                                        className="text-zinc-200 hover:bg-purple-900/40 text-xs cursor-pointer"
                                        onClick={() => setRestoreDialog({
                                          open: true,
                                          reportId: report.id,
                                          reportName: report.title,
                                          isLoading: false
                                        })}
                                      >
                                        <RotateCcw className="h-3 w-3 mr-2" />
                                        Restore
                                      </DropdownMenuItem>
                                    ) : (
                                      <DropdownMenuItem 
                                        className="text-zinc-200 hover:bg-purple-900/40 text-xs cursor-pointer"
                                        onClick={() => setArchiveDialog({
                                          open: true,
                                          reportId: report.id,
                                          reportName: report.title,
                                          isLoading: false
                                        })}
                                      >
                                        <Archive className="h-3 w-3 mr-2" />
                                        Archive
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator className="bg-purple-500/20" />
                                    <DropdownMenuItem 
                                      className="text-red-400 hover:bg-red-900/40 text-xs cursor-pointer"
                                      onClick={() => setDeleteDialog({
                                        open: true,
                                        reportId: report.id,
                                        reportName: report.title,
                                        isLoading: false
                                      })}
                                    >
                                      <Trash2 className="h-3 w-3 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Enhanced Pagination Controls with improved styling */}
                      {totalPages > 1 && (
                        <div className="flex justify-center items-center gap-3 mt-6">
                          <Button
                            variant="outline"
                            size="sm"
                            className={`border-purple-400 text-zinc-200 bg-gray-800/50 hover:bg-purple-900/40 hover:border-purple-300 ${
                              currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                          >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Previous
                          </Button>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-zinc-300 px-3 py-1 bg-gray-800/50 rounded border border-purple-400/30">
                              Page {currentPage} of {totalPages}
                            </span>
                          </div>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            className={`border-purple-400 text-zinc-200 bg-gray-800/50 hover:bg-purple-900/40 hover:border-purple-300 ${
                              currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                          >
                            Next
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </div>
                      )}
                    </>
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
                          value={customReport.reportName}
                          onChange={(e) => updateCustomReportField('reportName', e.target.value)}
                          className="bg-gray-800/50 border-purple-400/30 text-white focus:border-purple-400"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-white">Data Sources</Label>
                        <div className="space-y-2">
                          <label className="flex items-center space-x-2">
                            <input 
                              type="checkbox" 
                              checked={customReport.dataSources.networkTraffic}
                              onChange={(e) => updateDataSource('networkTraffic', e.target.checked)}
                              className="rounded border-purple-400" 
                            />
                            <span className="text-sm text-zinc-300">Network Traffic Logs</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input 
                              type="checkbox" 
                              checked={customReport.dataSources.securityAlerts}
                              onChange={(e) => updateDataSource('securityAlerts', e.target.checked)}
                              className="rounded border-purple-400" 
                            />
                            <span className="text-sm text-zinc-300">Security Alerts</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input 
                              type="checkbox" 
                              checked={customReport.dataSources.vulnerabilityScans}
                              onChange={(e) => updateDataSource('vulnerabilityScans', e.target.checked)}
                              className="rounded border-purple-400" 
                            />
                            <span className="text-sm text-zinc-300">Vulnerability Scans</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input 
                              type="checkbox" 
                              checked={customReport.dataSources.userActivity}
                              onChange={(e) => updateDataSource('userActivity', e.target.checked)}
                              className="rounded border-purple-400" 
                            />
                            <span className="text-sm text-zinc-300">User Activity Logs</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input 
                              type="checkbox" 
                              checked={customReport.dataSources.systemPerformance}
                              onChange={(e) => updateDataSource('systemPerformance', e.target.checked)}
                              className="rounded border-purple-400" 
                            />
                            <span className="text-sm text-zinc-300">System Performance</span>
                          </label>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-white">Visualization Types</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant={customReport.visualizationTypes.barChart ? "default" : "outline"}
                            onClick={() => updateVisualizationType('barChart', !customReport.visualizationTypes.barChart)}
                            className={`border-purple-400/40 text-zinc-200 hover:bg-purple-900/40 h-auto p-3 ${
                              customReport.visualizationTypes.barChart 
                                ? 'bg-purple-600 hover:bg-purple-700' 
                                : 'bg-transparent'
                            }`}
                          >
                            <div className="flex flex-col items-center gap-1">
                              <BarChart3 className="h-5 w-5" />
                              <span className="text-xs">Bar Chart</span>
                            </div>
                          </Button>
                          <Button
                            variant={customReport.visualizationTypes.lineChart ? "default" : "outline"}
                            onClick={() => updateVisualizationType('lineChart', !customReport.visualizationTypes.lineChart)}
                            className={`border-purple-400/40 text-zinc-200 hover:bg-purple-900/40 h-auto p-3 ${
                              customReport.visualizationTypes.lineChart 
                                ? 'bg-purple-600 hover:bg-purple-700' 
                                : 'bg-transparent'
                            }`}
                          >
                            <div className="flex flex-col items-center gap-1">
                              <LineChart className="h-5 w-5" />
                              <span className="text-xs">Line Chart</span>
                            </div>
                          </Button>
                          <Button
                            variant={customReport.visualizationTypes.pieChart ? "default" : "outline"}
                            onClick={() => updateVisualizationType('pieChart', !customReport.visualizationTypes.pieChart)}
                            className={`border-purple-400/40 text-zinc-200 hover:bg-purple-900/40 h-auto p-3 ${
                              customReport.visualizationTypes.pieChart 
                                ? 'bg-purple-600 hover:bg-purple-700' 
                                : 'bg-transparent'
                            }`}
                          >
                            <div className="flex flex-col items-center gap-1">
                              <PieChart className="h-5 w-5" />
                              <span className="text-xs">Pie Chart</span>
                            </div>
                          </Button>
                          <Button
                            variant={customReport.visualizationTypes.heatmap ? "default" : "outline"}
                            onClick={() => updateVisualizationType('heatmap', !customReport.visualizationTypes.heatmap)}
                            className={`border-purple-400/40 text-zinc-200 hover:bg-purple-900/40 h-auto p-3 ${
                              customReport.visualizationTypes.heatmap 
                                ? 'bg-purple-600 hover:bg-purple-700' 
                                : 'bg-transparent'
                            }`}
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
                        <Select value={customReport.schedule} onValueChange={(value) => updateCustomReportField('schedule', value)}>
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
                          value={customReport.recipients}
                          onChange={(e) => updateCustomReportField('recipients', e.target.value)}
                          className="bg-gray-800/50 border-purple-400/30 text-white focus:border-purple-400"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-white">Output Format</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant={customReport.outputFormat === 'pdf' ? "default" : "outline"}
                            onClick={() => updateOutputFormat('pdf')}
                            className={`border-purple-400/40 text-zinc-200 hover:bg-purple-900/40 ${
                              customReport.outputFormat === 'pdf' 
                                ? 'bg-purple-600 hover:bg-purple-700' 
                                : 'bg-transparent'
                            }`}
                          >
                            PDF
                          </Button>
                          <Button
                            variant={customReport.outputFormat === 'json' ? "default" : "outline"}
                            onClick={() => updateOutputFormat('json')}
                            className={`border-purple-400/40 text-zinc-200 hover:bg-purple-900/40 ${
                              customReport.outputFormat === 'json' 
                                ? 'bg-purple-600 hover:bg-purple-700' 
                                : 'bg-transparent'
                            }`}
                          >
                            JSON
                          </Button>
                        </div>
                      </div>

                      <div className="pt-4">
                        <Button 
                          onClick={generateCustomReport}
                          disabled={isGeneratingCustom || loading}
                          className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700"
                        >
                          <FileBarChart className="h-4 w-4 mr-2" />
                          {isGeneratingCustom ? 'Generating...' : 'Create Custom Report'}
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
                LEVANT AI
              </span>
            </div>
            <p className="text-sm text-zinc-400">© 2024 LEVANT AI. Built for cybersecurity professionals.</p>
          </div>
        </div>
      </footer>
      
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
    </div>
  )
}


