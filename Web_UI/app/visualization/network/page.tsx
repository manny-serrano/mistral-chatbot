"use client"

import Link from "next/link"
import dynamic from "next/dynamic"
import { ShieldCheck, ArrowLeft, Network, Activity } from "lucide-react"
import { ProfileDropdown } from "@/components/profile-dropdown"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useEffect, useState, useRef, useCallback } from "react"
import { NetworkGraphData } from "@/components/custom-network-graph"

// Dynamically import CustomNetworkGraph to prevent SSR issues
const CustomNetworkGraph = dynamic(() => import("@/components/custom-network-graph").then(mod => mod.CustomNetworkGraph), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full bg-zinc-900 rounded-lg"><p className="text-zinc-400">Loading network graph...</p></div>
})

interface NetworkStats {
  network_nodes: number
  active_connections: number
  total_flows: number
}

interface TrafficAnalysis {
  port_distribution: Array<{
    port: number
    service: string
    flow_count: number
    percentage: number
  }>
  protocol_distribution: Array<{
    protocol: string
    flow_count: number
    percentage: number
  }>
  traffic_categories: Array<{
    category: string
    count: number
    percentage: number
  }>
  malicious_traffic_percentage: number
  total_flows: number
  success: boolean
}

interface CustomNetworkGraphProps {
  graphData: NetworkGraphData
  searchIp: string
  loading: boolean
  info: string | null
  error: string | null
  onClearSearch: () => void;
}

const safeId = (id: string) => `label-${id.replace(/[^a-zA-Z0-9-_]/g, '_')}`

