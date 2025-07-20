import { useState, useEffect, useRef, useCallback } from 'react'

interface ReportStatusUpdate {
  type: 'status' | 'complete' | 'error' | 'update'
  reportId: string
  status: string
  timestamp: string
  metadata?: {
    name?: string
    riskLevel?: string
    threatCount?: number
    criticalIssues?: number
    progress?: number
    message?: string
    dataUpdate?: boolean
  }
  error?: string
}

interface UseReportStatusOptions {
  onComplete?: (reportId: string, metadata?: any) => void
  onError?: (reportId: string, error: string) => void
  onStatusChange?: (reportId: string, status: string, metadata?: any) => void
}

export function useReportStatus(options: UseReportStatusOptions = {}) {
  const [activeReports, setActiveReports] = useState<Map<string, string>>(new Map())
  const [reportMetadata, setReportMetadata] = useState<Map<string, any>>(new Map())
  const [reportProgress, setReportProgress] = useState<Map<string, number>>(new Map())
  const [progressMessages, setProgressMessages] = useState<Map<string, string>>(new Map())
  const eventSourcesRef = useRef<Map<string, EventSource>>(new Map())
  const { onComplete, onError, onStatusChange } = options

  const startTracking = useCallback((reportId: string) => {
    if (eventSourcesRef.current.has(reportId)) {
      console.log(`Already tracking report: ${reportId}`)
      return
    }

    console.log(`Starting to track report: ${reportId}`)
    
    // Set initial status
    setActiveReports(prev => new Map(prev.set(reportId, 'generating')))
    setReportProgress(prev => new Map(prev.set(reportId, 0)))
    setProgressMessages(prev => new Map(prev.set(reportId, 'Initializing...')))
    
    // Create EventSource for real-time updates
    const eventSource = new EventSource(`/api/reports/status?reportId=${reportId}`)
    
    eventSource.onopen = () => {
      console.log(`EventSource connected for report: ${reportId}`)
    }
    
    eventSource.onmessage = (event) => {
      try {
        const update: ReportStatusUpdate = JSON.parse(event.data)
        
        console.log(`Report ${reportId} status update:`, update)
        
        // Update status
        setActiveReports(prev => new Map(prev.set(reportId, update.status)))
        
        // Update metadata if provided
        if (update.metadata) {
          setReportMetadata(prev => new Map(prev.set(reportId, update.metadata)))
          
          // Update progress if provided
          if (update.metadata?.progress !== undefined) {
            setReportProgress(prev => new Map(prev.set(reportId, update.metadata!.progress!)))
          }
          
          // Update progress message if provided
          if (update.metadata?.message) {
            setProgressMessages(prev => new Map(prev.set(reportId, update.metadata!.message!)))
          }
        }
        
        // Call status change callback
        if (onStatusChange) {
          onStatusChange(reportId, update.status, update.metadata)
        }
        
        // Handle completion
        if (update.type === 'complete') {
          console.log(`Report ${reportId} completed with status: ${update.status}`)
          
          // Clean up tracking
          stopTracking(reportId)
          
          // Call completion callback
          if (update.status === 'published' && onComplete) {
            onComplete(reportId, update.metadata)
          } else if (update.status === 'failed' && onError) {
            onError(reportId, 'Report generation failed')
          }
        }
        
        // Handle errors
        if (update.type === 'error') {
          console.error(`Report ${reportId} error:`, update.error)
          
          // Clean up tracking
          stopTracking(reportId)
          
          // Call error callback
          if (onError) {
            onError(reportId, update.error || 'Unknown error')
          }
        }
        
      } catch (error) {
        console.error('Error parsing status update:', error)
      }
    }
    
    eventSource.onerror = (error) => {
      console.warn(`EventSource error for report ${reportId}, will rely on fallback polling:`, error)
      
      // Don't call onError immediately for SSE failures - let fallback handle it
      // Clean up SSE but keep tracking active for fallback
      eventSource.close()
      eventSourcesRef.current.delete(reportId)
    }
    
    // Store event source
    eventSourcesRef.current.set(reportId, eventSource)
    
    // Auto cleanup after 5 minutes
    setTimeout(() => {
      if (eventSourcesRef.current.has(reportId)) {
        console.log(`Auto-cleaning up tracking for report: ${reportId}`)
        stopTracking(reportId)
      }
    }, 300000) // 5 minutes
    
  }, [onComplete, onError, onStatusChange])

  const stopTracking = useCallback((reportId: string) => {
    const eventSource = eventSourcesRef.current.get(reportId)
    if (eventSource) {
      eventSource.close()
      eventSourcesRef.current.delete(reportId)
      console.log(`Stopped tracking report: ${reportId}`)
    }
    
    // Remove from active reports
    setActiveReports(prev => {
      const newMap = new Map(prev)
      newMap.delete(reportId)
      return newMap
    })
    
    // Clean up progress tracking
    setReportProgress(prev => {
      const newMap = new Map(prev)
      newMap.delete(reportId)
      return newMap
    })
    
    setProgressMessages(prev => {
      const newMap = new Map(prev)
      newMap.delete(reportId)
      return newMap
    })
    
    // Keep metadata for a bit longer in case it's needed
    setTimeout(() => {
      setReportMetadata(prev => {
        const newMap = new Map(prev)
        newMap.delete(reportId)
        return newMap
      })
    }, 30000) // Keep for 30 seconds
    
  }, [])

  const isTracking = useCallback((reportId: string) => {
    return eventSourcesRef.current.has(reportId)
  }, [])

  const getStatus = useCallback((reportId: string) => {
    return activeReports.get(reportId) || null
  }, [activeReports])

  const getMetadata = useCallback((reportId: string) => {
    return reportMetadata.get(reportId) || null
  }, [reportMetadata])

  const getProgress = useCallback((reportId: string) => {
    return reportProgress.get(reportId) || 0
  }, [reportProgress])

  const getProgressMessage = useCallback((reportId: string) => {
    return progressMessages.get(reportId) || 'Processing...'
  }, [progressMessages])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Close all event sources
      for (const [reportId, eventSource] of eventSourcesRef.current.entries()) {
        eventSource.close()
        console.log(`Cleanup: Closed EventSource for report ${reportId}`)
      }
      eventSourcesRef.current.clear()
    }
  }, [])

  // Enhanced tracking with exponential backoff fallback
  const trackReportWithFallback = useCallback(async (reportId: string) => {
    startTracking(reportId)
    
    // Fallback polling in case EventSource fails
    let retryCount = 0
    const maxRetries = 600 // 10 minutes (600 * 1 second)
    const baseDelay = 1000 // 1 second between checks
    let lastProgress = 0
    let startTime = Date.now()
    
    const fallbackCheck = async () => {
      try {
        console.log(`[${reportId}] Fallback check ${retryCount + 1}/${maxRetries}`)
        
        const response = await fetch(`/api/reports?id=${reportId}`)
        
        if (response.ok) {
          const data = await response.json()
          
          if (data.success && data.report) {
            const report = data.report
            
            // Check if report is completed
            if (report.status === 'completed' || report.status === 'PUBLISHED') {
              console.log(`[${reportId}] Report completed via fallback polling`)
              stopTracking(reportId)
              if (onComplete) {
                onComplete(reportId, {
                  name: report.name,
                  riskLevel: report.riskLevel,
                  threatCount: report.threatCount,
                  criticalIssues: report.criticalIssues
                })
              }
              return
            }
            
            // SIMPLIFIED: Use fake progress that fills up smoothly over time
            if (report.status === 'generating' || report.status === 'GENERATING') {
              const elapsedSeconds = (Date.now() - startTime) / 1000
              const estimatedTotalSeconds = 25 // Assume 25 seconds for completion
              const fakeProgress = Math.min(95, Math.floor((elapsedSeconds / estimatedTotalSeconds) * 100))
              
              // Ensure progress only goes up
              const finalProgress = Math.max(fakeProgress, lastProgress)
              lastProgress = finalProgress
              
              setReportProgress(prev => new Map(prev.set(reportId, finalProgress)))
              
              // Simple progress messages based on percentage
              let message = 'Starting analysis...'
              if (finalProgress > 20) message = 'Analyzing network data...'
              if (finalProgress > 40) message = 'Detecting security threats...'
              if (finalProgress > 60) message = 'Generating report...'
              if (finalProgress > 80) message = 'Finalizing analysis...'
              
              setProgressMessages(prev => new Map(prev.set(reportId, message)))
              
              console.log(`[${reportId}] Fake progress: ${finalProgress}% - ${message}`)
            }
          }
        } else if (response.status === 404) {
          // Report might not exist yet, continue polling but don't count as error
          console.log(`[${reportId}] Report not found yet, continuing to poll...`)
        } else {
          throw new Error(`HTTP ${response.status}`)
        }
        
        // Continue fallback polling
        retryCount++
        if (retryCount < maxRetries) {
          setTimeout(fallbackCheck, baseDelay)
        } else {
          console.log(`[${reportId}] Polling timeout reached`)
          stopTracking(reportId)
        }
      } catch (error) {
        console.error(`[${reportId}] Fallback polling error:`, error)
        retryCount++
        if (retryCount < maxRetries) {
          setTimeout(fallbackCheck, baseDelay)
        } else {
          console.log(`[${reportId}] Polling timeout reached after errors`)
          stopTracking(reportId)
        }
      }
    }
    
    // Start fallback polling after 10 seconds
    setTimeout(fallbackCheck, 10000)
    
  }, [startTracking, stopTracking, onComplete, onError])

  return {
    startTracking: trackReportWithFallback,
    stopTracking,
    isTracking,
    getStatus,
    getMetadata,
    getProgress,
    getProgressMessage,
    activeReports: Array.from(activeReports.keys()),
    trackingCount: activeReports.size
  }
} 