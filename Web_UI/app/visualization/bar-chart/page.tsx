"use client"

import Link from "next/link"
import { ShieldCheck, Bell, BarChart3, ArrowLeft, Database, PieChart, List } from "lucide-react"
import { ProfileDropdown } from "@/components/profile-dropdown"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useEffect, useState } from "react"
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell } from 'recharts'

interface BarChartDataPoint {
  name: string
  value: number
  percentage: number
}

interface BarChartData {
  data: BarChartDataPoint[]
  chart_type: string
  total: number
  success: boolean
  timestamp: string
  error?: string
}

export default function BarChartVisualizationPage() {
  const [data, setData] = useState<BarChartData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedChartType, setSelectedChartType] = useState("protocols")
  const [viewMode, setViewMode] = useState<"bar" | "pie" | "table">("bar")

  const chartTypes = [
    { id: "protocols", name: "Network Protocols", description: "Distribution of network protocols", color: "#3b82f6" },
    { id: "ports", name: "Port Usage", description: "Most used destination ports", color: "#10b981" },
    { id: "threats", name: "Threat Sources", description: "Top threat-generating IPs", color: "#ef4444" },
    { id: "countries", name: "Geographic Distribution", description: "Traffic by country origin", color: "#f59e0b" }
  ]

  const colors = [
    "#3b82f6", "#10b981", "#ef4444", "#f59e0b", "#8b5cf6", 
    "#06b6d4", "#f97316", "#84cc16", "#ec4899", "#6366f1"
  ]

  const fetchData = async (chartType: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/visualization/bar-chart?chart_type=${chartType}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Error fetching bar chart data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load bar chart data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData(selectedChartType)
  }, [selectedChartType])

  const selectedChartInfo = chartTypes.find(c => c.id === selectedChartType)

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 border border-gray-600 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium">{`${label}`}</p>
          <p className="text-blue-400">
            {`Value: ${payload[0].value}`}
          </p>
          <p className="text-gray-400">
            {`Percentage: ${data?.data.find(d => d.name === label)?.percentage || 0}%`}
          </p>
        </div>
      )
    }
    return null
  }

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
              <div className="rounded-lg bg-green-500/20 p-3 border border-green-400/30 backdrop-blur-sm">
                <BarChart3 className="h-6 w-6 text-green-300" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white">Bar Chart</h1>
                <p className="text-lg text-zinc-200 mt-1">Statistical data visualization with customizable bar charts</p>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Chart Type Selection */}
            <Card className="bg-gray-900/80 border-green-400/40 backdrop-blur-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <Database className="h-5 w-5 text-green-400" />
                  Data Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-2">
                  {chartTypes.map((chart) => (
                    <button
                      key={chart.id}
                      onClick={() => setSelectedChartType(chart.id)}
                      className={`w-full flex items-start gap-3 p-3 rounded-lg transition-colors text-left ${
                        selectedChartType === chart.id
                          ? 'bg-green-500/20 border border-green-400/30'
                          : 'bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600/30'
                      }`}
                    >
                      <div 
                        className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0"
                        style={{ backgroundColor: chart.color }}
                      />
                      <div>
                        <div className="text-white font-medium">{chart.name}</div>
                        <div className="text-zinc-400 text-sm">{chart.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* View Mode Selection */}
            <Card className="bg-gray-900/80 border-green-400/40 backdrop-blur-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-green-400" />
                  View Mode
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[
                    { id: "bar", name: "Bar Chart", icon: BarChart3 },
                    { id: "pie", name: "Pie Chart", icon: PieChart },
                    { id: "table", name: "Data Table", icon: List }
                  ].map((mode) => {
                    const IconComponent = mode.icon
                    return (
                      <button
                        key={mode.id}
                        onClick={() => setViewMode(mode.id as any)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                          viewMode === mode.id
                            ? 'bg-green-500/20 border border-green-400/30'
                            : 'bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600/30'
                        }`}
                      >
                        <IconComponent className="h-4 w-4 text-green-400" />
                        <span className="text-white font-medium">{mode.name}</span>
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Chart */}
          <Card className="bg-gray-900/80 border-green-400/40 backdrop-blur-xl mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-green-400" />
                    {selectedChartInfo?.name} Analysis
                  </CardTitle>
                  <CardDescription>
                    {selectedChartInfo?.description} • Total: {data?.total || 0} entries
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    {loading ? "Loading..." : "Live Data"}
                  </Badge>
                  <button
                    onClick={() => fetchData(selectedChartType)}
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-3 py-1 rounded border border-green-500 hover:border-green-400 transition-colors flex items-center gap-1 text-sm"
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
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400 mx-auto mb-2"></div>
                      <p className="text-zinc-400">Loading chart data...</p>
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
                  <>
                    {viewMode === "bar" && (
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsBarChart data={data.data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis 
                            dataKey="name" 
                            stroke="#9ca3af"
                            fontSize={12}
                            angle={-45}
                            textAnchor="end"
                            height={80}
                          />
                          <YAxis stroke="#9ca3af" fontSize={12} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />
                          <Bar 
                            dataKey="value" 
                            fill={selectedChartInfo?.color || "#10b981"}
                            name="Count"
                          />
                        </RechartsBarChart>
                      </ResponsiveContainer>
                    )}

                    {viewMode === "pie" && (
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={data.data}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percentage }) => `${name} (${percentage}%)`}
                            outerRadius={120}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {data.data.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    )}

                    {viewMode === "table" && (
                      <div className="overflow-auto h-full">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-600">
                              <th className="text-left py-2 px-4 text-gray-300">Name</th>
                              <th className="text-right py-2 px-4 text-gray-300">Count</th>
                              <th className="text-right py-2 px-4 text-gray-300">Percentage</th>
                              <th className="text-left py-2 px-4 text-gray-300">Visual</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.data.map((item, index) => (
                              <tr key={item.name} className="border-b border-gray-700/50 hover:bg-gray-800/50">
                                <td className="py-3 px-4 text-white font-medium">{item.name}</td>
                                <td className="py-3 px-4 text-right text-white">{item.value.toLocaleString()}</td>
                                <td className="py-3 px-4 text-right text-gray-300">{item.percentage}%</td>
                                <td className="py-3 px-4">
                                  <div className="w-full bg-gray-700 rounded-full h-2">
                                    <div 
                                      className="h-2 rounded-full" 
                                      style={{ 
                                        width: `${item.percentage}%`,
                                        backgroundColor: colors[index % colors.length]
                                      }}
                                    />
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <p className="text-zinc-400">No data available for the selected category</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Statistics */}
          {data?.data && data.data.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="bg-gray-900/80 border-blue-400/40 backdrop-blur-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-400">Total Entries</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{data.total.toLocaleString()}</div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/80 border-green-400/40 backdrop-blur-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-400">Top Entry</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold text-white">{data.data[0]?.name || "N/A"}</div>
                  <div className="text-sm text-gray-400">{data.data[0]?.percentage || 0}%</div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/80 border-purple-400/40 backdrop-blur-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-400">Categories</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{data.data.length}</div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/80 border-amber-400/40 backdrop-blur-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-400">Diversity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {data.data[0]?.percentage < 50 ? "🌈" : "📊"}
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