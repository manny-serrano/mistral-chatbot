import { useState, useEffect, useMemo } from "react"
import type { ApiAlert, AlertUI } from "@/lib/utils"

export function useAlerts(options?: {
  initialFilters?: {
    severity?: string
    type?: string
    status?: string
    timeRange?: string
    searchQuery?: string
    sortBy?: string
    sortOrder?: "asc" | "desc"
  }
}) {
  // State
  const [alertsData, setAlertsData] = useState<AlertUI[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [severityFilter, setSeverityFilter] = useState(options?.initialFilters?.severity || "all")
  const [typeFilter, setTypeFilter] = useState(options?.initialFilters?.type || "all")
  const [statusFilter, setStatusFilter] = useState(options?.initialFilters?.status || "all")
  const [timeRangeFilter, setTimeRangeFilter] = useState(options?.initialFilters?.timeRange || "all")
  const [searchQuery, setSearchQuery] = useState(options?.initialFilters?.searchQuery || "")
  const [sortBy, setSortBy] = useState(options?.initialFilters?.sortBy || "timestamp")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(options?.initialFilters?.sortOrder || "desc")

  // Fetch alerts
  useEffect(() => {
    setLoading(true)
    fetch("/api/alerts")
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch alerts")
        return res.json()
      })
      .then(data => {
        const now = Date.now()
        const mapped: AlertUI[] = (data.alerts || []).map((a: ApiAlert, idx: number) => {
          let timeValue = 0
          let timestamp = a.date
          try {
            const alertDate = new Date(a.date)
            if (!isNaN(alertDate.getTime())) {
              timeValue = Math.floor((now - alertDate.getTime()) / 60000)
              if (timeValue < 1) timestamp = "just now"
              else if (timeValue < 60) timestamp = `${timeValue} minutes ago`
              else if (timeValue < 120) timestamp = `${(timeValue/60).toFixed(1)} hours ago`
              else timestamp = a.date
            }
          } catch {
            timestamp = a.date
          }
          return {
            id: `ALERT-${idx}-${a.ip}-${a.date}`,
            severity: a.severity,
            type: a.type,
            title: a.message.split(" (")[0],
            description: a.message,
            timestamp,
            timeValue,
            source: a.ip,
            destination: "N/A",
            status: "active",
            assignee: "Unassigned",
            tags: [a.type],
            affectedAssets: a.unique_ports,
            confidence: Math.round(a.p_value * 100),
            location: "-",
            firstSeen: a.date,
            lastSeen: a.date,
            riskScore: Math.round(a.p_value * 10 * 10) / 10
          }
        })
        setAlertsData(mapped)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  // Filtering
  const filteredAlerts = useMemo(() => {
    const filtered = alertsData.filter((alert) => {
      if (severityFilter !== "all" && alert.severity !== severityFilter) return false
      if (typeFilter !== "all" && alert.type !== typeFilter) return false
      if (statusFilter !== "all" && alert.status !== statusFilter) return false
      if (timeRangeFilter !== "all") {
        const timeLimit = Number.parseInt(timeRangeFilter)
        if (alert.timeValue > timeLimit) return false
      }
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          alert.title.toLowerCase().includes(query) ||
          alert.description.toLowerCase().includes(query) ||
          alert.source.toLowerCase().includes(query) ||
          alert.id.toLowerCase().includes(query) ||
          alert.tags.some((tag) => tag.toLowerCase().includes(query))
        )
      }
      return true
    })
    // Sort
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy as keyof typeof a]
      let bValue: any = b[sortBy as keyof typeof b]
      if (sortBy === "timestamp") {
        aValue = a.timeValue
        bValue = b.timeValue
      }
      if (sortBy === "severity") {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
        aValue = severityOrder[a.severity]
        bValue = severityOrder[b.severity]
      }
      if (typeof aValue === "string") {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }
      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })
    return filtered
  }, [alertsData, severityFilter, typeFilter, statusFilter, timeRangeFilter, searchQuery, sortBy, sortOrder])

  // Alert counts
  const filteredAlertCounts = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0, total: 0 }
    filteredAlerts.forEach((alert) => {
      counts[alert.severity]++
      counts.total++
    })
    return counts
  }, [filteredAlerts])

  // Clear filters
  const clearFilters = () => {
    setSeverityFilter("all")
    setTypeFilter("all")
    setStatusFilter("all")
    setTimeRangeFilter("all")
    setSearchQuery("")
  }

  // Expose state and setters
  return {
    alertsData,
    filteredAlerts,
    filteredAlertCounts,
    loading,
    error,
    severityFilter, setSeverityFilter,
    typeFilter, setTypeFilter,
    statusFilter, setStatusFilter,
    timeRangeFilter, setTimeRangeFilter,
    searchQuery, setSearchQuery,
    sortBy, setSortBy,
    sortOrder, setSortOrder,
    clearFilters
  }
} 