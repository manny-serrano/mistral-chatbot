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

interface Alert {
  type: string
  ip: string
  date: string
  unique_ports: number
  pcr: number
  por: number
  p_value: number
  severity: "critical" | "high" | "medium" | "low"
  message: string
}

interface ProcessedIPData {
  id: number
  ip: string
  country: string
  confidence: string
  timestamp: string
  threatCount: number
  lastSeen: string
}

interface ProcessedDomainData {
  id: number
  ip: string // domain name or IP-derived domain
  country: string
  confidence: string
  timestamp: string
  threatCount: number
  lastSeen: string
  sourceIp: string // original IP this domain is associated with
}

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
  
  // Real-time data state - connected to /api/alerts and /api/geolocation
  // Recent/Top IPs: Shows actual suspicious IPs from alerts with geolocation data
  // Recent/Top Domains: Shows only real domains extracted from IP geolocation data (no fake domains)
  const [recentIPs, setRecentIPs] = useState<ProcessedIPData[]>([]);
  const [topIPs, setTopIPs] = useState<ProcessedIPData[]>([]);
  const [loadingIPData, setLoadingIPData] = useState(false);

  // Real domain data state - only legitimate domains from geolocation API
  const [recentDomains, setRecentDomains] = useState<ProcessedDomainData[]>([]);
  const [topDomains, setTopDomains] = useState<ProcessedDomainData[]>([]);

  function formatTime(date: Date) {
    // Check if date is valid
    if (!date || isNaN(date.getTime())) {
      return "N/A";
    }
    
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${ampm}`;
  }

  // Function to get geolocation data for IPs
  const getGeolocationsForIPs = async (ips: string[]) => {
    try {
      const response = await fetch('/api/geolocation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ips })
      })

      if (!response.ok) {
        throw new Error(`Geolocation API error: ${response.status}`)
      }

      const data = await response.json()
      return data.results || []
    } catch (error) {
      console.error('Error fetching geolocations:', error)
      return []
    }
  }

  // Function to process alerts and get IP data
  const processAlertsData = async () => {
    setLoadingIPData(true);
    try {
      // Fetch alerts
      const response = await fetch('/api/alerts');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      const alerts: Alert[] = result.alerts || [];

      console.log('Received alerts count:', alerts.length); // Debug log
      if (alerts.length > 0) {
        console.log('Sample alert:', alerts[0]); // Debug log
        console.log('Sample alert date:', alerts[0].date); // Debug log
      }

      // Group alerts by IP
      const ipGroups: Record<string, {
        alerts: Alert[]
        maxSeverity: "critical" | "high" | "medium" | "low"
        totalThreats: number
        lastSeen: string
      }> = {};

      alerts.forEach((alert: Alert) => {
        if (!ipGroups[alert.ip]) {
          ipGroups[alert.ip] = {
            alerts: [],
            maxSeverity: "low",
            totalThreats: 0,
            lastSeen: alert.date
          };
        }
        
        ipGroups[alert.ip].alerts.push(alert);
        ipGroups[alert.ip].totalThreats += 1;
        
        // Update max severity
        const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
        if (severityOrder[alert.severity] > severityOrder[ipGroups[alert.ip].maxSeverity]) {
          ipGroups[alert.ip].maxSeverity = alert.severity;
        }

        // Update last seen
        if (alert.date > ipGroups[alert.ip].lastSeen) {
          ipGroups[alert.ip].lastSeen = alert.date;
        }
      });

      // Get unique IPs and fetch geolocation data
      const uniqueIPs = Object.keys(ipGroups);
      const geolocations = await getGeolocationsForIPs(uniqueIPs);
      
      // Create IP to geolocation mapping
      const geoMap = new Map();
      geolocations.forEach((geo: any) => {
        geoMap.set(geo.ip, geo);
      });

      // Process the data for dashboard display
      const processedData: ProcessedIPData[] = Object.entries(ipGroups).map(([ip, group], index) => {
        const geoData = geoMap.get(ip) || {
          country: 'Unknown',
          city: 'Unknown'
        };

        // Convert severity to confidence
        const getConfidence = (severity: string) => {
          switch (severity) {
            case "critical": return "Critical";
            case "high": return "High";
            case "medium": return "Medium";
            case "low": return "Low";
            default: return "Medium";
          }
        };

        // Format timestamp
        const formatTimestamp = (dateStr: string) => {
          try {
            // Validate that dateStr is not empty or null
            if (!dateStr || dateStr.trim() === '') {
              console.warn('Empty date string for formatting:', dateStr);
              return "Just now";
            }
            
            console.log('Formatting date string:', dateStr); // Debug log
            
            // Try multiple date parsing approaches
            let date: Date;
            
            // Try parsing as-is first
            date = new Date(dateStr);
            
            // If that fails, try treating it as a timestamp
            if (isNaN(date.getTime())) {
              const timestamp = parseInt(dateStr);
              if (!isNaN(timestamp)) {
                date = new Date(timestamp);
              }
            }
            
            // Check if the date is valid
            if (isNaN(date.getTime())) {
              console.warn('Invalid date created from:', dateStr);
              return "Unknown";
            }
            
            // Check if date is too far in the past or future (sanity check)
            const now = new Date();
            const timeDiff = Math.abs(now.getTime() - date.getTime());
            const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
            
            if (daysDiff > 365) {
              console.warn('Date seems too old or too far in future:', dateStr, date);
              return "Old";
            }
            
            const formattedTime = formatTime(date);
            console.log('Formatted time result:', formattedTime); // Debug log
            return formattedTime;
          } catch (error) {
            console.warn('Invalid date format:', dateStr, error);
            return "Error";
          }
        };

        return {
          id: index + 1,
          ip: ip,
          country: geoData.country_code || geoData.country || 'UN',
          confidence: getConfidence(group.maxSeverity),
          timestamp: formatTimestamp(group.lastSeen),
          threatCount: group.totalThreats,
          lastSeen: group.lastSeen
        };
      }).filter(item => {
        // Filter out private IPs for display
        return !item.ip.startsWith('192.168.') && 
               !item.ip.startsWith('10.') && 
               !/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(item.ip) &&
               !item.ip.startsWith('127.');
      });

      // Sort for recent IPs (by last seen, most recent first)
      const recentIPsData = [...processedData]
        .sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime())
        .slice(0, 4);

      // Sort for top IPs (by threat score: severity + threat count combined)
      const topIPsData = [...processedData]
        .filter(item => item.confidence !== 'Low') // Only include Critical, High, Medium threats
        .sort((a, b) => {
          // Calculate threat score: severity weight + threat count
          const getSeverityWeight = (severity: string) => {
            switch (severity) {
              case "Critical": return 1000;
              case "High": return 100;
              case "Medium": return 10;
              case "Low": return 1;
              default: return 1;
            }
          };
          
          const scoreA = getSeverityWeight(a.confidence) + a.threatCount;
          const scoreB = getSeverityWeight(b.confidence) + b.threatCount;
          
          // If scores are equal, sort by threat count
          if (scoreB === scoreA) {
            return b.threatCount - a.threatCount;
          }
          
          return scoreB - scoreA;
        })
        .slice(0, 4);

      setRecentIPs(recentIPsData);
      setTopIPs(topIPsData);

      // Generate domain data from the processed IP data
      const allDomainData = generateDomainData(processedData, geoMap);
      
      // Sort for recent domains (by last seen, most recent first)
      const recentDomainsData = [...allDomainData]
        .sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime())
        .slice(0, 4);

      // Sort for top domains (by threat score: severity + threat count combined)
      const topDomainsData = [...allDomainData]
        .filter(item => item.confidence !== 'Low') // Only include Critical, High, Medium threats
        .sort((a, b) => {
          // Calculate threat score: severity weight + threat count
          const getSeverityWeight = (severity: string) => {
            switch (severity) {
              case "Critical": return 1000;
              case "High": return 100;
              case "Medium": return 10;
              case "Low": return 1;
              default: return 1;
            }
          };
          
          const scoreA = getSeverityWeight(a.confidence) + a.threatCount;
          const scoreB = getSeverityWeight(b.confidence) + b.threatCount;
          
          // If scores are equal, sort by threat count
          if (scoreB === scoreA) {
            return b.threatCount - a.threatCount;
          }
          
          return scoreB - scoreA;
        })
        .slice(0, 4);

      setRecentDomains(recentDomainsData);
      setTopDomains(topDomainsData);

    } catch (error) {
      console.error('Error processing alerts data:', error);
      // Fallback to empty arrays
      setRecentIPs([]);
      setTopIPs([]);
      setRecentDomains([]);
      setTopDomains([]);
    } finally {
      setLoadingIPData(false);
    }
  };

  // Function to extract real domain data from IP data and geolocation
  const generateDomainData = (ipData: ProcessedIPData[], geoMap: Map<string, any>): ProcessedDomainData[] => {
    const domainData: ProcessedDomainData[] = [];
    let domainId = 1;

    ipData.forEach((ipItem) => {
      const geoData = geoMap.get(ipItem.ip);
      
      // Only use real domain data from geolocation API
      let domainName = geoData?.connection?.domain;
      
      // Skip this entry if no real domain is available
      if (!domainName || domainName === 'N/A' || domainName === 'Unknown' || domainName.trim() === '') {
        return; // Skip - no real domain data available
      }

      // Additional validation to ensure domain looks legitimate
      // Check if domain has proper format (contains . and doesn't look generated)
      if (!domainName.includes('.') || 
          domainName.includes('fake') || 
          domainName.includes('unknown') ||
          domainName.includes('localhost') ||
          domainName.includes('example') ||
          domainName.includes('test') ||
          domainName.toLowerCase().includes('host') ||
          domainName.match(/^\d+\.\d+\.\d+\.\d+/) || // IP address format
          domainName.length < 4 || // Too short
          domainName.startsWith('.') || 
          domainName.endsWith('.')) {
        return; // Skip invalid or fake-looking domains
      }

      // Create domain entry only for real domains
      domainData.push({
        id: domainId++,
        ip: domainName,
        country: ipItem.country,
        confidence: ipItem.confidence,
        timestamp: ipItem.timestamp,
        threatCount: ipItem.threatCount,
        lastSeen: ipItem.lastSeen,
        sourceIp: ipItem.ip
      });
    });

    return domainData;
  };

  useEffect(() => {
    handleRefresh();
  }, []);

  const handleRefresh = () => {
    const currentTime = new Date();
    const formattedTime = formatTime(currentTime);
    setLastUpdated(formattedTime);

    // Fetch dashboard metrics
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

    // Fetch and process IP data
    processAlertsData();
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
          <span className="text-xs sm:text-sm text-zinc-300">
            Last updated: {lastUpdated} {loadingIPData && "(Loading IP data...)"}
          </span>
          <button
            onClick={handleRefresh}
            disabled={loadingIPData}
            className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-600 text-zinc-200 text-xs font-medium transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loadingIPData ? 'animate-spin' : ''}`} /> Refresh
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
                icon={<Activity className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />}
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
                  data={showIPs ? recentIPs : recentDomains}
                  loading={loadingIPData}
                  isDomainTable={!showIPs}
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
                  title={<span className="text-base font-semibold text-white">{showTopMisuseIPs ? "Top Critical Threats (IPs)" : "Top Critical Threats (Domains)"}</span>}
                  data={showTopMisuseIPs ? topIPs : topDomains}
                  loading={loadingIPData}
                  isDomainTable={!showTopMisuseIPs}
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

