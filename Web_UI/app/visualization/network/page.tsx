"use client"

import Link from "next/link"
import dynamic from "next/dynamic"
import { ShieldCheck, Bell, BarChart3, Network, Cpu, Activity, ArrowLeft } from "lucide-react"
import { ProfileDropdown } from "@/components/profile-dropdown"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useEffect, useState, useRef } from "react"

// Dynamically import NetworkGraph to prevent SSR issues
const NetworkGraph = dynamic(() => import("@/components/network-graph").then(mod => ({ default: mod.NetworkGraph })), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-64 bg-zinc-900 rounded-lg border border-zinc-800"><p className="text-zinc-400">Loading network graph...</p></div>
})

interface NetworkStats {
  network_nodes: number
  active_connections: number
  data_throughput: string
  total_hosts: number
  total_flows: number
  total_protocols: number
  malicious_flows: number
  top_ports: Array<{ port: number; service?: string; count: number }>
  top_protocols: Array<{ protocol: string; count: number }>
  threat_indicators: Array<{ ip: string; count: number; threat_type: string }>
}

export default function NetworkVisualizationPage() {
  const [stats, setStats] = useState<NetworkStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const networkGraphRef = useRef<any>(null)
  const [, forceUpdate] = useState({})

  // Force component re-render to update controls
  useEffect(() => {
    const interval = setInterval(() => {
      if (networkGraphRef.current) {
        forceUpdate({})
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch('/api/network/stats')
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        
        if (!data.success && data.error) {
          throw new Error(data.error)
        }
        
        setStats(data)
      } catch (err) {
        console.error('Error fetching network stats:', err)
        setError(err instanceof Error ? err.message : 'Failed to load network statistics')
        
        // Fallback to mock data
        setStats({
          network_nodes: 1247,
          active_connections: 3891,
          data_throughput: "2.4 GB/s",
          total_hosts: 156,
          total_flows: 3891,
          total_protocols: 12,
          malicious_flows: 23,
          top_ports: [
            { port: 80, service: "http", count: 1024 },
            { port: 443, service: "https", count: 892 },
            { port: 22, service: "ssh", count: 234 },
          ],
          top_protocols: [
            { protocol: "tcp", count: 2847 },
            { protocol: "udp", count: 1044 },
          ],
          threat_indicators: [
            { ip: "185.143.223.12", count: 15, threat_type: "Malware C&C" },
            { ip: "91.243.85.45", count: 8, threat_type: "Scanning Activity" },
          ]
        })
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950/40 to-gray-900 text-zinc-100 relative overflow-hidden">
      {/* Animated background elements - Responsive sizes */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-20 left-10 w-32 sm:w-72 h-32 sm:h-72 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-48 sm:w-96 h-48 sm:h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 left-1/3 w-40 sm:w-80 h-40 sm:h-80 bg-fuchsia-500/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none"></div>

      {/* Header - Responsive */}
      <header className="border-b border-purple-500/20 bg-gray-950/80 backdrop-blur-xl sticky top-0 z-50 relative">
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

            {/* Responsive Navigation - Always visible with smaller text on mobile */}
            <nav className="flex items-center gap-2 sm:gap-4 md:gap-6">
              <Link
                href="/dashboard"
                className="text-xs sm:text-sm font-medium text-zinc-300 hover:text-purple-300 transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/alerts"
                className="text-xs sm:text-sm font-medium text-zinc-300 hover:text-purple-300 transition-colors"
              >
                Alerts
              </Link>
              <Link
                href="/reports"
                className="text-xs sm:text-sm font-medium text-zinc-300 hover:text-purple-300 transition-colors"
              >
                Reports
              </Link>
              <Link
                href="/visualization"
                className="text-xs sm:text-sm font-medium text-zinc-300 hover:text-purple-300 transition-colors"
              >
                <span className="hidden sm:inline">Visualization</span>
                <span className="sm:hidden">Visual</span>
              </Link>
              <ProfileDropdown />
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content - Responsive */}
      <main className="relative py-6 sm:py-8">
        {/* Enhanced background for better contrast */}
        <div className="absolute inset-0 bg-gradient-to-r from-gray-950/90 via-purple-950/50 to-gray-950/90 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/40 via-transparent to-transparent pointer-events-none" />

        <div className="relative mx-auto max-w-7xl px-3 sm:px-6">
          {/* Breadcrumb Navigation - Responsive */}
          <div className="mb-4 sm:mb-6">
            <Link 
              href="/visualization" 
              className="inline-flex items-center gap-2 text-purple-300 hover:text-purple-200 transition-colors text-xs sm:text-sm font-medium"
            >
              <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
              Back to Visualizations
            </Link>
          </div>

          {/* Page Header - Responsive */}
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-500/20 p-2 sm:p-3 border border-purple-400/30 backdrop-blur-sm">
                <Network className="h-5 w-5 sm:h-6 sm:w-6 text-purple-300" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white">Network Visualization</h1>
                <p className="text-base sm:text-lg text-zinc-200 mt-1">Interactive network graphs and traffic analysis visualizations</p>
              </div>
            </div>
          </div>

          {/* Quick Stats Cards - Responsive Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-4 sm:mb-6">
            {/* Quick Stats Cards */}
            <Card className="bg-gray-900/80 border-purple-400/40 backdrop-blur-xl">
              <CardHeader className="pb-1 sm:pb-2 p-3 sm:p-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-zinc-400">Network Nodes</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0">
                <div className="flex items-center gap-2">
                  <Network className="h-3 w-3 sm:h-4 sm:w-4 text-purple-400" />
                  {loading ? (
                    <span className="text-lg sm:text-2xl font-bold text-white">...</span>
                  ) : (
                    <span className="text-lg sm:text-2xl font-bold text-white">{stats?.network_nodes?.toLocaleString() || '0'}</span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  {error ? "⚠️ Using fallback data" : "Real-time from Neo4j"}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/80 border-violet-400/40 backdrop-blur-xl">
              <CardHeader className="pb-1 sm:pb-2 p-3 sm:p-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-zinc-400">Active Connections</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0">
                <div className="flex items-center gap-2">
                  <Activity className="h-3 w-3 sm:h-4 sm:w-4 text-violet-400" />
                  {loading ? (
                    <span className="text-lg sm:text-2xl font-bold text-white">...</span>
                  ) : (
                    <span className="text-lg sm:text-2xl font-bold text-white">{stats?.active_connections?.toLocaleString() || '0'}</span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  {loading ? "Loading..." : `${stats?.total_flows || 0} total flows`}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/80 border-fuchsia-400/40 backdrop-blur-xl">
              <CardHeader className="pb-1 sm:pb-2 p-3 sm:p-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-zinc-400">Data Throughput</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 text-fuchsia-400" />
                  {loading ? (
                    <span className="text-lg sm:text-2xl font-bold text-white">...</span>
                  ) : (
                    <span className="text-lg sm:text-2xl font-bold text-white">{stats?.data_throughput || '0 GB/s'}</span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  {loading ? "Calculating..." : `${stats?.total_hosts || 0} unique hosts`}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/80 border-emerald-400/40 backdrop-blur-xl">
              <CardHeader className="pb-1 sm:pb-2 p-3 sm:p-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-zinc-400">Security Status</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0">
                <div className="flex items-center gap-2">
                  <Cpu className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-400" />
                  {loading ? (
                    <span className="text-lg sm:text-2xl font-bold text-white">...</span>
                  ) : (
                    <span className="text-lg sm:text-2xl font-bold text-white">{stats?.malicious_flows || 0}</span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  {loading ? "Analyzing..." : "Malicious flows detected"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Responsive Layout - Stack on mobile, side-by-side on larger screens */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
            {/* Main Network Graph */}
            <div className="xl:col-span-2">
              <Card className="bg-gray-900/80 border-purple-400/40 backdrop-blur-xl h-[500px] sm:h-[600px] relative z-10">
                <CardHeader className="p-3 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-white flex items-center gap-2 text-base sm:text-lg">
                        <Network className="h-4 w-4 sm:h-5 sm:w-5 text-purple-400" />
                        Interactive Network Graph
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm">
                        Real-time network topology with threat indicators
                      </CardDescription>
                    </div>
                    
                    {/* Graph Controls - Responsive */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-300 text-xs sm:text-sm">Limit:</span>
                        <select 
                          value={networkGraphRef.current?.nodeLimit || 200}
                          onChange={(e) => networkGraphRef.current?.handleLimitChange(parseInt(e.target.value))}
                          className="bg-gray-800 text-white px-2 py-1 rounded border border-gray-600 focus:border-purple-400 focus:outline-none text-xs sm:text-sm"
                        >
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                          <option value={200}>200</option>
                          <option value={500}>500</option>
                          <option value={1000}>1000</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => networkGraphRef.current?.refreshGraph()}
                          disabled={networkGraphRef.current?.loading}
                          className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 px-2 sm:px-3 py-1 rounded border border-purple-500 hover:border-purple-400 transition-colors flex items-center gap-1 text-xs sm:text-sm"
                        >
                          {networkGraphRef.current?.loading ? '⏳' : '🔄'}
                          <span className="hidden sm:inline">{networkGraphRef.current?.loading ? 'Loading...' : 'Refresh'}</span>
                        </button>
                        <button
                          onClick={() => networkGraphRef.current?.centerGraph()}
                          className="bg-blue-600 hover:bg-blue-700 px-2 sm:px-3 py-1 rounded border border-blue-500 hover:border-blue-400 transition-colors flex items-center gap-1 text-xs sm:text-sm"
                        >
                          🎯
                          <span className="hidden sm:inline">Center</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0 h-[400px] sm:h-[500px] relative">
                  <div className="w-full h-full">
                    <NetworkGraph ref={networkGraphRef} />
                  </div>
                </CardContent>
              </Card>
              
              {/* Network Graph Legend - Outside the card */}
              <Card className="bg-gray-900/80 border-gray-400/40 backdrop-blur-xl mt-3 sm:mt-4">
                <CardContent className="p-3 sm:p-4">
                  <div className="text-xs sm:text-sm">
                    <div className="font-medium mb-2 sm:mb-3 text-gray-300">Node Legend:</div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-blue-500"></div>
                        <span className="text-white">📤 Source Hosts</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-green-500"></div>
                        <span className="text-white">📥 Destination Hosts</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-red-500 border border-red-400"></div>
                        <span className="text-white">⚠️ Malicious Nodes</span>
                      </div>
                    </div>
                    <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-600 text-gray-400 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                      <div>💜 Animated particles = Data flow</div>
                      <div>🔍 Zoom in to see IP labels</div>
                      <div>🎯 Use Center button if nodes go off-screen</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar with additional visualizations */}
            <div className="space-y-4 sm:space-y-6">
              {/* Traffic Analysis - Responsive */}
              <Card className="bg-gray-900/80 border-violet-400/40 backdrop-blur-xl">
                <CardHeader className="p-3 sm:p-6">
                  <CardTitle className="text-white text-base sm:text-lg">Traffic Analysis</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Real-time traffic patterns</CardDescription>
                </CardHeader>
                <CardContent className="p-3 sm:p-6 pt-0">
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm text-zinc-400">HTTP Traffic</span>
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">Normal</Badge>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-2">
                      <div className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full" style={{ width: '65%' }}></div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm text-zinc-400">HTTPS Traffic</span>
                      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">High</Badge>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-2">
                      <div className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm text-zinc-400">Suspicious Traffic</span>
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">Alert</Badge>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-2">
                      <div className="bg-gradient-to-r from-red-500 to-orange-500 h-2 rounded-full" style={{ width: '15%' }}></div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Top Threats - Responsive */}
              <Card className="bg-gray-900/80 border-fuchsia-400/40 backdrop-blur-xl">
                <CardHeader className="p-3 sm:p-6">
                  <CardTitle className="text-white text-base sm:text-lg">Top Threats</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Most active threat sources</CardDescription>
                </CardHeader>
                <CardContent className="p-3 sm:p-6 pt-0">
                  <div className="space-y-2 sm:space-y-3">
                    {loading ? (
                      <div className="text-center text-zinc-400 text-xs sm:text-sm">Loading threat indicators...</div>
                    ) : stats?.threat_indicators && stats.threat_indicators.length > 0 ? (
                      stats.threat_indicators.slice(0, 3).map((threat, index) => {
                        const severityColor = threat.count > 10 ? "red" : threat.count > 5 ? "orange" : "yellow"
                        const isHighThreat = threat.count > 10
                        const isMediumThreat = threat.count > 5 && threat.count <= 10
                        const isLowThreat = threat.count <= 5
                        
                        return (
                          <div key={threat.ip} className={`flex items-center justify-between p-2 sm:p-3 rounded-lg border ${
                            isHighThreat ? 'bg-red-500/10 border-red-500/20' :
                            isMediumThreat ? 'bg-orange-500/10 border-orange-500/20' :
                            'bg-yellow-500/10 border-yellow-500/20'
                          }`}>
                            <div>
                              <p className="text-xs sm:text-sm font-medium text-white">{threat.ip}</p>
                              <p className={`text-xs ${
                                isHighThreat ? 'text-red-400' :
                                isMediumThreat ? 'text-orange-400' :
                                'text-yellow-400'
                              }`}>{threat.threat_type}</p>
                            </div>
                            <Badge className={`text-xs ${
                              isHighThreat ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                              isMediumThreat ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                              'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                            }`}>
                              {threat.count > 10 ? "High" : threat.count > 5 ? "Medium" : "Low"}
                            </Badge>
                          </div>
                        )
                      })
                    ) : (
                      <div className="text-center text-zinc-400 text-xs sm:text-sm">No active threats detected</div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Network Health - Responsive */}
              <Card className="bg-gray-900/80 border-emerald-400/40 backdrop-blur-xl">
                <CardHeader className="p-3 sm:p-6">
                  <CardTitle className="text-white text-base sm:text-lg">Network Health</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Overall system status</CardDescription>
                </CardHeader>
                <CardContent className="p-3 sm:p-6 pt-0">
                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm text-zinc-400">Neo4j Database</span>
                      <Badge className={stats && !error ? 
                        'bg-green-500/20 text-green-400 border-green-500/30 text-xs' : 
                        'bg-red-500/20 text-red-400 border-red-500/30 text-xs'
                      }>
                        {stats && !error ? 'Connected' : 'Error'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm text-zinc-400">Total Protocols</span>
                      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                        {loading ? "..." : stats?.total_protocols || 0}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm text-zinc-400">Graph Nodes</span>
                      <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
                        {loading ? "..." : stats?.network_nodes?.toLocaleString() || 0}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm text-zinc-400">Security Analysis</span>
                      <Badge className={(stats?.malicious_flows || 0) > 0 ? 
                        'bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs' : 
                        'bg-green-500/20 text-green-400 border-green-500/30 text-xs'
                      }>
                        {loading ? "..." : (stats?.malicious_flows || 0) > 0 ? "Threats Found" : "Clean"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Footer - Responsive */}
      <footer className="border-t border-purple-500/20 bg-gray-950/90 backdrop-blur-xl py-8 sm:py-12 relative">
        <div className="mx-auto max-w-7xl px-3 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-gradient-to-r from-purple-500 to-violet-500 p-1.5 shadow-lg shadow-purple-500/25">
                <ShieldCheck className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
              </div>
              <span className="text-sm sm:text-base font-semibold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                CyberSense AI
              </span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 text-center sm:text-right">© 2025 CyberSense AI. Built for cybersecurity professionals.</p>
          </div>
        </div>
      </footer>
    </div>
  )
} 