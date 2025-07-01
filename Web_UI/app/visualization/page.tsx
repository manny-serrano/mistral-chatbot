"use client"

import Link from "next/link"
import dynamic from "next/dynamic"
import { ShieldCheck, Bell, BarChart3, Network, Cpu, Activity } from "lucide-react"
import { ProfileDropdown } from "@/components/profile-dropdown"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

// Dynamically import NetworkGraph to prevent SSR issues
const NetworkGraph = dynamic(() => import("@/components/network-graph").then(mod => ({ default: mod.NetworkGraph })), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-64 bg-zinc-900 rounded-lg border border-zinc-800"><p className="text-zinc-400">Loading network graph...</p></div>
})

export default function VisualizationPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950/40 to-gray-900 text-zinc-100 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-fuchsia-500/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none"></div>

      {/* Header */}
      <header className="border-b border-purple-500/20 bg-gray-950/80 backdrop-blur-xl sticky top-0 z-50 relative">
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
            <nav className="flex items-center gap-6">
              <Link href="/dashboard" className="text-sm font-medium text-zinc-300 hover:text-purple-300 transition-colors">
                Dashboard
              </Link>
              <Link href="/alerts" className="text-sm font-medium text-zinc-300 hover:text-purple-300 transition-colors">
                Alerts
              </Link>
              <Link href="/reports" className="text-sm font-medium text-zinc-300 hover:text-purple-300 transition-colors">
                Reports
              </Link>
              <span className="text-sm font-medium text-purple-300">Visualization</span>
            </nav>
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
        {/* Enhanced background for better contrast */}
        <div className="absolute inset-0 bg-gradient-to-r from-gray-950/90 via-purple-950/50 to-gray-950/90 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/40 via-transparent to-transparent pointer-events-none" />

        <div className="relative mx-auto max-w-7xl px-6">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-500/20 p-3 border border-purple-400/30 backdrop-blur-sm">
                <Network className="h-6 w-6 text-purple-300" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white">Network Visualization</h1>
                <p className="text-lg text-zinc-200 mt-1">Interactive network graphs and traffic analysis visualizations</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-4 mb-6">
            {/* Quick Stats Cards */}
            <Card className="bg-gray-900/80 border-purple-400/40 backdrop-blur-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">Network Nodes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Network className="h-4 w-4 text-purple-400" />
                  <span className="text-2xl font-bold text-white">1,247</span>
                </div>
                <p className="text-xs text-zinc-500 mt-1">+12 from last hour</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/80 border-violet-400/40 backdrop-blur-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">Active Connections</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-violet-400" />
                  <span className="text-2xl font-bold text-white">3,891</span>
                </div>
                <p className="text-xs text-zinc-500 mt-1">Real-time monitoring</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/80 border-fuchsia-400/40 backdrop-blur-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">Data Throughput</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-fuchsia-400" />
                  <span className="text-2xl font-bold text-white">2.4 GB/s</span>
                </div>
                <p className="text-xs text-zinc-500 mt-1">Peak: 3.1 GB/s</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/80 border-emerald-400/40 backdrop-blur-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">CPU Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-emerald-400" />
                  <span className="text-2xl font-bold text-white">67%</span>
                </div>
                <p className="text-xs text-zinc-500 mt-1">Within normal range</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            {/* Main Network Graph */}
            <div className="xl:col-span-2">
              <Card className="bg-gray-900/80 border-purple-400/40 backdrop-blur-xl h-[600px] relative z-10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Network className="h-5 w-5 text-purple-400" />
                    Interactive Network Graph
                  </CardTitle>
                  <CardDescription>
                    Real-time network topology with threat indicators
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0 h-[500px] relative overflow-hidden">
                  <div className="w-full h-full">
                    <NetworkGraph />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar with additional visualizations */}
            <div className="space-y-6">
              {/* Traffic Analysis */}
              <Card className="bg-gray-900/80 border-violet-400/40 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Traffic Analysis</CardTitle>
                  <CardDescription>Real-time traffic patterns</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-400">HTTP Traffic</span>
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Normal</Badge>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-2">
                      <div className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full" style={{ width: '65%' }}></div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-400">HTTPS Traffic</span>
                      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">High</Badge>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-2">
                      <div className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-400">Suspicious Traffic</span>
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Alert</Badge>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-2">
                      <div className="bg-gradient-to-r from-red-500 to-orange-500 h-2 rounded-full" style={{ width: '15%' }}></div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Top Threats */}
              <Card className="bg-gray-900/80 border-fuchsia-400/40 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Top Threats</CardTitle>
                  <CardDescription>Most active threat sources</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                      <div>
                        <p className="text-sm font-medium text-white">185.143.223.12</p>
                        <p className="text-xs text-red-400">Malware C&C</p>
                      </div>
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30">High</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-2 bg-orange-500/10 rounded-lg border border-orange-500/20">
                      <div>
                        <p className="text-sm font-medium text-white">91.243.85.45</p>
                        <p className="text-xs text-orange-400">Scanning Activity</p>
                      </div>
                      <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">Medium</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                      <div>
                        <p className="text-sm font-medium text-white">103.35.74.74</p>
                        <p className="text-xs text-yellow-400">Suspicious Pattern</p>
                      </div>
                      <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Low</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Network Health */}
              <Card className="bg-gray-900/80 border-emerald-400/40 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Network Health</CardTitle>
                  <CardDescription>Overall system status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-400">Firewall Status</span>
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-400">IDS/IPS</span>
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Operational</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-400">Threat Intel</span>
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Updated</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-400">Log Analysis</span>
                      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Processing</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
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
            <p className="text-sm text-zinc-400">© 2025 CyberSense AI. Built for cybersecurity professionals.</p>
          </div>
        </div>
      </footer>
    </div>
  )
} 