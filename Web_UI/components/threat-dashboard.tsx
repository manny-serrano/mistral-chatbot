"use client"

import type React from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import {
  AlertTriangle,
  Shield,
  Activity,
  Clock,
  Eye,
  X,
} from "lucide-react"

function ThreatDashboard() {

  return (
    <Card className="bg-zinc-950 border-zinc-800 h-[600px] flex flex-col">
      <CardHeader className="border-b border-zinc-800 px-2 sm:px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base sm:text-lg font-semibold text-white">Dashboard</span>
            <CardTitle className="text-sm sm:text-lg font-medium hidden sm:block">Threat Intelligence</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-hidden">
        <Tabs defaultValue="overview" className="w-full h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-1 bg-zinc-900 rounded-none border-b border-zinc-800 flex-shrink-0">
            <TabsTrigger value="overview" className="data-[state=active]:bg-purple-600 text-sm sm:text-base">
              Overview
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="p-2 sm:p-4 m-0 flex-1 overflow-y-auto">
            {/* Responsive Grid: 1 col on mobile, 2 on small tablets, 4 on desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4">
              <MetricCard
                title="Active Threats"
                value="7"
                trend="+2"
                trendDirection="up"
                icon={<AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />}
                priority="high"
              />
              <MetricCard
                title="Protected Assets"
                value="142"
                trend="+3"
                trendDirection="up"
                icon={<Shield className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500" />}
                priority="high"
              />
              {/* Hide on mobile, show on small tablets and up */}
              <MetricCard
                title="Traffic Anomalies"
                value="12"
                trend="-5"
                trendDirection="down"
                icon={<Activity className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />}
                priority="medium"
                className="hidden sm:block"
              />
              {/* Hide on mobile and small tablets, show on large screens */}
              <MetricCard
                title="Avg. Response Time"
                value="1.2s"
                trend="-0.3s"
                trendDirection="down"
                icon={<Clock className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />}
                priority="low"
                className="hidden lg:block"
              />
            </div>

            {/* Responsive Tables: Stack on mobile, side by side on larger screens */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-4">
              <ThreatTable
                title="Recent Malicious IPs"
                data={[
                  { id: 1, ip: "185.143.223.12", country: "RU", confidence: "High", timestamp: "10:42:15" },
                  { id: 2, ip: "103.35.74.74", country: "CN", confidence: "Medium", timestamp: "09:37:22" },
                  { id: 3, ip: "91.243.85.45", country: "UA", confidence: "High", timestamp: "08:15:03" },
                  { id: 4, ip: "45.227.255.206", country: "BR", confidence: "Medium", timestamp: "07:52:41" },
                ]}
              />
              <ThreatTable
                title="Suspicious Domains"
                data={[
                  { id: 1, ip: "malicious-site.com", country: "US", confidence: "High", timestamp: "10:15:33" },
                  { id: 2, ip: "download-free-stuff.net", country: "NL", confidence: "Medium", timestamp: "09:22:17" },
                  { id: 3, ip: "crypto-mining-pool.io", country: "RU", confidence: "High", timestamp: "08:45:09" },
                  { id: 4, ip: "fake-login-portal.com", country: "CN", confidence: "High", timestamp: "07:30:55" },
                ]}
              />
            </div>
          </TabsContent>




        </Tabs>
      </CardContent>
    </Card>
  )
}

interface MetricCardProps {
  title: string
  value: string
  trend: string
  trendDirection: "up" | "down"
  icon: React.ReactNode
  priority?: "high" | "medium" | "low"
  className?: string
}

function MetricCard({ title, value, trend, trendDirection, icon, priority = "medium", className = "" }: MetricCardProps) {
  return (
    <div className={`rounded-lg border border-zinc-800 bg-zinc-900 p-2 sm:p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-xs sm:text-sm font-medium text-zinc-400 truncate pr-1">{title}</h3>
        {icon}
      </div>
      <div className="mt-1 sm:mt-2 flex items-baseline">
        <p className="text-lg sm:text-2xl font-semibold text-white">{value}</p>
        <span className={`ml-1 sm:ml-2 text-xs font-medium ${trendDirection === "up" ? "text-red-500" : "text-emerald-500"}`}>
          {trend}
        </span>
      </div>
    </div>
  )
}

interface ThreatTableProps {
  title: string
  data: {
    id: number
    ip: string
    country: string
    confidence: string
    timestamp: string
  }[]
}

function ThreatTable({ title, data }: ThreatTableProps) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-2 sm:p-4">
      <h3 className="mb-2 sm:mb-3 text-xs sm:text-sm font-medium truncate">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="pb-1 sm:pb-2 text-left font-medium text-zinc-400">IP/Domain</th>
              <th className="pb-1 sm:pb-2 text-left font-medium text-zinc-400 hidden sm:table-cell">Origin</th>
              <th className="pb-1 sm:pb-2 text-left font-medium text-zinc-400">Confidence</th>
              <th className="pb-1 sm:pb-2 text-right font-medium text-zinc-400 hidden md:table-cell">Time</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.id} className="border-b border-zinc-800 last:border-0">
                <td className="py-1 sm:py-2 text-left font-medium text-white">
                  <div className="truncate max-w-[100px] sm:max-w-[150px]" title={item.ip}>
                    {item.ip}
                  </div>
                </td>
                <td className="py-1 sm:py-2 text-left text-zinc-300 hidden sm:table-cell">{item.country}</td>
                <td className="py-1 sm:py-2 text-left">
                  <span
                    className={`inline-block rounded-full px-1 sm:px-2 py-0.5 text-xs font-medium ${
                      item.confidence === "High" ? "bg-red-500/20 text-red-500" : "bg-amber-500/20 text-amber-500"
                    }`}
                  >
                    {item.confidence}
                  </span>
                </td>
                <td className="py-1 sm:py-2 text-right text-zinc-400 hidden md:table-cell text-xs">{item.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}



export default ThreatDashboard;
