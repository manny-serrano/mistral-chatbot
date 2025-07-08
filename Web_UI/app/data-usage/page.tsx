"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Shield,
  Database,
  Activity,
  TrendingUp,
  Download,
  HardDrive,
  Zap,
  Calendar,
  BarChart3,
  LineChart,
} from "lucide-react"

export default function DataUsagePage() {
  const [selectedPeriod, setSelectedPeriod] = useState("30d")

  const usageData = {
    current: {
      requests: 18650,
      dataProcessed: 2.4, // GB
      storage: 15.8, // GB
      bandwidth: 890, // MB
    },
    limits: {
      requests: 50000,
      dataProcessed: 10, // GB
      storage: 100, // GB
      bandwidth: 5000, // MB
    },
    billing: {
      plan: "Pro",
      cost: 49.99,
      nextBilling: "2025-02-15",
    },
  }

  const getUsagePercentage = (current: number, limit: number) => {
    return Math.min((current / limit) * 100, 100)
  }

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return "text-red-400"
    if (percentage >= 75) return "text-yellow-400"
    return "text-green-400"
  }

  const getUsageBarColor = (percentage: number) => {
    if (percentage >= 90) return "from-red-600 to-red-500"
    if (percentage >= 75) return "from-yellow-600 to-yellow-500"
    return "from-green-600 to-green-500"
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-purple-950">
      {/* Header */}
      <div className="border-b border-purple-500/20 bg-gray-900/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <Shield className="h-8 w-8 text-purple-400" />
                <span className="text-xl font-bold text-white">LEVANT AI</span>
              </Link>
              <div className="text-zinc-400">/</div>
              <h1 className="text-lg font-semibold text-white">Data Usage</h1>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-gradient-to-r from-purple-500/20 to-violet-500/20 text-purple-300 border-purple-500/30">
                {usageData.billing.plan} Plan
              </Badge>
              <Button variant="outline">Upgrade Plan</Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Usage Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gray-900/50 border-purple-500/30 backdrop-blur-xl">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Activity className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-400">API Requests</p>
                  <p className="text-2xl font-bold text-white">{usageData.current.requests.toLocaleString()}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Usage</span>
                  <span
                    className={getUsageColor(getUsagePercentage(usageData.current.requests, usageData.limits.requests))}
                  >
                    {getUsagePercentage(usageData.current.requests, usageData.limits.requests).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className={`bg-gradient-to-r ${getUsageBarColor(getUsagePercentage(usageData.current.requests, usageData.limits.requests))} h-2 rounded-full`}
                    style={{ width: `${getUsagePercentage(usageData.current.requests, usageData.limits.requests)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-zinc-500">{usageData.limits.requests.toLocaleString()} limit</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-green-500/30 backdrop-blur-xl">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <Database className="h-6 w-6 text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Data Processed</p>
                  <p className="text-2xl font-bold text-white">{usageData.current.dataProcessed} GB</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Usage</span>
                  <span
                    className={getUsageColor(
                      getUsagePercentage(usageData.current.dataProcessed, usageData.limits.dataProcessed),
                    )}
                  >
                    {getUsagePercentage(usageData.current.dataProcessed, usageData.limits.dataProcessed).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className={`bg-gradient-to-r ${getUsageBarColor(getUsagePercentage(usageData.current.dataProcessed, usageData.limits.dataProcessed))} h-2 rounded-full`}
                    style={{
                      width: `${getUsagePercentage(usageData.current.dataProcessed, usageData.limits.dataProcessed)}%`,
                    }}
                  ></div>
                </div>
                <p className="text-xs text-zinc-500">{usageData.limits.dataProcessed} GB limit</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-orange-500/30 backdrop-blur-xl">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
                  <HardDrive className="h-6 w-6 text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Storage Used</p>
                  <p className="text-2xl font-bold text-white">{usageData.current.storage} GB</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Usage</span>
                  <span
                    className={getUsageColor(getUsagePercentage(usageData.current.storage, usageData.limits.storage))}
                  >
                    {getUsagePercentage(usageData.current.storage, usageData.limits.storage).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className={`bg-gradient-to-r ${getUsageBarColor(getUsagePercentage(usageData.current.storage, usageData.limits.storage))} h-2 rounded-full`}
                    style={{ width: `${getUsagePercentage(usageData.current.storage, usageData.limits.storage)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-zinc-500">{usageData.limits.storage} GB limit</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-violet-500/30 backdrop-blur-xl">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 bg-violet-500/20 rounded-lg flex items-center justify-center">
                  <Zap className="h-6 w-6 text-violet-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Bandwidth</p>
                  <p className="text-2xl font-bold text-white">{usageData.current.bandwidth} MB</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Usage</span>
                  <span
                    className={getUsageColor(
                      getUsagePercentage(usageData.current.bandwidth, usageData.limits.bandwidth),
                    )}
                  >
                    {getUsagePercentage(usageData.current.bandwidth, usageData.limits.bandwidth).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className={`bg-gradient-to-r ${getUsageBarColor(getUsagePercentage(usageData.current.bandwidth, usageData.limits.bandwidth))} h-2 rounded-full`}
                    style={{ width: `${getUsagePercentage(usageData.current.bandwidth, usageData.limits.bandwidth)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-zinc-500">{usageData.limits.bandwidth} MB limit</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-gray-900/50 border border-purple-500/30">
            <TabsTrigger value="overview" className="data-[state=active]:bg-purple-600">
              Overview
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-purple-600">
              Analytics
            </TabsTrigger>
            <TabsTrigger value="billing" className="data-[state=active]:bg-purple-600">
              Billing
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-purple-600">
              Usage History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-gray-900/50 border-purple-500/30 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Usage Breakdown
                  </CardTitle>
                  <CardDescription className="text-zinc-400">Current month usage across all services</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-white font-medium">Threat Detection</span>
                        <span className="text-zinc-400">45%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-purple-600 to-violet-600 h-2 rounded-full"
                          style={{ width: "45%" }}
                        ></div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-white font-medium">Vulnerability Scanning</span>
                        <span className="text-zinc-400">30%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-blue-600 to-cyan-600 h-2 rounded-full"
                          style={{ width: "30%" }}
                        ></div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-white font-medium">Incident Response</span>
                        <span className="text-zinc-400">15%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-green-600 to-emerald-600 h-2 rounded-full"
                          style={{ width: "15%" }}
                        ></div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-white font-medium">Compliance Monitoring</span>
                        <span className="text-zinc-400">10%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-orange-600 to-red-600 h-2 rounded-full"
                          style={{ width: "10%" }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/50 border-purple-500/30 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Usage Trends
                  </CardTitle>
                  <CardDescription className="text-zinc-400">Your usage patterns over the last 30 days</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg border border-purple-500/20">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                          <TrendingUp className="h-4 w-4 text-green-400" />
                        </div>
                        <div>
                          <p className="text-white font-medium">Peak Usage Day</p>
                          <p className="text-sm text-zinc-400">January 15, 2025</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-bold">2,847</p>
                        <p className="text-sm text-zinc-400">requests</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg border border-purple-500/20">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                          <Calendar className="h-4 w-4 text-blue-400" />
                        </div>
                        <div>
                          <p className="text-white font-medium">Average Daily Usage</p>
                          <p className="text-sm text-zinc-400">Last 30 days</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-bold">622</p>
                        <p className="text-sm text-zinc-400">requests/day</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg border border-purple-500/20">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                          <Activity className="h-4 w-4 text-purple-400" />
                        </div>
                        <div>
                          <p className="text-white font-medium">Growth Rate</p>
                          <p className="text-sm text-zinc-400">vs. last month</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-green-400 font-bold">+23%</p>
                        <p className="text-sm text-zinc-400">increase</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <Card className="bg-gray-900/50 border-purple-500/30 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-white">Usage Analytics</CardTitle>
                <CardDescription className="text-zinc-400">
                  Detailed analytics and insights about your data usage
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <LineChart className="h-16 w-16 text-zinc-400 mx-auto mb-4" />
                  <p className="text-zinc-400">Analytics dashboard coming soon</p>
                  <p className="text-sm text-zinc-500 mt-2">
                    We're working on detailed analytics to help you understand your usage patterns better.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="billing">
            <Card className="bg-gray-900/50 border-purple-500/30 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-white">Billing Information</CardTitle>
                <CardDescription className="text-zinc-400">Your current plan and billing details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-6 bg-gradient-to-r from-purple-500/10 to-violet-500/10 rounded-lg border border-purple-500/20">
                    <div>
                      <h3 className="text-xl font-bold text-white">{usageData.billing.plan} Plan</h3>
                      <p className="text-zinc-400">Perfect for growing teams</p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-white">${usageData.billing.cost}</p>
                      <p className="text-zinc-400">per month</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="text-lg font-semibold text-white">Plan Features</h4>
                      <div className="space-y-2">
                        {[
                          "50,000 API requests/month",
                          "10 GB data processing",
                          "100 GB storage",
                          "5 GB bandwidth",
                          "Priority support",
                          "Advanced analytics",
                        ].map((feature, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <div className="h-2 w-2 bg-purple-400 rounded-full"></div>
                            <span className="text-zinc-300">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-lg font-semibold text-white">Billing Details</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Next billing date</span>
                          <span className="text-white">{usageData.billing.nextBilling}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Payment method</span>
                          <span className="text-white">•••• 4242</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Billing cycle</span>
                          <span className="text-white">Monthly</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <Button className="bg-purple-600 hover:bg-purple-700">Upgrade Plan</Button>
                    <Button variant="outline">Manage Billing</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card className="bg-gray-900/50 border-purple-500/30 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-white">Usage History</CardTitle>
                <CardDescription className="text-zinc-400">
                  Historical data usage across different time periods
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { period: "January 2025", requests: 18650, data: 2.4, cost: 49.99 },
                    { period: "December 2024", requests: 15230, data: 1.9, cost: 49.99 },
                    { period: "November 2024", requests: 12890, data: 1.6, cost: 49.99 },
                    { period: "October 2024", requests: 11450, data: 1.4, cost: 49.99 },
                  ].map((month, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg border border-purple-500/20"
                    >
                      <div>
                        <p className="text-white font-medium">{month.period}</p>
                        <p className="text-sm text-zinc-400">
                          {month.requests.toLocaleString()} requests • {month.data} GB processed
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-bold">${month.cost}</p>
                        <Button variant="ghost" size="sm" className="text-purple-400 hover:text-purple-300">
                          <Download className="h-4 w-4 mr-1" />
                          Export
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer */}
      <footer className="border-t border-purple-500/20 bg-gray-900/50 backdrop-blur-xl mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-zinc-400">© 2025 LEVANT AI. Built for cybersecurity professionals.</p>
        </div>
      </footer>
    </div>
  )
}
