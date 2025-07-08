"use client"

import Link from "next/link"
import { ShieldCheck, Bell, Network, BarChart3, PieChart, TrendingUp, Activity, Map, Globe, Zap, LineChart, MapPin, RefreshCw, Download } from "lucide-react"
import { ProfileDropdown } from "@/components/profile-dropdown"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function VisualizationPage() {
  const visualizationTypes = [
    {
      id: "network",
      title: "Network Visualization",
      description: "Interactive network graphs and topology visualizations",
      icon: Network,
      color: "purple",
      gradient: "from-purple-500 to-violet-500",
      bgColor: "bg-purple-500/10",
      borderColor: "border-purple-400/30",
      textColor: "text-purple-300",
      href: "/visualization/network",
      status: "Active",
      features: ["Real-time network topology", "Threat indicators", "Interactive nodes"]
    },
    {
      id: "time-series",
      title: "Time-Series Line Chart",
      description: "Temporal data analysis with interactive line charts",
      icon: LineChart,
      color: "blue",
      gradient: "from-blue-500 to-cyan-500",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-400/30",
      textColor: "text-blue-300",
      href: "/visualization/time-series",
      status: "Active",
      features: ["Historical data trends", "Multi-metric comparison", "Zoom and pan controls"]
    },
    {
      id: "bar-chart",
      title: "Bar Chart",
      description: "Statistical data visualization with customizable bar charts",
      icon: BarChart3,
      color: "green",
      gradient: "from-green-500 to-emerald-500",
      bgColor: "bg-green-500/10",
      borderColor: "border-green-400/30",
      textColor: "text-green-300",
      href: "/visualization/bar-chart",
      status: "Active",
      features: ["Protocol distribution", "Port usage statistics", "Traffic volume analysis"]
    },
    {
      id: "geolocation",
      title: "Geolocation Map",
      description: "Geographic visualization of network traffic and threats",
      icon: MapPin,
      color: "red",
      gradient: "from-red-500 to-orange-500",
      bgColor: "bg-red-500/10",
      borderColor: "border-red-400/30",
      textColor: "text-red-300",
      href: "/visualization/geolocation",
      status: "Active",
      features: ["IP geolocation mapping", "Threat origin tracking", "Traffic flow visualization"]
    },
    {
      id: "heatmap",
      title: "Heatmap",
      description: "Intensity-based visualizations for pattern recognition",
      icon: Activity,
      color: "amber",
      gradient: "from-amber-500 to-yellow-500",
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-400/30",
      textColor: "text-amber-300",
      href: "/visualization/heatmap",
      status: "Active",
      features: ["Traffic intensity patterns", "Temporal activity heatmaps", "Security event clustering"]
    }
  ]

  return (
    <main className="flex min-h-screen flex-col bg-gradient-to-br from-black via-purple-950/40 to-gray-950 text-zinc-100 relative">
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>

      <header className="border-b border-purple-500/20 bg-black/80 backdrop-blur-xl sticky top-0 z-50 relative">
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
              <span className="text-xs sm:text-sm font-medium text-purple-300">
                <span className="hidden sm:inline">Visualization</span>
                <span className="sm:hidden">Visual</span>
              </span>
            </nav>
            </div>

            <ProfileDropdown />
          </div>
        </div>
      </header>

      {/* Main Content - Responsive */}
      <main className="relative py-6 sm:py-8">
        {/* Enhanced background for better contrast */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-purple-950/50 to-black/90" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/40 via-transparent to-transparent" />
        
        <div className="relative mx-auto max-w-7xl px-3 sm:px-6">
          {/* Page Header */}
          <div className="mb-12">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-purple-500/20 p-3 border border-purple-400/30 backdrop-blur-sm">
                  <BarChart3 className="h-6 w-6 text-purple-300" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-white">Data Visualizations</h1>
                  <p className="text-lg text-zinc-200 mt-1">Choose your visualization type to explore different aspects of your data</p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-purple-400/40 text-zinc-200 hover:bg-purple-900/40 bg-transparent backdrop-blur-sm text-xs sm:text-sm"
                  onClick={() => window.location.reload()}
                >
                  <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Refresh
                </Button>
                <Button size="sm" className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-xs sm:text-sm">
                  <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </div>

          {/* Visualization Type Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {visualizationTypes.map((type) => {
              const IconComponent = type.icon
              const isActive = type.status === "Active"
              
              return (
                <Link 
                  key={type.id} 
                  href={isActive ? type.href : "#"} 
                  className={`block group transition-all duration-300 ${isActive ? 'hover:scale-105 cursor-pointer' : 'cursor-not-allowed opacity-75'}`}
                >
                  <Card className={`${type.bgColor} border-2 ${type.borderColor} backdrop-blur-xl relative overflow-hidden h-full ${isActive ? 'hover:shadow-2xl hover:shadow-purple-500/25' : ''}`}>
                    {/* Card gradient overlay */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${type.gradient} opacity-5`} />
                    
                    {/* Status badge */}
                    <div className="absolute top-4 right-4">
                      <Badge className={`${
                        isActive 
                          ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                          : 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                      }`}>
                        {type.status}
                      </Badge>
                    </div>

                    <CardHeader className="pb-4 relative z-10">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`rounded-lg bg-gradient-to-r ${type.gradient} p-2 shadow-lg`}>
                          <IconComponent className="h-6 w-6 text-white" />
                        </div>
                        <CardTitle className="text-xl text-white group-hover:text-purple-200 transition-colors">
                          {type.title}
                        </CardTitle>
                      </div>
                      <CardDescription className="text-zinc-300 leading-relaxed">
                        {type.description}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="relative z-10">
                      <div className="space-y-3">
                        <h4 className={`text-sm font-medium ${type.textColor}`}>Key Features:</h4>
                        <ul className="space-y-2">
                          {type.features.map((feature, index) => (
                            <li key={index} className="flex items-center gap-2 text-zinc-200">
                              <Zap className="h-3 w-3 text-purple-400" />
                              <span className="text-sm font-medium">{feature}</span>
                            </li>
                          ))}
                        </ul>
                        
                        {!isActive && (
                          <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                            <p className="text-sm text-orange-300">
                              This visualization type is coming soon. Stay tuned for updates!
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>

                    {/* Hover effect overlay */}
                    {isActive && (
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-violet-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    )}
                  </Card>
                </Link>
              )
            })}
          </div>

          {/* Quick Stats Section */}
          <div className="mt-12">
            <Card className="bg-gray-900/80 border-purple-400/40 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Globe className="h-5 w-5 text-purple-400" />
                  Visualization Overview
                </CardTitle>
                <CardDescription>
                  Quick overview of available visualization capabilities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-300 mb-1">5</div>
                    <div className="text-sm text-zinc-400">Visualization Types</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-300 mb-1">5</div>
                    <div className="text-sm text-zinc-400">Currently Active</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-300 mb-1">0</div>
                    <div className="text-sm text-zinc-400">Coming Soon</div>
                  </div>
                </div>
              </CardContent>
            </Card>
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
    </main>
  )
} 