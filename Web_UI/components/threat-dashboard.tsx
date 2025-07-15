"use client"

import type React from "react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import {
  AlertTriangle,
  Activity,
  Eye,
  RefreshCw,
} from "lucide-react"

function ThreatDashboard() {
  const router = useRouter();
  const [showIPs, setShowIPs] = useState(true);
  const [showTopMisuseIPs, setShowTopMisuseIPs] = useState(true);
  const [lastUpdated, setLastUpdated] = useState("");
  const [alertCount, setAlertCount] = useState<number | null>(null);
  const [reportCount, setReportCount] = useState<number | null>(null);
  const [prevAlertCount, setPrevAlertCount] = useState<number | null>(null);
  const [prevReportCount, setPrevReportCount] = useState<number | null>(null);
  const [flowCount, setFlowCount] = useState<number | null>(null);
  const [prevFlowCount, setPrevFlowCount] = useState<number | null>(null);

  function formatTime(date: Date) {
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${ampm}`;
  }

  useEffect(() => {
    handleRefresh();
  }, []);

  const handleRefresh = () => {
    setLastUpdated(formatTime(new Date()));

    fetch("/api/alerts")
      .then(res => res.json())
      .then(data => {
        const count = Array.isArray(data.alerts) ? data.alerts.length : 0;
        setPrevAlertCount(alertCount);
        setAlertCount(count);
      })
      .catch(() => setAlertCount(null));

    fetch("/api/reports")
      .then(res => res.json())
      .then(data => {
        let count = 0;
        if (data.reports) {
          // Handle categorized reports structure
          if (data.reports.shared && Array.isArray(data.reports.shared)) {
            count += data.reports.shared.length;
          }
          if (data.reports.user && Array.isArray(data.reports.user)) {
            count += data.reports.user.length;
          }
          if (data.reports.admin && Array.isArray(data.reports.admin)) {
            count += data.reports.admin.length;
          }
        }
        setPrevReportCount(reportCount);
        setReportCount(count);
      })
      .catch(() => setReportCount(null));

    fetch("/api/network/stats")
      .then(res => res.json())
      .then(data => {
        setPrevFlowCount(flowCount);
        setFlowCount(typeof data.total_flows === "number" ? data.total_flows : 0);
      })
      .catch(() => setFlowCount(null));
  };

  const getTrend = (current: number | null, previous: number | null) => {
    if (current === null || previous === null) return "0";
    const diff = current - previous;
    return diff === 0 ? "0" : `${diff >= 0 ? "+" : ""}${diff}`;
  };

  const getTrendDirection = (current: number | null, previous: number | null) => {
    if (current === null || previous === null) return "down";
    return current > previous ? "up" : "down";
  };

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
        <div className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 mb-4 mt-2">
          <span className="text-xs sm:text-sm text-zinc-300">Last updated: {lastUpdated}</span>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        <Tabs defaultValue="overview" className="w-full h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-1 bg-zinc-900 rounded-none border-b border-zinc-800 flex-shrink-0">
            <TabsTrigger value="overview" className="data-[state=active]:bg-purple-600 text-sm sm:text-base">
              Overview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="p-2 sm:p-4 m-0 flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4 mb-4">
              <MetricCard
                title="Total Network Flows (Last 24h)"
                value={flowCount !== null ? flowCount.toLocaleString() : "—"}
                trend={getTrend(flowCount, prevFlowCount)}
                trendDirection={getTrendDirection(flowCount, prevFlowCount)}
                icon={<Activity className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />} // Changed icon and color
                priority="high"
                onClick={() => router.push("/visualization/network")}
                clickable
              />
              <MetricCard
                title="Reports"
                value={reportCount !== null ? reportCount.toString() : "—"}
                trend={getTrend(reportCount, prevReportCount)}
                trendDirection={getTrendDirection(reportCount, prevReportCount)}
                icon={<Eye className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />}
                priority="high"
                onClick={() => router.push("/reports")}
                clickable
              />
              <MetricCard
                title="Alerts"
                value={alertCount !== null ? alertCount.toString() : "—"}
                trend={getTrend(alertCount, prevAlertCount)}
                trendDirection={getTrendDirection(alertCount, prevAlertCount)}
                icon={<Activity className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />}
                priority="medium"
                onClick={() => router.push("/alerts")}
                clickable
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div
                className="rounded-lg border border-zinc-800 bg-zinc-900 p-1 sm:p-2 cursor-pointer transition-all duration-200 hover:bg-zinc-800 min-h-[140px] flex flex-col shadow-md hover:shadow-xl hover:-translate-y-1"
                onClick={() => setShowIPs(!showIPs)}
                tabIndex={0}
                role="button"
                aria-pressed={!showIPs}
              >
                <ThreatTable
                  title={<span className="text-base font-semibold text-white">{showIPs ? "Recent Malicious IPs" : "Recent Malicious Domains"}</span>}
                  data={showIPs ? [
                    { id: 1, ip: "185.143.223.12", country: "RU", confidence: "High", timestamp: "10:42:15" },
                    { id: 2, ip: "103.35.74.74", country: "CN", confidence: "Medium", timestamp: "09:37:22" },
                    { id: 3, ip: "91.243.85.45", country: "UA", confidence: "High", timestamp: "08:15:03" },
                    { id: 4, ip: "45.227.255.206", country: "BR", confidence: "Medium", timestamp: "07:52:41" },
                  ] : [
                    { id: 1, ip: "malicious-site.com", country: "US", confidence: "High", timestamp: "10:15:33" },
                    { id: 2, ip: "download-free-stuff.net", country: "NL", confidence: "Medium", timestamp: "09:22:17" },
                    { id: 3, ip: "crypto-mining-pool.io", country: "RU", confidence: "High", timestamp: "08:45:09" },
                    { id: 4, ip: "fake-login-portal.com", country: "CN", confidence: "High", timestamp: "07:30:55" },
                  ]}
                />
              </div>

              <div
                className="rounded-lg border border-zinc-800 bg-zinc-900 p-1 sm:p-2 cursor-pointer transition-all duration-200 hover:bg-zinc-800 min-h-[140px] flex flex-col shadow-md hover:shadow-xl hover:-translate-y-1"
                onClick={() => setShowTopMisuseIPs(!showTopMisuseIPs)}
                tabIndex={0}
                role="button"
                aria-pressed={!showTopMisuseIPs}
              >
                <ThreatTable
                  title={<span className="text-base font-semibold text-white">{showTopMisuseIPs ? "Top Malicious IPs" : "Top Malicious Domains"}</span>}
                  data={showTopMisuseIPs ? [
                    { id: 1, ip: "203.0.113.1", country: "US", confidence: "Critical", timestamp: "11:22:33" },
                    { id: 2, ip: "198.51.100.2", country: "DE", confidence: "High", timestamp: "10:15:44" },
                    { id: 3, ip: "192.0.2.3", country: "FR", confidence: "Medium", timestamp: "09:55:12" },
                    { id: 4, ip: "203.0.113.4", country: "JP", confidence: "Low", timestamp: "08:40:27" },
                  ] : [
                    { id: 1, ip: "bad-domain.com", country: "RU", confidence: "Critical", timestamp: "11:10:10" },
                    { id: 2, ip: "phishing-site.net", country: "CN", confidence: "High", timestamp: "10:50:20" },
                    { id: 3, ip: "malware-download.org", country: "BR", confidence: "Medium", timestamp: "09:30:45" },
                    { id: 4, ip: "fakebank-login.com", country: "IN", confidence: "Low", timestamp: "08:20:55" },
                  ]}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  trend: string;
  trendDirection: "up" | "down";
  icon: React.ReactNode;
  priority?: "high" | "medium" | "low";
  className?: string;
  onClick?: () => void;
  clickable?: boolean;
}

function MetricCard({ title, value, trend, trendDirection, icon, priority = "medium", className = "", onClick, clickable }: MetricCardProps) {
  return (
    <div
      className={`rounded-lg border border-zinc-800 bg-zinc-900 p-2 sm:p-4 ${className} ${clickable ? 'cursor-pointer hover:bg-zinc-800 transition-all duration-200 shadow-md hover:shadow-xl hover:-translate-y-1' : 'shadow-md'}`}
      onClick={clickable ? onClick : undefined}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-xs sm:text-sm font-medium text-zinc-400 truncate pr-1">{title}</h3>
        {icon}
      </div>
      <div className="mt-1 sm:mt-2 flex items-baseline">
        <p className="text-lg sm:text-2xl font-semibold text-white">{value}</p>
        <span className={`ml-1 sm:ml-2 text-xs font-medium ${trendDirection === "up" ? "text-green-500" : "text-yellow-500"}`}>
          {trend}
        </span>
      </div>
    </div>
  );
}

function ConfidenceBadge({ confidence }: { confidence: string }) {
  let color = "bg-gray-500";
  if (confidence === "High" || confidence === "Critical") color = "bg-red-500";
  else if (confidence === "Medium") color = "bg-yellow-500";
  else if (confidence === "Low") color = "bg-green-500";
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs text-white font-semibold ${color}`}>{confidence}</span>
  );
}

