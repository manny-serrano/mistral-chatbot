import { NextRequest, NextResponse } from 'next/server'
import neo4j from 'neo4j-driver'

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

// Logistic regression function for threat detection
function logistic_regression(num_ports: number, pcr: number, por: number, coef_ports: number, coef_pcr: number, coef_por: number, intercept: number) {
  const z = (coef_ports * num_ports) + (coef_pcr * pcr) + (coef_por * por) + intercept;
  return 1 / (1 + Math.exp(-z));
}

export async function GET(request: NextRequest) {
  let driver, session;
  try {
    const { searchParams } = new URL(request.url)
    const heatmapType = searchParams.get('heatmap_type') || 'hourly_activity'
    
    driver = neo4j.driver(
      'bolt://localhost:7687',
      neo4j.auth.basic('neo4j', 'password123')
    );
    session = driver.session();

    // Get the actual data range from the database
    const dataRangeResult = await session.run(`
      MATCH (f:Flow)
      WHERE f.flowStartMilliseconds IS NOT NULL
      RETURN min(f.flowStartMilliseconds) as minTimeStr, max(f.flowStartMilliseconds) as maxTimeStr, count(f) as totalFlows
    `);
    
    const minTimeStr = dataRangeResult.records[0]?.get('minTimeStr');
    const maxTimeStr = dataRangeResult.records[0]?.get('maxTimeStr');
    const totalFlows = dataRangeResult.records[0]?.get('totalFlows').toNumber() || 0;
    
    if (!minTimeStr || !maxTimeStr || totalFlows === 0) {
      // No data available, return fallback
      return NextResponse.json({
        data: [],
        heatmap_type: heatmapType,
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
        heatmap_type: heatmapType,
        success: false,
        timestamp: new Date().toISOString(),
        error: "Could not parse timestamp format"
      });
    }

    let data = [];

    if (heatmapType === 'hourly_activity') {
      // Enhanced hourly activity heatmap with real timestamp parsing
      const result = await session.run(`
        MATCH (f:Flow)
        WHERE f.flowStartMilliseconds IS NOT NULL
          AND (f.malicious IS NULL OR f.malicious = false) 
          AND (f.honeypot IS NULL OR f.honeypot = false)
        RETURN f.flowStartMilliseconds AS flow_start, count(f) as flow_count
      `);
      
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const hourlyData: { [key: string]: number } = {};
      
      for (const record of result.records) {
        const flow_start_str = record.get('flow_start');
        const flow_start_time = parseFlowTimestamp(flow_start_str);
        const flow_count = record.get('flow_count').toNumber();
        
        if (!flow_start_time) continue;
        
        const date = new Date(flow_start_time);
        const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const hour = date.getHours();
        
        const key = `${dayOfWeek}-${hour}`;
        hourlyData[key] = (hourlyData[key] || 0) + flow_count;
      }
      
      // Convert to array format
      for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        for (let hour = 0; hour < 24; hour++) {
          const value = hourlyData[`${dayIndex}-${hour}`] || 0;
          data.push({
            day: days[dayIndex],
            day_index: dayIndex,
            hour: hour,
            value: value
          });
        }
      }
      
    } else if (heatmapType === 'ip_activity') {
      // IP activity by hour
      const result = await session.run(`
        MATCH (src:Host)-[:SENT]->(f:Flow)
        WHERE f.flowStartMilliseconds IS NOT NULL
          AND (f.malicious IS NULL OR f.malicious = false) 
          AND (f.honeypot IS NULL OR f.honeypot = false)
        RETURN src.ip as ip, f.flowStartMilliseconds AS flow_start, count(f) as flow_count
        ORDER BY flow_count DESC
        LIMIT 500
      `);
      
      const ipHourlyData: { [key: string]: number } = {};
      
      for (const record of result.records) {
        const ip = record.get('ip');
        const flow_start_str = record.get('flow_start');
        const flow_start_time = parseFlowTimestamp(flow_start_str);
        const flow_count = record.get('flow_count').toNumber();
        
        if (!flow_start_time || !ip) continue;
        
        const date = new Date(flow_start_time);
        const hour = date.getHours();
        
        const key = `${ip}-${hour}`;
        ipHourlyData[key] = (ipHourlyData[key] || 0) + flow_count;
      }
      
      // Convert to array format and get top IPs
      const ipTotals: { [ip: string]: number } = {};
      Object.entries(ipHourlyData).forEach(([key, value]) => {
        const ip = key.split('-')[0];
        ipTotals[ip] = (ipTotals[ip] || 0) + value;
      });
      
      const topIPs = Object.entries(ipTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([ip]) => ip);
      
      for (const ip of topIPs) {
        for (let hour = 0; hour < 24; hour++) {
          const value = ipHourlyData[`${ip}-${hour}`] || 0;
          data.push({
            ip: ip,
            hour: hour,
            value: value
          });
        }
      }
      
    } else if (heatmapType === 'ip_port_matrix') {
      // Enhanced IP-Port matrix with real data
      const result = await session.run(`
        MATCH (src:Host)-[:SENT]->(f:Flow)-[:USES_DST_PORT]->(dst_port:Port)
        WHERE f.flowStartMilliseconds IS NOT NULL
          AND (f.malicious IS NULL OR f.malicious = false) 
          AND (f.honeypot IS NULL OR f.honeypot = false)
        RETURN src.ip as src_ip, dst_port.port as dst_port, count(f) as flow_count
        ORDER BY flow_count DESC
        LIMIT 1000
      `);
      
      const ipPortData: { [key: string]: number } = {};
      const allIPs = new Set<string>();
      const allPorts = new Set<number>();
      
      for (const record of result.records) {
        const src_ip = record.get('src_ip');
        const dst_port = record.get('dst_port');
        const flow_count = record.get('flow_count').toNumber();
        
        if (src_ip && dst_port !== null) {
          const portNum = typeof dst_port === 'object' ? dst_port.toNumber() : Number(dst_port);
          allIPs.add(src_ip);
          allPorts.add(portNum);
          ipPortData[`${src_ip}-${portNum}`] = flow_count;
        }
      }
      
      // Get top IPs and common ports for the matrix
      const ipActivity: { [ip: string]: number } = {};
      Object.entries(ipPortData).forEach(([key, value]) => {
        const ip = key.split('-')[0];
        ipActivity[ip] = (ipActivity[ip] || 0) + value;
      });
      
      const topIPs = Object.entries(ipActivity)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([ip]) => ip);
      
      const commonPorts = Array.from(allPorts)
        .filter(port => port > 0 && port < 65536)
        .sort((a, b) => a - b)
        .slice(0, 25);
      
      // Build matrix data
      for (const ip of topIPs) {
        for (const port of commonPorts) {
          const value = ipPortData[`${ip}-${port}`] || 0;
          data.push({
            ip: ip,
            port: port,
            value: value
          });
        }
      }
      
    } else if (heatmapType === 'threat_intensity') {
      // Enhanced threat intensity heatmap using real alert logic
      const result = await session.run(`
        MATCH (src:Host)-[:SENT]->(f:Flow)-[:USES_DST_PORT]->(dst_port:Port)
        WHERE f.flowStartMilliseconds IS NOT NULL
          AND (f.malicious IS NULL OR f.malicious = false) 
          AND (f.honeypot IS NULL OR f.honeypot = false)
        RETURN src.ip AS src_ip, f.destinationIPv4Address AS dst_ip, f.flowStartMilliseconds AS flow_start, dst_port.port AS dst_port,
               f.protocolIdentifier AS protocol, f.packetTotalCount AS packets, f.reversePacketTotalCount AS reverse_packets,
               f.octetTotalCount AS bytes, f.reverseOctetTotalCount AS reverse_bytes
      `);

      // Process flows to generate threat analysis by IP subnet
      const subnetThreats: { [subnet: string]: any } = {};
      
      for (const record of result.records) {
        const src_ip = record.get('src_ip');
        const dst_port_raw = record.get('dst_port');
        const dst_port = Number(dst_port_raw);
        const bytes = record.get('bytes') || 0;
        const reverse_bytes = record.get('reverse_bytes') || 0;
        const packets = record.get('packets') || 0;
        const flow_start_str = record.get('flow_start');
        
        const flow_start_time = parseFlowTimestamp(flow_start_str);
        if (!flow_start_time || !src_ip) continue;
        
        // Extract subnet (first 3 octets for Class C)
        const subnet = src_ip.split('.').slice(0, 3).join('.') + '.0/24';
        
        const date = new Date(flow_start_time);
        const dateKey = date.toISOString().slice(0, 10);
        const key = `${subnet}_${dateKey}`;

        if (!subnetThreats[key]) {
          subnetThreats[key] = {
            subnet,
            date: dateKey,
            dest_port_string: new Set(),
            dest_ip_string: new Set(),
            bytes: 0,
            reverse_bytes: 0,
            packets: 0,
            flow_count: 0
          };
        }
        
        subnetThreats[key].dest_port_string.add(dst_port);
        subnetThreats[key].dest_ip_string.add(record.get('dst_ip'));
        subnetThreats[key].bytes += Number(bytes);
        subnetThreats[key].reverse_bytes += Number(reverse_bytes);
        subnetThreats[key].packets += Number(packets);
        subnetThreats[key].flow_count += 1;
      }

      // Calculate threat scores for each subnet
      const subnetScores: { [subnet: string]: number } = {};
      
      Object.values(subnetThreats).forEach((entry: any) => {
        const num_ports = entry.dest_port_string.size;
        const pcr = entry.reverse_bytes > 0 ? entry.bytes / entry.reverse_bytes : 0;
        const por = entry.bytes > 0 ? entry.packets / entry.bytes : 0;
        
        const p_value = logistic_regression(
          num_ports, pcr, por,
          0.00243691, 0.00014983, 0.00014983, -3.93433105
        );
        
        const subnet = entry.subnet;
        subnetScores[subnet] = Math.max(subnetScores[subnet] || 0, p_value);
      });
      
      // Convert to regions/areas for display
      const regions = [
        { name: "Internal Network", pattern: "10." },
        { name: "DMZ Zone", pattern: "192.168." },
        { name: "External Traffic", pattern: "172." },
        { name: "Cloud Services", pattern: "34." },
        { name: "CDN/Web", pattern: "152." },
        { name: "Other Networks", pattern: "" }
      ];
      
      regions.forEach(region => {
        const matchingSubnets = Object.entries(subnetScores)
          .filter(([subnet]) => region.pattern === "" || subnet.startsWith(region.pattern));
        
        const avgThreatScore = matchingSubnets.length > 0 
          ? matchingSubnets.reduce((sum, [, score]) => sum + score, 0) / matchingSubnets.length
          : 0;
        
        const threatLevel = Math.round(avgThreatScore * 100);
        
        data.push({
          region: region.name,
          value: threatLevel,
          threat_score: avgThreatScore
        });
      });
      
    } else if (heatmapType === 'bandwidth_matrix') {
      // New: Bandwidth usage matrix by IP and time
      const result = await session.run(`
        MATCH (f:Flow)
        WHERE f.flowStartMilliseconds IS NOT NULL
          AND f.sourceIPv4Address IS NOT NULL
          AND f.destinationIPv4Address IS NOT NULL
          AND (f.malicious IS NULL OR f.malicious = false) 
          AND (f.honeypot IS NULL OR f.honeypot = false)
        RETURN f.sourceIPv4Address as src_ip, f.destinationIPv4Address as dst_ip,
               f.flowStartMilliseconds AS flow_start,
               f.octetTotalCount AS bytes_out, f.reverseOctetTotalCount AS bytes_in
        LIMIT 2000
      `);
      
      const bandwidthData: { [key: string]: number } = {};
      const ipBandwidth: { [ip: string]: number } = {};
      
      for (const record of result.records) {
        const src_ip = record.get('src_ip');
        const dst_ip = record.get('dst_ip');
        const flow_start_str = record.get('flow_start');
        const bytes_out = record.get('bytes_out') || 0;
        const bytes_in = record.get('bytes_in') || 0;
        
        const flow_start_time = parseFlowTimestamp(flow_start_str);
        if (!flow_start_time || !src_ip) continue;
        
        const total_bytes = Number(bytes_out) + Number(bytes_in);
        if (total_bytes <= 0) continue;
        
        const date = new Date(flow_start_time);
        const hour = date.getHours();
        
        // Track bandwidth by source IP and hour
        const key = `${src_ip}-${hour}`;
        bandwidthData[key] = (bandwidthData[key] || 0) + total_bytes;
        ipBandwidth[src_ip] = (ipBandwidth[src_ip] || 0) + total_bytes;
      }
      
      // Get top bandwidth IPs
      const topBandwidthIPs = Object.entries(ipBandwidth)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([ip]) => ip);
      
      // Build hourly bandwidth matrix
      for (const ip of topBandwidthIPs) {
        for (let hour = 0; hour < 24; hour++) {
          const bandwidth = bandwidthData[`${ip}-${hour}`] || 0;
          const bandwidthMB = Math.round(bandwidth / (1024 * 1024)); // Convert to MB
          
          data.push({
            ip: ip,
            hour: hour,
            value: bandwidthMB,
            bytes: bandwidth
          });
        }
      }
    }

    return NextResponse.json({
      data,
      heatmap_type: heatmapType,
      success: true,
      timestamp: new Date().toISOString(),
      debug: {
        totalFlows,
        dataRange: { minTimeStr, maxTimeStr },
        dataPoints: data.length
      }
    });
  } catch (error) {
    console.error('Error fetching heatmap data:', error)
    
    // Return enhanced fallback data based on heatmap type
    let mockData = [];
    
    if (heatmapType === 'hourly_activity') {
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
        for (let hour = 0; hour < 24; hour++) {
          const baseActivity = dayIdx < 5 && hour >= 9 && hour <= 17 ? 80 : 20;
          mockData.push({
            day: days[dayIdx],
            day_index: dayIdx,
            hour: hour,
            value: baseActivity + Math.floor(Math.random() * 30)
          });
        }
      }
    } else if (heatmapType === 'ip_port_matrix') {
      const mockIPs = ['192.168.1.10', '192.168.1.20', '192.168.1.30', '10.0.0.5', '10.0.0.15'];
      const mockPorts = [80, 443, 22, 3389, 8080, 8443];
      for (const ip of mockIPs) {
        for (const port of mockPorts) {
          mockData.push({
            ip: ip,
            port: port,
            value: Math.floor(Math.random() * 100)
          });
        }
      }
    } else if (heatmapType === 'threat_intensity') {
      const regions = ['Internal Network', 'DMZ Zone', 'External Traffic', 'Cloud Services', 'CDN/Web', 'Other Networks'];
      regions.forEach(region => {
        mockData.push({
          region: region,
          value: Math.floor(Math.random() * 80) + 10
        });
      });
    } else if (heatmapType === 'bandwidth_matrix') {
      const mockIPs = ['192.168.1.10', '192.168.1.20', '10.0.0.5'];
      for (const ip of mockIPs) {
        for (let hour = 0; hour < 24; hour++) {
          mockData.push({
            ip: ip,
            hour: hour,
            value: Math.floor(Math.random() * 1000) + 50 // MB
          });
        }
      }
    }
    
    return NextResponse.json({
      data: mockData,
      heatmap_type: heatmapType,
      success: false,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  } finally {
    if (session) await session.close();
    if (driver) await driver.close();
  }
} 