import { NextRequest, NextResponse } from 'next/server'
import neo4j from 'neo4j-driver'

// Logistic regression function for threat detection
function logistic_regression(num_ports: number, pcr: number, por: number, coef_ports: number, coef_pcr: number, coef_por: number, intercept: number) {
  const z = (coef_ports * num_ports) + (coef_pcr * pcr) + (coef_por * por) + intercept;
  return 1 / (1 + Math.exp(-z));
}

// Helper function to convert bytes to appropriate units and return in MB
function formatBytesToMB(bytes: number): number {
  // Convert bytes to megabytes (MB) for consistency
  // 1 MB = 1,048,576 bytes (1024^2)
  return Math.round((bytes / (1024 * 1024)) * 100) / 100; // Round to 2 decimal places
}

// Helper function to parse string timestamps from database
function parseFlowTimestamp(timestampStr: string): number | null {
  if (!timestampStr || typeof timestampStr !== 'string') return null;
  
  try {
    // Handle format like "2024-05-31 08:04:03.647"
    const date = new Date(timestampStr);
    if (isNaN(date.getTime())) return null;
    return date.getTime();
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  let driver, session;
  try {
    const { searchParams } = new URL(request.url)
    const metric = searchParams.get('metric') || 'alerts'
    const period = searchParams.get('period') || '24h'
    const granularity = searchParams.get('granularity') || '1h'
    
    driver = neo4j.driver(
      'bolt://localhost:7687',
      neo4j.auth.basic('neo4j', 'password123')
    );
    session = driver.session();

    // Get the actual data range from the database (timestamps are strings)
    const dataRangeResult = await session.run(`
      MATCH (f:Flow)
      WHERE f.flowStartMilliseconds IS NOT NULL
      RETURN min(f.flowStartMilliseconds) as minTimeStr, max(f.flowStartMilliseconds) as maxTimeStr, count(f) as totalFlows
    `);
    
    const minTimeStr = dataRangeResult.records[0]?.get('minTimeStr');
    const maxTimeStr = dataRangeResult.records[0]?.get('maxTimeStr');
    const totalFlows = dataRangeResult.records[0]?.get('totalFlows').toNumber() || 0;
    
    // Return debug information early
    if (metric === 'debug') {
      return NextResponse.json({
        debug: {
          minTimeStr,
          maxTimeStr,
          totalFlows,
          parsedMinTime: parseFlowTimestamp(minTimeStr),
          parsedMaxTime: parseFlowTimestamp(maxTimeStr),
          testDate: new Date("2024-05-31 08:04:03.647").getTime(),
          testISODate: new Date("2024-05-31 08:04:03.647").toISOString()
        }
      });
    }
    
    if (!minTimeStr || !maxTimeStr || totalFlows === 0) {
      // No data available, return fallback
      return NextResponse.json({
        data: [],
        metric,
        period,
        granularity,
        total_points: 0,
        success: true,
        timestamp: new Date().toISOString(),
        note: "No flow data found in database"
      });
    }

    // Parse the min/max timestamps
    const minTime = parseFlowTimestamp(minTimeStr);
    const maxTime = parseFlowTimestamp(maxTimeStr);
    
    if (!minTime || !maxTime) {
      return NextResponse.json({
        data: [],
        metric,
        period,
        granularity,
        total_points: 0,
        success: false,
        timestamp: new Date().toISOString(),
        error: "Could not parse timestamp format",
        debug: { minTimeStr, maxTimeStr, minTime, maxTime }
      });
    }

    // Calculate time range based on the actual data and requested period
    let startTime = minTime;
    let endTime = maxTime;
    
    if (period === '24h') {
      // Use the last 24 hours of available data
      startTime = Math.max(minTime, maxTime - (24 * 60 * 60 * 1000));
    } else if (period === '7d') {
      // Use the last 7 days of available data
      startTime = Math.max(minTime, maxTime - (7 * 24 * 60 * 60 * 1000));
    } else if (period === '30d') {
      // Use all available data (since our data span is less than 30 days)
      startTime = minTime;
      endTime = maxTime;
    }

    let data = [];

    if (metric === 'flows') {
      // Network flows over time - simplified query first
      const result = await session.run(`
        MATCH (f:Flow)
        WHERE f.flowStartMilliseconds IS NOT NULL
          AND (f.malicious IS NULL OR f.malicious = false) 
          AND (f.honeypot IS NULL OR f.honeypot = false)
        RETURN f.flowStartMilliseconds AS flow_start
        LIMIT 100
      `);

      // Group flows by time intervals
      const timeGroups: Record<string, number> = {};
      let processedCount = 0;
      let timeRangeCount = 0;
      
      for (const record of result.records) {
        processedCount++;
        const flow_start_str = record.get('flow_start');
        const flow_start_time = parseFlowTimestamp(flow_start_str);
        
        if (!flow_start_time) continue;
        if (flow_start_time < startTime || flow_start_time > endTime) continue;
        timeRangeCount++;
        
        const flowDate = new Date(flow_start_time);
        if (isNaN(flowDate.getTime())) continue;
        
        let timeKey = '';
        if (granularity === '30m') {
          const minutes = Math.floor(flowDate.getMinutes() / 30) * 30;
          timeKey = new Date(flowDate.getFullYear(), flowDate.getMonth(), flowDate.getDate(), flowDate.getHours(), minutes).toISOString();
        } else if (granularity === '1h') {
          timeKey = new Date(flowDate.getFullYear(), flowDate.getMonth(), flowDate.getDate(), flowDate.getHours()).toISOString();
        } else if (granularity === '6h') {
          const hours = Math.floor(flowDate.getHours() / 6) * 6;
          timeKey = new Date(flowDate.getFullYear(), flowDate.getMonth(), flowDate.getDate(), hours).toISOString();
        } else if (granularity === '1d') {
          timeKey = new Date(flowDate.getFullYear(), flowDate.getMonth(), flowDate.getDate()).toISOString();
        }
        
        if (timeKey) {
          timeGroups[timeKey] = (timeGroups[timeKey] || 0) + 1;
        }
      }

      data = Object.entries(timeGroups).map(([timestamp, value]) => ({
        timestamp,
        value,
        metric: 'flows'
      })).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      return NextResponse.json({
        data,
        metric,
        period,
        granularity,
        total_points: data.length,
        success: true,
        timestamp: new Date().toISOString(),
        debug: {
          minTimeStr,
          maxTimeStr,
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
          processedCount,
          timeRangeCount,
          timeGroupsCount: Object.keys(timeGroups).length
        }
      });
    }

    // Continue with original alert logic for other metrics...
    if (metric === 'alerts') {
      // Generate security alerts using the same logic as the alerts API
      const result = await session.run(`
        MATCH (src:Host)-[:SENT]->(f:Flow)-[:USES_DST_PORT]->(dst_port:Port)
        WHERE f.flowStartMilliseconds IS NOT NULL
          AND (f.malicious IS NULL OR f.malicious = false) 
          AND (f.honeypot IS NULL OR f.honeypot = false)
        RETURN src.ip AS src_ip, f.destinationIPv4Address AS dst_ip, f.flowStartMilliseconds AS flow_start, dst_port.port AS dst_port,
               f.protocolIdentifier AS protocol, f.packetTotalCount AS packets, f.reversePacketTotalCount AS reverse_packets,
               f.octetTotalCount AS bytes, f.reverseOctetTotalCount AS reverse_bytes
      `);

      // Process flows to generate alerts
      const unique_ports: Record<string, any> = {};
      for (const record of result.records) {
        const src_ip = record.get('src_ip');
        const dst_ip = record.get('dst_ip');
        const dst_port_raw = record.get('dst_port');
        const dst_port = Number(dst_port_raw);
        const bytes = record.get('bytes') || 0;
        const reverse_bytes = record.get('reverse_bytes') || 0;
        const packets = record.get('packets') || 0;
        const flow_start_str = record.get('flow_start');
        
        // Parse the string timestamp
        const flow_start_time = parseFlowTimestamp(flow_start_str);
        if (!flow_start_time) continue;
        
        // Filter by time range
        if (flow_start_time < startTime || flow_start_time > endTime) continue;
        
        // Use hour for grouping (adjust based on granularity later)
        const date = new Date(flow_start_time);
        const dateKey = date.toISOString().slice(0, 10); // YYYY-MM-DD
        const key = `${src_ip}_${dateKey}`;

        if (!unique_ports[key]) {
          unique_ports[key] = {
            src_ip,
            date: dateKey,
            flow_start_time: flow_start_time,
            dest_port_string: new Set(),
            dest_ip_string: new Set(),
            bytes: 0,
            reverse_bytes: 0,
            packets: 0,
            pcr: 0,
            por: 0,
            p_value: 0
          };
        }
        
        unique_ports[key].dest_port_string.add(dst_port);
        unique_ports[key].dest_ip_string.add(String(dst_ip));
        unique_ports[key].bytes += Number(bytes);
        unique_ports[key].reverse_bytes += Number(reverse_bytes);
        unique_ports[key].packets += Number(packets);
        
        if (unique_ports[key].reverse_bytes !== 0) {
          unique_ports[key].pcr = unique_ports[key].bytes / unique_ports[key].reverse_bytes;
        }
        if (unique_ports[key].bytes !== 0) {
          unique_ports[key].por = unique_ports[key].packets / unique_ports[key].bytes;
        }
        unique_ports[key].num_ports = unique_ports[key].dest_port_string.size;
        unique_ports[key].p_value = logistic_regression(
          unique_ports[key].num_ports,
          unique_ports[key].pcr,
          unique_ports[key].por,
          0.00243691,
          0.00014983,
          0.00014983,
          -3.93433105
        );
      }

      // Generate alerts and group by time intervals
      const alerts = Object.values(unique_ports).map((entry: any) => {
        let severity = 'low';
        if (entry.p_value >= 0.8) severity = 'critical';
        else if (entry.p_value >= 0.6) severity = 'high';
        else if (entry.p_value >= 0.4) severity = 'medium';
        else if (entry.p_value >= 0.1) severity = 'low';
        else return null; // Filter out alerts with p_value < 0.1
        
        return {
          src_ip: entry.src_ip,
          date: entry.date,
          flow_start_time: entry.flow_start_time,
          severity,
          p_value: entry.p_value,
          unique_ports: entry.num_ports
        };
      }).filter(alert => alert !== null);

      // Group alerts by time intervals based on granularity
      const timeGroups: Record<string, number> = {};
      
      alerts.forEach((alert: any) => {
        if (!alert.flow_start_time) return;
        
        const alertDate = new Date(alert.flow_start_time);
        if (isNaN(alertDate.getTime())) return;
        
        let timeKey = '';
        if (granularity === '30m') {
          const minutes = Math.floor(alertDate.getMinutes() / 30) * 30;
          timeKey = new Date(alertDate.getFullYear(), alertDate.getMonth(), alertDate.getDate(), alertDate.getHours(), minutes).toISOString();
        } else if (granularity === '1h') {
          timeKey = new Date(alertDate.getFullYear(), alertDate.getMonth(), alertDate.getDate(), alertDate.getHours()).toISOString();
        } else if (granularity === '6h') {
          const hours = Math.floor(alertDate.getHours() / 6) * 6;
          timeKey = new Date(alertDate.getFullYear(), alertDate.getMonth(), alertDate.getDate(), hours).toISOString();
        } else if (granularity === '1d') {
          timeKey = new Date(alertDate.getFullYear(), alertDate.getMonth(), alertDate.getDate()).toISOString();
        }
        
        if (timeKey) {
          timeGroups[timeKey] = (timeGroups[timeKey] || 0) + 1;
        }
      });

      // Convert to array format for chart
      data = Object.entries(timeGroups).map(([timestamp, value]) => ({
        timestamp,
        value,
        metric: 'alerts'
      })).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    } else if (metric === 'threats') {
      // Similar logic for threats, but filter for high-severity only
      const result = await session.run(`
        MATCH (src:Host)-[:SENT]->(f:Flow)-[:USES_DST_PORT]->(dst_port:Port)
        WHERE f.flowStartMilliseconds IS NOT NULL
          AND (f.malicious IS NULL OR f.malicious = false) 
          AND (f.honeypot IS NULL OR f.honeypot = false)
        RETURN src.ip AS src_ip, f.destinationIPv4Address AS dst_ip, f.flowStartMilliseconds AS flow_start, dst_port.port AS dst_port,
               f.protocolIdentifier AS protocol, f.packetTotalCount AS packets, f.reversePacketTotalCount AS reverse_packets,
               f.octetTotalCount AS bytes, f.reverseOctetTotalCount AS reverse_bytes
      `);

      // Process flows to generate high-severity threats
      const unique_ports: Record<string, any> = {};
      for (const record of result.records) {
        const src_ip = record.get('src_ip');
        const dst_ip = record.get('dst_ip');
        const dst_port_raw = record.get('dst_port');
        const dst_port = Number(dst_port_raw);
        const bytes = record.get('bytes') || 0;
        const reverse_bytes = record.get('reverse_bytes') || 0;
        const packets = record.get('packets') || 0;
        const flow_start_str = record.get('flow_start');
        
        // Parse the string timestamp
        const flow_start_time = parseFlowTimestamp(flow_start_str);
        if (!flow_start_time) continue;
        
        // Filter by time range
        if (flow_start_time < startTime || flow_start_time > endTime) continue;
        
        const date = new Date(flow_start_time);
        const dateKey = date.toISOString().slice(0, 10);
        const key = `${src_ip}_${dateKey}`;

        if (!unique_ports[key]) {
          unique_ports[key] = {
            src_ip,
            date: dateKey,
            flow_start_time: flow_start_time,
            dest_port_string: new Set(),
            dest_ip_string: new Set(),
            bytes: 0,
            reverse_bytes: 0,
            packets: 0,
            pcr: 0,
            por: 0,
            p_value: 0
          };
        }
        
        unique_ports[key].dest_port_string.add(dst_port);
        unique_ports[key].dest_ip_string.add(String(dst_ip));
        unique_ports[key].bytes += Number(bytes);
        unique_ports[key].reverse_bytes += Number(reverse_bytes);
        unique_ports[key].packets += Number(packets);
        
        if (unique_ports[key].reverse_bytes !== 0) {
          unique_ports[key].pcr = unique_ports[key].bytes / unique_ports[key].reverse_bytes;
        }
        if (unique_ports[key].bytes !== 0) {
          unique_ports[key].por = unique_ports[key].packets / unique_ports[key].bytes;
        }
        unique_ports[key].num_ports = unique_ports[key].dest_port_string.size;
        unique_ports[key].p_value = logistic_regression(
          unique_ports[key].num_ports,
          unique_ports[key].pcr,
          unique_ports[key].por,
          0.00243691,
          0.00014983,
          0.00014983,
          -3.93433105
        );
      }

      // Generate high-severity threats only
      const threats = Object.values(unique_ports).filter((entry: any) => {
        return entry.p_value >= 0.6; // High and Critical only
      });

      // Group by time intervals
      const timeGroups: Record<string, number> = {};
      
      threats.forEach((threat: any) => {
        if (!threat.flow_start_time) return;
        
        const threatDate = new Date(threat.flow_start_time);
        if (isNaN(threatDate.getTime())) return;
        
        let timeKey = '';
        if (granularity === '30m') {
          const minutes = Math.floor(threatDate.getMinutes() / 30) * 30;
          timeKey = new Date(threatDate.getFullYear(), threatDate.getMonth(), threatDate.getDate(), threatDate.getHours(), minutes).toISOString();
        } else if (granularity === '1h') {
          timeKey = new Date(threatDate.getFullYear(), threatDate.getMonth(), threatDate.getDate(), threatDate.getHours()).toISOString();
        } else if (granularity === '6h') {
          const hours = Math.floor(threatDate.getHours() / 6) * 6;
          timeKey = new Date(threatDate.getFullYear(), threatDate.getMonth(), threatDate.getDate(), hours).toISOString();
        } else if (granularity === '1d') {
          timeKey = new Date(threatDate.getFullYear(), threatDate.getMonth(), threatDate.getDate()).toISOString();
        }
        
        if (timeKey) {
          timeGroups[timeKey] = (timeGroups[timeKey] || 0) + 1;
        }
      });

      data = Object.entries(timeGroups).map(([timestamp, value]) => ({
        timestamp,
        value,
        metric: 'threats'
      })).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    } else if (metric === 'bandwidth') {
      // Bandwidth usage over time
      const result = await session.run(`
        MATCH (f:Flow)
        WHERE f.flowStartMilliseconds IS NOT NULL
          AND (f.malicious IS NULL OR f.malicious = false) 
          AND (f.honeypot IS NULL OR f.honeypot = false)
        RETURN f.flowStartMilliseconds AS flow_start, 
               coalesce(f.octetTotalCount, 0) as bytes, 
               coalesce(f.reverseOctetTotalCount, 0) as reverseBytes
      `);

      // Group bandwidth by time intervals
      const timeGroups: Record<string, number> = {};
      
      for (const record of result.records) {
        const flow_start_str = record.get('flow_start');
        const flow_start_time = parseFlowTimestamp(flow_start_str);
        const bytes = Number(record.get('bytes') || 0);
        const reverseBytes = Number(record.get('reverseBytes') || 0);
        
        if (!flow_start_time) continue;
        if (flow_start_time < startTime || flow_start_time > endTime) continue;
        
        const flowDate = new Date(flow_start_time);
        if (isNaN(flowDate.getTime())) continue;
        
        let timeKey = '';
        if (granularity === '30m') {
          const minutes = Math.floor(flowDate.getMinutes() / 30) * 30;
          timeKey = new Date(flowDate.getFullYear(), flowDate.getMonth(), flowDate.getDate(), flowDate.getHours(), minutes).toISOString();
        } else if (granularity === '1h') {
          timeKey = new Date(flowDate.getFullYear(), flowDate.getMonth(), flowDate.getDate(), flowDate.getHours()).toISOString();
        } else if (granularity === '6h') {
          const hours = Math.floor(flowDate.getHours() / 6) * 6;
          timeKey = new Date(flowDate.getFullYear(), flowDate.getMonth(), flowDate.getDate(), hours).toISOString();
        } else if (granularity === '1d') {
          timeKey = new Date(flowDate.getFullYear(), flowDate.getMonth(), flowDate.getDate()).toISOString();
        }
        
        if (timeKey) {
          timeGroups[timeKey] = (timeGroups[timeKey] || 0) + formatBytesToMB(bytes + reverseBytes);
        }
      }

      data = Object.entries(timeGroups).map(([timestamp, value]) => ({
        timestamp,
        value,
        metric: 'bandwidth'
      })).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }

    return NextResponse.json({
      data,
      metric,
      period,
      granularity,
      total_points: data.length,
      success: true,
      timestamp: new Date().toISOString(),
      data_range: {
        min_time: new Date(minTime).toISOString(),
        max_time: new Date(maxTime).toISOString(),
        total_flows: totalFlows
      },
      debug: {
        minTimeStr,
        maxTimeStr,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        parsedMinTime: minTime,
        parsedMaxTime: maxTime
      }
    });
  } catch (error) {
    console.error('Error fetching time-series data:', error)
    
    // Return realistic fallback data based on metric
    let fallbackData = [];
    const baseTime = Date.now();
    
    if (metric === 'alerts') {
      fallbackData = [
        { timestamp: new Date(baseTime - 10800000).toISOString(), value: 8, metric: "alerts" },
        { timestamp: new Date(baseTime - 7200000).toISOString(), value: 12, metric: "alerts" },
        { timestamp: new Date(baseTime - 3600000).toISOString(), value: 5, metric: "alerts" },
        { timestamp: new Date(baseTime).toISOString(), value: 15, metric: "alerts" }
      ];
    } else if (metric === 'threats') {
      fallbackData = [
        { timestamp: new Date(baseTime - 10800000).toISOString(), value: 3, metric: "threats" },
        { timestamp: new Date(baseTime - 7200000).toISOString(), value: 6, metric: "threats" },
        { timestamp: new Date(baseTime - 3600000).toISOString(), value: 2, metric: "threats" },
        { timestamp: new Date(baseTime).toISOString(), value: 8, metric: "threats" }
      ];
    } else {
      fallbackData = [
        { timestamp: new Date(baseTime - 10800000).toISOString(), value: 1250, metric: metric || "flows" },
        { timestamp: new Date(baseTime - 7200000).toISOString(), value: 1680, metric: metric || "flows" },
        { timestamp: new Date(baseTime - 3600000).toISOString(), value: 945, metric: metric || "flows" },
        { timestamp: new Date(baseTime).toISOString(), value: 2100, metric: metric || "flows" }
      ];
    }
    
    return NextResponse.json({
      data: fallbackData,
      metric: metric || "alerts",
      period: period || "24h", 
      granularity: granularity || "1h",
      total_points: fallbackData.length,
      success: false,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  } finally {
    if (session) await session.close();
    if (driver) await driver.close();
  }
} 