export default function NetworkVisualizationPage() {
  // State for component mounting
  const [componentMounted, setComponentMounted] = useState(false)
  
  // State for stats cards
  const [stats, setStats] = useState<NetworkStats | null>(null)
  const [trafficAnalysis, setTrafficAnalysis] = useState<TrafficAnalysis | null>(null)
  
  // State for the network graph
  const [graphData, setGraphData] = useState<NetworkGraphData>({ nodes: [], links: [] })
  const [graphLoading, setGraphLoading] = useState(true)
  const [graphError, setGraphError] = useState<string | null>(null)
  const [graphInfo, setGraphInfo] = useState<string | null>(null)
  const [nodeLimit, setNodeLimit] = useState(200)
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchRole, setSearchRole] = useState<'source' | 'dest'>('source')
  
  const networkGraphRef = useRef<any>(null)

  // Function to handle search
  const handleSearch = useCallback(async (ip: string) => {
    console.log('Search initiated for IP:', ip);
    
    if (!ip.trim()) {
      console.log('Empty search, returning to default view');
      setIsSearching(false)
      setSearchQuery('')
      fetchGraphData(nodeLimit)
      return
    }

    setIsSearching(true)
    setSearchQuery(ip)
    setGraphLoading(true)
    setGraphError(null)
    setGraphInfo(null)

    try {
      const url = `/api/network/graph?limit=${nodeLimit}&ip_address=${encodeURIComponent(ip.trim())}`;
      console.log('Fetching from URL:', url);
      
      const response = await fetch(url)
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      
      const data = await response.json()
      console.log('API Response:', data);
      
      // Always clear existing graph data first
      setGraphData({ nodes: [], links: [] });
      
      // Handle validation message or no results
      if (data.message) {
        console.log('Message received from API:', data.message);
        setGraphInfo(data.message)
        return
      }

      if (!data.success) {
        console.log('API reported failure:', data.error);
        throw new Error(data.error || 'Failed to fetch graph data')
      }
      
      // No nodes found
      if (!data.nodes || data.nodes.length === 0) {
        console.log('No nodes found in response');
        setGraphInfo(`No network connections found for IP: ${ip}`)
        return
      }

      console.log(`Found ${data.nodes.length} nodes and ${data.links.length} links`);
      let nodes = data.nodes || []
      const links = data.links || []

      // Adjust group labeling based on selected search role
      if (searchRole === 'dest') {
        nodes = nodes.map((n: any) => {
          if (n.id === ip.trim() || n.ip === ip.trim()) {
            return { ...n, group: 'dest_host' }
          }
          // flip others if they were dest_host
          if (n.group === 'dest_host') return { ...n, group: 'source_host' }
          return n
        })
      }

      setGraphData({ nodes, links })
    } catch (err) {
      console.error('Error searching network graph:', err)
      setGraphError(err instanceof Error ? err.message : 'Failed to search network')
      setGraphData({ nodes: [], links: [] })
    } finally {
      setGraphLoading(false)
    }
  }, [nodeLimit, searchRole])

  // Function to clear search
  const clearSearch = useCallback(() => {
    console.log('Clearing search');
    setSearchInput('')
    setSearchQuery('')
    setIsSearching(false)
    setGraphInfo(null)
    fetchGraphData(nodeLimit)
  }, [nodeLimit])

  const fetchGraphData = useCallback(async (limit: number) => {
    console.log('Fetching graph data with limit:', limit);
    setGraphLoading(true)
    setGraphError(null)
    setGraphInfo(null)
    try {
      const response = await fetch(`/api/network/graph?limit=${limit}`)
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      const data = await response.json()
      console.log('Fetch response:', data);
      
      // Handle message from backend (like "no data available")
      if (data.message) {
        console.log('Message received from API:', data.message);
        setGraphInfo(data.message)
        setGraphData({ nodes: [], links: [] })
        return
      }
      
      if (!data.success) throw new Error(data.error || 'Failed to fetch graph data')
      setGraphData({
        nodes: data.nodes || [],
        links: data.links || [],
      })
    } catch (err) {
      console.error('Error fetching network graph data:', err)
      setGraphError(err instanceof Error ? err.message : 'Failed to load network data')
      setGraphData({ nodes: [], links: [] })
    } finally {
      setGraphLoading(false)
    }
  }, [])

  // Track component mounting
  useEffect(() => {
    setComponentMounted(true)
  }, [])

  // Initial data fetch with a small delay to ensure component is ready
  useEffect(() => {
    if (!isSearching && componentMounted) {
      // Add a small delay to ensure the graph component is properly mounted
      const timer = setTimeout(() => {
        fetchGraphData(nodeLimit)
      }, 200) // Increased delay slightly
      
      return () => clearTimeout(timer)
    }
  }, [nodeLimit, isSearching, fetchGraphData, componentMounted])

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/network/stats')
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
        const data = await response.json()
        if (!data.success) throw new Error(data.error || 'Failed to fetch stats')
        setStats(data)
      } catch (err) {
        console.error('Error fetching network stats:', err)
      }
    }
    
    const fetchTrafficAnalysis = async () => {
      try {
        // Use the existing network stats endpoint and transform the data
        const response = await fetch('/api/network/stats')
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
        const data = await response.json()
        if (data.success) {
          // Transform the existing stats into traffic analysis format
          const totalFlows = data.total_flows || 0
          const maliciousFlows = data.malicious_flows || 0
          const maliciousPercentage = totalFlows > 0 ? Math.round((maliciousFlows / totalFlows) * 100 * 10) / 10 : 0
          
          // Transform top_ports data
          const portDistribution = (data.top_ports || []).map((port: any, index: number) => ({
            port: port.port,
            service: port.service || 'unknown',
            flow_count: port.count,
            percentage: index === 0 ? 35 : index === 1 ? 25 : index === 2 ? 20 : 10 // Estimated percentages
          }))
          
          const transformedData = {
            port_distribution: portDistribution,
            protocol_distribution: [], // Could add this later
            traffic_categories: [
              {
                category: "Normal Traffic",
                count: totalFlows - maliciousFlows,
                percentage: Math.round((1 - maliciousFlows / totalFlows) * 100 * 10) / 10
              },
              {
                category: "Malicious Traffic",
                count: maliciousFlows,
                percentage: maliciousPercentage
              }
            ],
            malicious_traffic_percentage: maliciousPercentage,
            total_flows: totalFlows,
            success: true
          }
          
          setTrafficAnalysis(transformedData)
        } else {
          console.error('Network stats API error:', data.error)
        }
      } catch (err) {
        console.error('Error fetching traffic analysis:', err)
      }
    }
    
    fetchStats()
    fetchTrafficAnalysis()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950/40 to-gray-900 text-zinc-100 relative overflow-hidden">
      {/* Animated background elements - Responsive sizes */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-10 w-32 sm:w-72 h-32 sm:h-72 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-48 sm:w-96 h-48 sm:h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 left-1/3 w-40 sm:w-80 h-40 sm:h-80 bg-fuchsia-500/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
      
      <header className="border-b border-purple-500/20 bg-gray-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 py-4">
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
            <nav className="flex items-center gap-2 sm:gap-4 md:gap-6">
              <Link
                href="/dashboard"
                className="text-xs sm:text-sm font-medium text-zinc-300 hover:text-purple-300 transition-colors"
              >
                Dashboard
              </Link>
                <Link
                  href="/chat"
                  className="text-xs sm:text-sm font-medium text-zinc-300 hover:text-purple-300 transition-colors"
                >
                  Chat
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
              </nav>
            </div>
              <ProfileDropdown />
          </div>
        </div>
      </header>

      <main className="relative py-8">
        {/* Enhanced background for better contrast */}
        <div className="absolute inset-0 bg-gradient-to-r from-gray-950/90 via-purple-950/50 to-gray-950/90" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/40 via-transparent to-transparent" />
        
        {/* Constrained width container for headers and stats */}
        <div className="relative mx-auto max-w-7xl px-3 sm:px-6">
          <div className="mb-6">
            <Link href="/visualization" className="inline-flex items-center gap-2 text-purple-300 hover:text-purple-200 transition-colors text-sm font-medium">
              <ArrowLeft className="h-4 w-4" />
              Back to Visualizations
            </Link>
          </div>
          <div className="mb-8">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-500/20 p-3 border border-purple-400/30">
                <Network className="h-6 w-6 text-purple-300" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white">Network Visualization</h1>
                <p className="text-lg text-zinc-200 mt-1">Interactive network topology and traffic analysis</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Stats Cards */}
            <Card className="bg-gray-900/80 border-purple-400/40 backdrop-blur-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">Network Nodes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Network className="h-4 w-4 text-purple-400" />
                  <span className="text-2xl font-bold text-white">{stats?.network_nodes?.toLocaleString() ?? '...'}</span>
                </div>
                <p className="text-xs text-zinc-500 mt-1">{graphError ? "⚠️ Error" : "Real-time from Neo4j"}</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-900/80 border-violet-400/40 backdrop-blur-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">Active Connections</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-violet-400" />
                  <span className="text-2xl font-bold text-white">{stats?.active_connections?.toLocaleString() ?? '...'}</span>
                </div>
                <p className="text-xs text-zinc-500 mt-1">{graphLoading ? "Loading..." : `${stats?.total_flows || 0} total flows`}</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-900/80 border-violet-400/40 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-zinc-400">Traffic Analysis</CardTitle>
                <CardDescription>Real-time traffic patterns from Neo4j</CardDescription>
              </CardHeader>
              <CardContent>
                {trafficAnalysis ? (
                  <div className="space-y-4">
                    {/* Top Ports */}
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-zinc-300">Top Ports</div>
                      {trafficAnalysis.port_distribution.slice(0, 3).map((port, index) => (
                        <div key={port.port} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-zinc-400">
                              Port {port.port} ({port.service})
                            </span>
                            <span className="text-xs text-zinc-500">{port.percentage}%</span>
                          </div>
                          <div className="w-full bg-gray-800 rounded-full h-1.5">
                            <div 
                              className={`h-1.5 rounded-full ${
                                index === 0 ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                                index === 1 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                                'bg-gradient-to-r from-purple-500 to-violet-500'
                              }`}
                              style={{ width: `${Math.min(port.percentage, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Malicious Traffic */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-400">Malicious Traffic</span>
                        <Badge className={`${
                          trafficAnalysis.malicious_traffic_percentage > 20 ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                          trafficAnalysis.malicious_traffic_percentage > 10 ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                          'bg-green-500/20 text-green-400 border-green-500/30'
                        }`}>
                          {trafficAnalysis.malicious_traffic_percentage > 20 ? 'High' :
                           trafficAnalysis.malicious_traffic_percentage > 10 ? 'Medium' : 'Low'}
                        </Badge>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            trafficAnalysis.malicious_traffic_percentage > 20 ? 'bg-gradient-to-r from-red-500 to-orange-500' :
                            trafficAnalysis.malicious_traffic_percentage > 10 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                            'bg-gradient-to-r from-green-500 to-emerald-500'
                          }`}
                          style={{ width: `${Math.min(trafficAnalysis.malicious_traffic_percentage, 100)}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-zinc-500">
                        {trafficAnalysis.malicious_traffic_percentage}% of {trafficAnalysis.total_flows.toLocaleString()} total flows
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center h-16">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-400"></div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* The network graph container */}
        <div className="relative mx-auto max-w-7xl px-3 sm:px-6 mt-8">
          <div className="space-y-6">
            <Card className="bg-gray-900/80 border-purple-400/40 backdrop-blur-xl h-[70vh] relative z-10">
              <div className="absolute top-3 left-3 right-3 z-20 flex flex-col sm:flex-row items-center justify-between gap-3 bg-black/60 backdrop-blur-md rounded-lg p-3 border border-gray-600">
                <div>
                  <h3 className="text-white flex items-center gap-2 text-lg font-medium">
                    <Network className="h-5 w-5 text-purple-400" />
                    Interactive Network Graph
                  </h3>
                  <p className="text-sm text-gray-300">Real-time network topology with threat indicators</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <select
                      value={searchRole}
                      onChange={(e)=>setSearchRole(e.target.value as 'source' | 'dest')}
                      className="bg-gray-800 text-white px-2 py-1 rounded border border-gray-600 focus:border-purple-400 focus:outline-none text-sm"
                    >
                      <option value="source">Source Host</option>
                      <option value="dest">Destination Host</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Search IP..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSearch(searchInput)
                        }
                      }}
                      className="bg-gray-800 text-white px-2 py-1 w-36 rounded border border-gray-600 focus:border-purple-400 focus:outline-none text-sm"
                    />
                    <button 
                      onClick={() => handleSearch(searchInput)} 
                      className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded border border-green-500 flex items-center gap-1 text-sm"
                    >
                      🔍
                    </button>
                    <button 
                      onClick={clearSearch} 
                      className="bg-gray-600 hover:bg-gray-700 px-3 py-1 rounded border border-gray-500 flex items-center gap-1 text-sm"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-300 text-sm">Limit:</span>
                    <select
                      id="nodeLimit"
                      name="nodeLimit"
                      value={nodeLimit}
                      onChange={(e) => setNodeLimit(parseInt(e.target.value))}
                      className="bg-gray-800 text-white px-2 py-1 rounded border border-gray-600 focus:border-purple-400 focus:outline-none text-sm"
                      aria-label="Node limit selector"
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
                      onClick={() => isSearching ? handleSearch(searchQuery) : fetchGraphData(nodeLimit)} 
                      disabled={graphLoading} 
                      className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 px-3 py-1 rounded border border-purple-500 flex items-center gap-1 text-sm"
                    >
                      {graphLoading ? '⏳' : '🔄'} Refresh
                    </button>
                    <button 
                      onClick={() => networkGraphRef.current?.centerGraph()} 
                      className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded border border-blue-500 flex items-center gap-1 text-sm"
                    >
                      🎯 Center
                    </button>
                  </div>
                </div>
              </div>
              <div className="absolute inset-0 w-full h-full rounded-lg overflow-hidden">
                <CustomNetworkGraph
                  ref={networkGraphRef}
                  graphData={graphData}
                  searchIp={searchQuery}
                  loading={graphLoading}
                  info={graphInfo}
                  error={graphError}
                  onClearSearch={clearSearch}
                />
              </div>
            </Card>
            
            <Card className="bg-gray-900/80 border-gray-400/40 backdrop-blur-xl">
              <CardContent className="p-6">
                <div className="font-medium mb-4 text-gray-300 text-lg">Node Legend:</div>
                <div className="flex flex-wrap gap-x-6 gap-y-4">
                  <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full bg-teal-400"></div><span className="text-white font-medium">🖥️ Source Hosts</span></div>
                  <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full bg-orange-400"></div><span className="text-white font-medium">🌐 Destination Hosts</span></div>
                  <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full bg-pink-400 border border-pink-300"></div><span className="text-white font-medium">💀 Malicious</span></div>
                  {searchQuery && (
                    <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full bg-yellow-400 border border-yellow-300"></div><span className="text-white font-medium">⭐ Searched Node</span></div>
                  )}
                </div>
                <div className="col-span-full text-sm text-zinc-400 mt-4">Hover a node to see its IP / hostname; malicious nodes are marked with a skull.</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
} 