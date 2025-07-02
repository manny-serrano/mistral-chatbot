"use client"

import Link from "next/link"
import { ShieldCheck, Bell, MapPin, ArrowLeft, Globe, AlertTriangle, Activity } from "lucide-react"
import { ProfileDropdown } from "@/components/profile-dropdown"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useEffect, useState } from "react"
import dynamic from "next/dynamic"

// Dynamically import the map to prevent SSR issues
const GeolocationMap = dynamic(() => import("@/components/geolocation-map"), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-96 bg-zinc-900 rounded-lg border border-zinc-800"><p className="text-zinc-400">Loading world map...</p></div>
})

interface LocationData {
  ip: string
  country: string
  city: string
  lat: number
  lon: number
  threats: number
  flows: number
}

interface GeolocationData {
  locations: LocationData[]
  total_ips: number
  total_threats: number
  total_flows: number
  success: boolean
  timestamp: string
  error?: string
}

export default function GeolocationVisualizationPage() {
  const [data, setData] = useState<GeolocationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/visualization/geolocation')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Error fetching geolocation data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load geolocation data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const getThreatLevel = (threats: number) => {
    if (threats >= 10) return { level: "High", color: "text-red-400", bgColor: "bg-red-500/20", borderColor: "border-red-500/30" }
    if (threats >= 5) return { level: "Medium", color: "text-orange-400", bgColor: "bg-orange-500/20", borderColor: "border-orange-500/30" }
    if (threats > 0) return { level: "Low", color: "text-yellow-400", bgColor: "bg-yellow-500/20", borderColor: "border-yellow-500/30" }
    return { level: "Clean", color: "text-green-400", bgColor: "bg-green-500/20", borderColor: "border-green-500/30" }
  }

  const topThreatCountries = data?.locations
    .reduce((acc, location) => {
      const existing = acc.find(item => item.country === location.country)
      if (existing) {
        existing.threats += location.threats
        existing.flows += location.flows
        existing.ips += 1
      } else {
        acc.push({
          country: location.country,
          threats: location.threats,
          flows: location.flows,
          ips: 1
        })
      }
      return acc
    }, [] as Array<{country: string, threats: number, flows: number, ips: number}>)
    .sort((a, b) => b.threats - a.threats)
    .slice(0, 5) || []

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
              <Link href="/visualization" className="text-sm font-medium text-zinc-300 hover:text-purple-300 transition-colors">
                Visualization
              </Link>
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
              <div className="rounded-lg bg-red-500/20 p-3 border border-red-400/30 backdrop-blur-sm">
                <MapPin className="h-6 w-6 text-red-300" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white">Geolocation Map</h1>
                <p className="text-lg text-zinc-200 mt-1">Geographic visualization of network traffic and threats</p>
              </div>
            </div>
          </div>

          {/* Statistics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card className="bg-gray-900/80 border-blue-400/40 backdrop-blur-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">Total IP Addresses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-blue-400" />
                  <span className="text-2xl font-bold text-white">{data?.total_ips || 0}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/80 border-red-400/40 backdrop-blur-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">Total Threats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                  <span className="text-2xl font-bold text-white">{data?.total_threats || 0}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/80 border-green-400/40 backdrop-blur-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">Total Flows</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-green-400" />
                  <span className="text-2xl font-bold text-white">{data?.total_flows || 0}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/80 border-purple-400/40 backdrop-blur-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">Threat Ratio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {data && data.total_flows > 0 ? 
                    ((data.total_threats / data.total_flows) * 100).toFixed(1) + '%' : 
                    '0%'
                  }
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Main Map */}
            <div className="xl:col-span-2">
              <Card className="bg-gray-900/80 border-red-400/40 backdrop-blur-xl">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-white flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-red-400" />
                        Global Threat Map
                      </CardTitle>
                      <CardDescription>
                        IP geolocation mapping with threat indicators
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                        {loading ? "Loading..." : "Live Data"}
                      </Badge>
                      <button
                        onClick={fetchData}
                        disabled={loading}
                        className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 px-3 py-1 rounded border border-red-500 hover:border-red-400 transition-colors flex items-center gap-1 text-sm"
                      >
                        🔄 Refresh
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0 h-[600px] relative">
                  {loading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-400 mx-auto mb-2"></div>
                        <p className="text-zinc-400">Loading geolocation data...</p>
                      </div>
                    </div>
                  ) : error ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <p className="text-red-400 mb-2">⚠️ {error}</p>
                        <p className="text-zinc-500 text-sm">Showing fallback data</p>
                      </div>
                    </div>
                  ) : (
                    <GeolocationMap 
                      locations={data?.locations || []} 
                      onLocationSelect={setSelectedLocation}
                    />
                  )}
                </CardContent>
              </Card>

              {/* Map Legend */}
              <Card className="bg-gray-900/80 border-gray-400/40 backdrop-blur-xl mt-4">
                <CardContent className="p-4">
                  <div className="text-sm">
                    <div className="font-medium mb-3 text-gray-300">Threat Level Legend:</div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span className="text-white">Clean (0 threats)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <span className="text-white">Low (1-4 threats)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                        <span className="text-white">Medium (5-9 threats)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <span className="text-white">High (10+ threats)</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Selected Location Details */}
              {selectedLocation && (
                <Card className="bg-gray-900/80 border-yellow-400/40 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="text-white text-lg">Location Details</CardTitle>
                    <CardDescription>Selected IP information</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm text-zinc-400">IP Address</div>
                        <div className="text-white font-medium">{selectedLocation.ip}</div>
                      </div>
                      <div>
                        <div className="text-sm text-zinc-400">Location</div>
                        <div className="text-white">{selectedLocation.city}, {selectedLocation.country}</div>
                      </div>
                      <div>
                        <div className="text-sm text-zinc-400">Coordinates</div>
                        <div className="text-white">{selectedLocation.lat.toFixed(4)}, {selectedLocation.lon.toFixed(4)}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-sm text-zinc-400">Threats</div>
                          <div className="text-red-400 font-bold">{selectedLocation.threats}</div>
                        </div>
                        <div>
                          <div className="text-sm text-zinc-400">Flows</div>
                          <div className="text-blue-400 font-bold">{selectedLocation.flows}</div>
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-zinc-400">Threat Level</div>
                        <Badge className={`${getThreatLevel(selectedLocation.threats).bgColor} ${getThreatLevel(selectedLocation.threats).color} ${getThreatLevel(selectedLocation.threats).borderColor}`}>
                          {getThreatLevel(selectedLocation.threats).level}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Top Threat Countries */}
              <Card className="bg-gray-900/80 border-orange-400/40 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Top Threat Countries</CardTitle>
                  <CardDescription>Countries with highest threat activity</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {topThreatCountries.map((country, index) => (
                      <div key={country.country} className="flex items-center justify-between p-2 rounded-lg bg-gray-800/50">
                        <div>
                          <div className="text-white font-medium">{country.country}</div>
                          <div className="text-zinc-400 text-sm">{country.ips} IPs</div>
                        </div>
                        <div className="text-right">
                          <div className="text-red-400 font-bold">{country.threats}</div>
                          <div className="text-zinc-400 text-sm">{country.flows} flows</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Threat Activity Summary */}
              <Card className="bg-gray-900/80 border-violet-400/40 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Activity Summary</CardTitle>
                  <CardDescription>Geographic threat distribution</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-400">High Threat Zones</span>
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                        {data?.locations.filter(l => l.threats >= 10).length || 0}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-400">Medium Threat Zones</span>
                      <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                        {data?.locations.filter(l => l.threats >= 5 && l.threats < 10).length || 0}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-400">Low Threat Zones</span>
                      <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                        {data?.locations.filter(l => l.threats > 0 && l.threats < 5).length || 0}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-400">Clean Zones</span>
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                        {data?.locations.filter(l => l.threats === 0).length || 0}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
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
    </div>
  )
} 