function ThreatTable({ title, data }: { title: React.ReactNode, data: any[] }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        {title}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs sm:text-sm rounded-lg overflow-hidden">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="pb-1 sm:pb-2 text-left font-medium text-zinc-400">IP/Domain</th>
              <th className="pb-1 sm:pb-2 text-left font-medium text-zinc-400 hidden sm:table-cell">Origin</th>
              <th className="pb-1 sm:pb-2 text-left font-medium text-zinc-400">Confidence</th>
              <th className="pb-1 sm:pb-2 text-right font-medium text-zinc-400 hidden md:table-cell">Time</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, i) => (
              <tr key={item.id} className={i % 2 === 0 ? "bg-zinc-900" : "bg-zinc-800"}>
                <td className="py-1 sm:py-2 text-left font-medium text-white">
                  <div className="truncate max-w-[100px] sm:max-w-[150px]" title={item.ip}>
                    {item.ip}
                  </div>
                </td>
                <td className="py-1 sm:py-2 text-left text-zinc-300 hidden sm:table-cell">{item.country}</td>
                <td className="py-1 sm:py-2 text-left">
                  <ConfidenceBadge confidence={item.confidence} />
                </td>
                <td className="py-1 sm:py-2 text-right text-zinc-400 hidden md:table-cell text-xs">{item.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ThreatDashboard;
