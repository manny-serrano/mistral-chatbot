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
    const sourceIp = searchParams.get('sourceIp') || null
    const destIp = searchParams.get('destIp') || null
    
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
        sourceIp,
        destIp,
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
        sourceIp,
        destIp,
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

    let data: any[] = [];

    if (metric === 'bandwidth') {
      // Enhanced bandwidth query with IP pair analysis
      const ipFilter = sourceIp && destIp ? 
        `AND f.sourceIPv4Address = $sourceIp AND f.destinationIPv4Address = $destIp` :
        sourceIp ? `AND (f.sourceIPv4Address = $sourceIp OR f.destinationIPv4Address = $sourceIp)` :
        '';
      
      const result = await session.run(`
        MATCH (f:Flow)
        WHERE f.flowStartMilliseconds IS NOT NULL
          AND (f.malicious IS NULL OR f.malicious = false) 
          AND (f.honeypot IS NULL OR f.honeypot = false)
          ${ipFilter}
        RETURN f.flowStartMilliseconds AS flow_start,
               coalesce(f.octetTotalCount, 0) as total_bytes,
               coalesce(f.reverseOctetTotalCount, 0) as reverse_bytes,
               f.sourceIPv4Address as src_ip,
               f.destinationIPv4Address as dst_ip
      `, sourceIp || destIp ? { sourceIp, destIp } : {});

      // Group flows by time intervals
      const timeGroups: Record<string, any> = {};
      
      for (const record of result.records) {
        const flow_start_str = record.get('flow_start');
        const flow_start_time = parseFlowTimestamp(flow_start_str);
        
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
          if (!timeGroups[timeKey]) {
            timeGroups[timeKey] = {
              timestamp: timeKey,
              value: 0,
              metric: 'bandwidth',
              flows: 0,
              sourceIps: new Set(),
              destIps: new Set()
            };
          }
          
          const totalBytes = record.get('total_bytes') + record.get('reverse_bytes');
          timeGroups[timeKey].value += totalBytes;
          timeGroups[timeKey].flows += 1;
          timeGroups[timeKey].sourceIps.add(record.get('src_ip'));
          timeGroups[timeKey].destIps.add(record.get('dst_ip'));
        }
      }

      data = Object.values(timeGroups).map((item: any) => ({
        timestamp: item.timestamp,
        value: item.value,
        metric: item.metric,
        flows: item.flows,
        sourceIps: Array.from(item.sourceIps),
        destIps: Array.from(item.destIps)
      })).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
    } else if (metric === 'bandwidth_with_alerts') {
      // Bandwidth with alert correlation
      const result = await session.run(`
        MATCH (src:Host)-[:SENT]->(f:Flow)-[:USES_DST_PORT]->(dst_port:Port)
        WHERE f.flowStartMilliseconds IS NOT NULL
          AND (f.malicious IS NULL OR f.malicious = false) 
          AND (f.honeypot IS NULL OR f.honeypot = false)
        RETURN f.flowStartMilliseconds AS flow_start,
               coalesce(f.octetTotalCount, 0) + coalesce(f.reverseOctetTotalCount, 0) as bandwidth,
               src.ip as src_ip,
               dst_port.port as dst_port,
               f.destinationIPv4Address as dst_ip,
               coalesce(f.packetTotalCount, 0) as packets,
               coalesce(f.reversePacketTotalCount, 0) as reverse_packets
      `);
      
      // Process results and calculate alert probabilities
      const timeGroups: Record<string, any> = {};
      
      for (const record of result.records) {
        const flow_start_str = record.get('flow_start');
        const flow_start_time = parseFlowTimestamp(flow_start_str);
        
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
          if (!timeGroups[timeKey]) {
            timeGroups[timeKey] = {
              timestamp: timeKey,
              value: 0,
              metric: 'bandwidth_with_alerts',
              flows: 0,
              alert_probability: 0,
              unique_ports: new Set(),
              unique_ips: new Set(),
              total_packets: 0,
              total_reverse_packets: 0
            };
          }
          
          timeGroups[timeKey].value += record.get('bandwidth');
          timeGroups[timeKey].flows += 1;
          timeGroups[timeKey].total_packets += record.get('packets');
          timeGroups[timeKey].total_reverse_packets += record.get('reverse_packets');
          timeGroups[timeKey].unique_ports.add(record.get('dst_port'));
          timeGroups[timeKey].unique_ips.add(record.get('dst_ip'));
        }
      }
      
      // Calculate alert probabilities for each time period
      data = Object.values(timeGroups).map((item: any) => {
        const num_ports = item.unique_ports.size;
        const pcr = item.total_reverse_packets > 0 ? item.value / item.total_reverse_packets : 0;
        const por = item.value > 0 ? item.total_packets / item.value : 0;
        
        const p_value = logistic_regression(
          num_ports, pcr, por,
          0.00243691, 0.00014983, 0.00014983, -3.93433105
        );
        
        return {
          timestamp: item.timestamp,
          value: item.value,
          metric: item.metric,
          flows: item.flows,
          alert_probability: p_value,
          unique_ports: num_ports,
          unique_ips: item.unique_ips.size
        };
      }).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    } else if (metric === 'flows') {
      // Network flows over time
      const result = await session.run(`
        MATCH (f:Flow)
        WHERE f.flowStartMilliseconds IS NOT NULL
          AND (f.malicious IS NULL OR f.malicious = false) 
          AND (f.honeypot IS NULL OR f.honeypot = false)
        RETURN f.flowStartMilliseconds AS flow_start
      `);

      // Group flows by time intervals
      const timeGroups: Record<string, number> = {};
      
      for (const record of result.records) {
        const flow_start_str = record.get('flow_start');
        const flow_start_time = parseFlowTimestamp(flow_start_str);
        
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
          timeGroups[timeKey] = (timeGroups[timeKey] || 0) + 1;
        }
      }

      data = Object.entries(timeGroups).map(([timestamp, value]) => ({
        timestamp,
        value,
        metric: 'flows'
      })).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    } else if (metric === 'alerts' || metric === 'threats') {
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

      // Convert alerts to time series data
      const timeGroups: Record<string, number> = {};
      
      Object.values(unique_ports).forEach((entry: any) => {
        let severity_threshold = 0.1; // Default for 'alerts'
        if (metric === 'threats') {
          severity_threshold = 0.6; // Higher threshold for high-risk threats
        }
        
        if (entry.p_value >= severity_threshold) {
          const date = new Date(entry.flow_start_time);
          let timeKey = '';
          
          if (granularity === '30m') {
            const minutes = Math.floor(date.getMinutes() / 30) * 30;
            timeKey = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), minutes).toISOString();
          } else if (granularity === '1h') {
            timeKey = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()).toISOString();
          } else if (granularity === '6h') {
            const hours = Math.floor(date.getHours() / 6) * 6;
            timeKey = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours).toISOString();
          } else if (granularity === '1d') {
            timeKey = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
          }
          
          if (timeKey) {
            timeGroups[timeKey] = (timeGroups[timeKey] || 0) + 1;
          }
        }
      });

      data = Object.entries(timeGroups).map(([timestamp, value]) => ({
        timestamp,
        value,
        metric
      })).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    } else if (metric === 'bytes') {
      // Original bytes metric
      const result = await session.run(`
        MATCH (f:Flow)
        WHERE f.flowStartMilliseconds IS NOT NULL
          AND (f.malicious IS NULL OR f.malicious = false) 
          AND (f.honeypot IS NULL OR f.honeypot = false)
        RETURN f.flowStartMilliseconds AS flow_start,
               coalesce(f.octetTotalCount, 0) as bytes
      `);

      // Group by time intervals
      const timeGroups: Record<string, number> = {};
      
      for (const record of result.records) {
        const flow_start_str = record.get('flow_start');
        const flow_start_time = parseFlowTimestamp(flow_start_str);
        
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
          timeGroups[timeKey] = (timeGroups[timeKey] || 0) + record.get('bytes');
        }
      }

      data = Object.entries(timeGroups).map(([timestamp, value]) => ({
        timestamp,
        value,
        metric: 'bytes'
      })).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }

    return NextResponse.json({
      data,
      metric,
      period,
      granularity,
      sourceIp,
      destIp,
      total_points: data.length,
      success: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching time-series data:', error)
    
    // Return fallback data if database query fails
    return NextResponse.json({
      data: [
        { timestamp: new Date(Date.now() - 3600000).toISOString(), value: 25, metric: metric || "alerts" },
        { timestamp: new Date(Date.now() - 7200000).toISOString(), value: 18, metric: metric || "alerts" },
        { timestamp: new Date(Date.now() - 10800000).toISOString(), value: 32, metric: metric || "alerts" },
        { timestamp: new Date().toISOString(), value: 41, metric: metric || "alerts" }
      ],
      metric: metric || "alerts",
      period: period || "24h", 
      granularity: granularity || "1h",
      total_points: 4,
      success: false,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  } finally {
    if (session) await session.close();
    if (driver) await driver.close();
  }
} 