function ThreatTable({ title, data, loading, isDomainTable = false }: { title: React.ReactNode, data: any[], loading: boolean, isDomainTable?: boolean }) {
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
              <th className="pb-1 sm:pb-2 text-right font-medium text-zinc-400">Time</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="py-4 text-center text-zinc-500">Loading data...</td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-4 text-center text-zinc-500">No data available.</td>
              </tr>
            ) : (
              data.map((item, i) => (
                <tr key={item.id} className={i % 2 === 0 ? "bg-zinc-900" : "bg-zinc-800"}>
                  <td className="py-1 sm:py-2 text-left font-medium text-white">
                    <div 
                      className="truncate max-w-[100px] sm:max-w-[150px]" 
                      title={item.sourceIp ? `${item.ip} (Source IP: ${item.sourceIp})` : item.ip}
                    >
                      {item.ip}
                    </div>
                    {item.sourceIp && (
                      <div className="text-xs text-zinc-500 truncate max-w-[100px] sm:max-w-[150px]">
                        from {item.sourceIp}
                      </div>
                    )}
                  </td>
                  <td className="py-1 sm:py-2 text-left text-zinc-300 hidden sm:table-cell">{item.country}</td>
                  <td className="py-1 sm:py-2 text-left">
                    <ConfidenceBadge confidence={item.confidence} />
                  </td>
                  <td className="py-1 sm:py-2 text-right text-zinc-400 text-xs sm:text-sm">{item.timestamp}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ThreatDashboard;
