"use client"

import Link from "next/link"
import { ShieldCheck, Bell, LineChart, ArrowLeft, Clock, TrendingUp, Activity, BarChart3 } from "lucide-react"
import { ProfileDropdown } from "@/components/profile-dropdown"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useEffect, useState } from "react"
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface TimeSeriesDataPoint {
  timestamp: string
  value: number
  metric: string
}

interface TimeSeriesData {
  data: TimeSeriesDataPoint[]
  metric: string
  period: string
  granularity: string
  total_points: number
  success: boolean
  timestamp: string
  error?: string
}

export default function TimeSeriesVisualizationPage() {
  const [data, setData] = useState<TimeSeriesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedMetric, setSelectedMetric] = useState("alerts")
  const [selectedPeriod, setSelectedPeriod] = useState("24h")
  const [selectedGranularity, setSelectedGranularity] = useState("1h")

  const metrics = [
    { id: "alerts", name: "Security Alerts", color: "#ef4444", icon: Activity },
    { id: "flows", name: "Network Flows", color: "#3b82f6", icon: BarChart3 },
    { id: "threats", name: "Threat Events", color: "#f59e0b", icon: TrendingUp },
    { id: "bandwidth", name: "Bandwidth Usage", color: "#10b981", icon: LineChart }
  ]

  const periods = [
    { id: "24h", name: "Last 24 Hours", granularities: ["30m", "1h"] },
    { id: "7d", name: "Last 7 Days", granularities: ["1h", "6h", "1d"] },
    { id: "30d", name: "Last 30 Days", granularities: ["1d"] }
  ]

  const fetchData = async (metric: string, period: string, granularity: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/visualization/time-series?metric=${metric}&period=${period}&granularity=${granularity}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Error fetching time-series data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load time-series data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData(selectedMetric, selectedPeriod, selectedGranularity)
  }, [selectedMetric, selectedPeriod, selectedGranularity])

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    if (selectedPeriod === "24h") {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    } else if (selectedPeriod === "7d") {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  const selectedMetricInfo = metrics.find(m => m.id === selectedMetric)
  const selectedPeriodInfo = periods.find(p => p.id === selectedPeriod)

  return (
    <main className="flex min-h-screen flex-col bg-gradient-to-br from-black via-purple-950/40 to-gray-950 text-zinc-100 relative">
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>

      <header className="border-b border-purple-500/20 bg-black/80 backdrop-blur-xl sticky top-0 z-50 relative">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="rounded-md bg-gradient-to-r from-purple-500 to-violet-500 p-1.5 shadow-lg shadow-purple-500/25">
                <ShieldCheck className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                CyberSense AI
              </h1>
            </Link>

            {/* Centered Navigation */}
            <div className="absolute left-1/2 transform -translate-x-1/2">
              <nav className="flex items-center gap-6">
                <Link href="/dashboard" className="text-sm font-medium text-zinc-300 hover:text-purple-300 transition-colors">
                  Dashboard
                </Link>
                <Link href="/chat" className="text-sm font-medium text-zinc-300 hover:text-purple-300 transition-colors">
                  Chat
                </Link>
                <Link href="/alerts" className="text-sm font-medium text-zinc-300 hover:text-purple-300 transition-colors">
                  Alerts
                </Link>
                <Link href="/reports" className="text-sm font-medium text-zinc-300 hover:text-purple-300 transition-colors">
                  Reports
                </Link>
                <Link href="/visualization" className="text-sm font-medium text-zinc-300 hover:text-purple-300 transition-colors">
                  Visualization
                </Link>
              </nav>
            </div>

            <div className="flex items-center gap-4">
              <button className="rounded-full bg-gray-800/50 backdrop-blur-sm p-2 text-zinc-400 hover:bg-gray-700/50 hover:text-zinc-100 border border-purple-500/20">
                <Bell className="h-5 w-5" />
              </button>
              <ProfileDropdown />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative py-8">
        <div className="relative mx-auto max-w-7xl px-6">
          {/* Breadcrumb Navigation */}
          <div className="mb-6">
            <Link 
              href="/visualization" 
              className="inline-flex items-center gap-2 text-purple-300 hover:text-purple-200 transition-colors text-sm font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Visualizations
            </Link>
          </div>

          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-500/20 p-3 border border-blue-400/30 backdrop-blur-sm">
                <LineChart className="h-6 w-6 text-blue-300" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white">Time-Series Line Chart</h1>
                <p className="text-lg text-zinc-200 mt-1">Temporal data analysis with interactive line charts</p>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Metric Selection */}
            <Card className="bg-gray-900/80 border-blue-400/40 backdrop-blur-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-400" />
                  Metric
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {metrics.map((metric) => {
                    const IconComponent = metric.icon
                    return (
                      <button
                        key={metric.id}
                        onClick={() => setSelectedMetric(metric.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                          selectedMetric === metric.id
                            ? 'bg-blue-500/20 border border-blue-400/30'
                            : 'bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600/30'
                        }`}
                      >
                        <IconComponent className="h-4 w-4" style={{ color: metric.color }} />
                        <span className="text-white font-medium">{metric.name}</span>
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Period Selection */}
            <Card className="bg-gray-900/80 border-blue-400/40 backdrop-blur-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-400" />
                  Time Period
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {periods.map((period) => (
                    <button
                      key={period.id}
                      onClick={() => {
                        setSelectedPeriod(period.id)
                        // Auto-select appropriate granularity
                        setSelectedGranularity(period.granularities[0])
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                        selectedPeriod === period.id
                          ? 'bg-blue-500/20 border border-blue-400/30'
                          : 'bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600/30'
                      }`}
                    >
                      <span className="text-white font-medium">{period.name}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Granularity Selection */}
            <Card className="bg-gray-900/80 border-blue-400/40 backdrop-blur-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-400" />
                  Granularity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {selectedPeriodInfo?.granularities.map((granularity) => (
                    <button
                      key={granularity}
                      onClick={() => setSelectedGranularity(granularity)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                        selectedGranularity === granularity
                          ? 'bg-blue-500/20 border border-blue-400/30'
                          : 'bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600/30'
                      }`}
                    >
                      <span className="text-white font-medium">{granularity}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Chart */}
          <Card className="bg-gray-900/80 border-blue-400/40 backdrop-blur-xl mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white flex items-center gap-2">
                    <LineChart className="h-5 w-5 text-blue-400" />
                    {selectedMetricInfo?.name} Over Time
                  </CardTitle>
                  <CardDescription>
                    {selectedPeriodInfo?.name} • {selectedGranularity} intervals • {data?.total_points || 0} data points
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                    {loading ? "Loading..." : "Live Data"}
                  </Badge>
                  <button
                    onClick={() => fetchData(selectedMetric, selectedPeriod, selectedGranularity)}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-3 py-1 rounded border border-blue-500 hover:border-blue-400 transition-colors flex items-center gap-1 text-sm"
                  >
                    🔄 Refresh
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-96 p-6">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-2"></div>
                      <p className="text-zinc-400">Loading time-series data...</p>
                    </div>
                  </div>
                ) : error ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <p className="text-red-400 mb-2">⚠️ {error}</p>
                      <p className="text-zinc-500 text-sm">Showing fallback data</p>
                    </div>
                  </div>
                ) : data?.data && data.data.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsLineChart data={data.data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis 
                        dataKey="timestamp" 
                        stroke="#9ca3af"
                        fontSize={12}
                        tickFormatter={formatTimestamp}
                      />
                      <YAxis stroke="#9ca3af" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1f2937', 
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          color: '#f9fafb'
                        }}
                        labelFormatter={(label) => `Time: ${formatTimestamp(label)}`}
                        formatter={(value: any) => [value, selectedMetricInfo?.name]}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke={selectedMetricInfo?.color || "#3b82f6"}
                        strokeWidth={2}
                        dot={{ fill: selectedMetricInfo?.color || "#3b82f6", strokeWidth: 2, r: 4 }}
                        name={selectedMetricInfo?.name}
                      />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <p className="text-zinc-400">No data available for the selected period</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Statistics */}
          {data?.data && data.data.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="bg-gray-900/80 border-green-400/40 backdrop-blur-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-400">Total Data Points</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{data.total_points}</div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/80 border-blue-400/40 backdrop-blur-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-400">Average Value</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {(data.data.reduce((sum, d) => sum + d.value, 0) / data.data.length).toFixed(1)}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/80 border-purple-400/40 backdrop-blur-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-400">Peak Value</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {Math.max(...data.data.map(d => d.value))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/80 border-amber-400/40 backdrop-blur-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-400">Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {data.data.length > 1 && data.data[data.data.length - 1].value > data.data[0].value ? "📈" : "📉"}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-purple-500/20 bg-gray-950/90 backdrop-blur-xl py-12 relative mt-16">
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
            <p className="text-sm text-zinc-400">© 2025 CyberSense AI. Built for cybersecurity professionals.</p>
          </div>
        </div>
      </footer>
    </main>
  )
} 