import { NextRequest, NextResponse } from 'next/server'
import neo4j from 'neo4j-driver'

// Logistic regression function for alert correlation
function logistic_regression(num_ports: number, pcr: number, por: number, coef_ports: number, coef_pcr: number, coef_por: number, intercept: number) {
  const z = (coef_ports * num_ports) + (coef_pcr * pcr) + (coef_por * por) + intercept;
  return 1 / (1 + Math.exp(-z));
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

    // Calculate time range based on period
    const now = Date.now();
    let startTime = now;
    if (period === '24h') startTime = now - (24 * 60 * 60 * 1000);
    else if (period === '7d') startTime = now - (7 * 24 * 60 * 60 * 1000);
    else if (period === '30d') startTime = now - (30 * 24 * 60 * 60 * 1000);

    let query = '';
    let data: any[] = [];

    if (metric === 'bandwidth') {
      // Enhanced bandwidth query with IP pair analysis
      const ipFilter = sourceIp && destIp ? 
        `AND f.sourceIPv4Address = $sourceIp AND f.destinationIPv4Address = $destIp` :
        sourceIp ? `AND (f.sourceIPv4Address = $sourceIp OR f.destinationIPv4Address = $sourceIp)` :
        '';
      
      query = `
        MATCH (f:Flow)
        WHERE f.flowStartMilliseconds >= $startTime 
          AND f.flowStartMilliseconds <= $endTime
          AND (f.malicious IS NULL OR f.malicious = false) 
          AND (f.honeypot IS NULL OR f.honeypot = false)
          ${ipFilter}
        WITH f, datetime({epochMillis: f.flowStartMilliseconds}) as dt
        RETURN 
          dt.year as year, dt.month as month, dt.day as day, dt.hour as hour,
          sum(coalesce(f.octetTotalCount, 0)) as total_bytes,
          sum(coalesce(f.reverseOctetTotalCount, 0)) as reverse_bytes,
          sum(coalesce(f.octetTotalCount, 0) + coalesce(f.reverseOctetTotalCount, 0)) as bandwidth,
          count(f) as flows,
          collect(DISTINCT f.sourceIPv4Address)[0..10] as source_ips,
          collect(DISTINCT f.destinationIPv4Address)[0..10] as dest_ips
        ORDER BY year, month, day, hour
      `;
      
      const params: any = { startTime, endTime: now };
      if (sourceIp) params.sourceIp = sourceIp;
      if (destIp) params.destIp = destIp;
      
      const result = await session.run(query, params);
      
      for (const record of result.records) {
        const year = record.get('year').toNumber();
        const month = record.get('month').toNumber();
        const day = record.get('day').toNumber();
        const hour = record.get('hour').toNumber();
        const bandwidth = record.get('bandwidth').toNumber();
        const flows = record.get('flows').toNumber();
        const sourceIps = record.get('source_ips');
        const destIps = record.get('dest_ips');
        
        const timestamp = new Date(year, month - 1, day, hour).toISOString();
        data.push({ 
          timestamp, 
          value: bandwidth, 
          metric: 'bandwidth',
          flows,
          sourceIps,
          destIps
        });
      }
    } else if (metric === 'bandwidth_with_alerts') {
      // Bandwidth with alert correlation
      query = `
        MATCH (src:Host)-[:SENT]->(f:Flow)-[:USES_DST_PORT]->(dst_port:Port)
        WHERE f.flowStartMilliseconds >= $startTime 
          AND f.flowStartMilliseconds <= $endTime
          AND (f.malicious IS NULL OR f.malicious = false) 
          AND (f.honeypot IS NULL OR f.honeypot = false)
        WITH f, datetime({epochMillis: f.flowStartMilliseconds}) as dt, src, dst_port
        RETURN 
          dt.year as year, dt.month as month, dt.day as day, dt.hour as hour,
          sum(coalesce(f.octetTotalCount, 0) + coalesce(f.reverseOctetTotalCount, 0)) as bandwidth,
          count(f) as flows,
          src.ip as src_ip,
          collect(DISTINCT dst_port.port)[0..5] as dest_ports,
          collect(DISTINCT f.destinationIPv4Address)[0..5] as dest_ips,
          sum(coalesce(f.packetTotalCount, 0)) as packets,
          sum(coalesce(f.reversePacketTotalCount, 0)) as reverse_packets
        ORDER BY year, month, day, hour, bandwidth DESC
      `;
      
      const result = await session.run(query, { startTime, endTime: now });
      
      // Process results and calculate alert probabilities
      const aggregated: { [key: string]: any } = {};
      
      for (const record of result.records) {
        const year = record.get('year').toNumber();
        const month = record.get('month').toNumber();
        const day = record.get('day').toNumber();
        const hour = record.get('hour').toNumber();
        const bandwidth = record.get('bandwidth').toNumber();
        const flows = record.get('flows').toNumber();
        const packets = record.get('packets').toNumber();
        const reversePackets = record.get('reverse_packets').toNumber();
        const destPorts = record.get('dest_ports');
        const destIps = record.get('dest_ips');
        
        const timestamp = new Date(year, month - 1, day, hour).toISOString();
        const key = timestamp;
        
        if (!aggregated[key]) {
          aggregated[key] = {
            timestamp,
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
        
        aggregated[key].value += bandwidth;
        aggregated[key].flows += flows;
        aggregated[key].total_packets += packets;
        aggregated[key].total_reverse_packets += reversePackets;
        destPorts.forEach((port: any) => aggregated[key].unique_ports.add(port));
        destIps.forEach((ip: any) => aggregated[key].unique_ips.add(ip));
      }
      
      // Calculate alert probabilities for each time period
      data = Object.values(aggregated).map((item: any) => {
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
      });
    } else if (metric === 'ip_pair_bandwidth') {
      // Top IP pairs by bandwidth
      query = `
        MATCH (f:Flow)
        WHERE f.flowStartMilliseconds >= $startTime 
          AND f.flowStartMilliseconds <= $endTime
          AND (f.malicious IS NULL OR f.malicious = false) 
          AND (f.honeypot IS NULL OR f.honeypot = false)
        WITH f, datetime({epochMillis: f.flowStartMilliseconds}) as dt,
             f.sourceIPv4Address + " → " + f.destinationIPv4Address as ip_pair
        RETURN 
          dt.year as year, dt.month as month, dt.day as day, dt.hour as hour,
          ip_pair,
          sum(coalesce(f.octetTotalCount, 0) + coalesce(f.reverseOctetTotalCount, 0)) as bandwidth,
          count(f) as flows
        ORDER BY year, month, day, hour, bandwidth DESC
      `;
      
      const result = await session.run(query, { startTime, endTime: now });
      
      for (const record of result.records) {
        const year = record.get('year').toNumber();
        const month = record.get('month').toNumber();
        const day = record.get('day').toNumber();
        const hour = record.get('hour').toNumber();
        const bandwidth = record.get('bandwidth').toNumber();
        const flows = record.get('flows').toNumber();
        const ipPair = record.get('ip_pair');
        
        const timestamp = new Date(year, month - 1, day, hour).toISOString();
        data.push({ 
          timestamp, 
          value: bandwidth, 
          metric: 'ip_pair_bandwidth',
          flows,
          ip_pair: ipPair
        });
      }
    } else if (metric === 'alerts' || metric === 'flows') {
      // Original alert/flow metrics
      query = `
        MATCH (f:Flow)
        WHERE f.flowStartMilliseconds >= $startTime 
          AND f.flowStartMilliseconds <= $endTime
          AND (f.malicious IS NULL OR f.malicious = false) 
          AND (f.honeypot IS NULL OR f.honeypot = false)
        WITH f, datetime({epochMillis: f.flowStartMilliseconds}) as dt
        RETURN 
          dt.year as year, dt.month as month, dt.day as day, dt.hour as hour,
          count(f) as value
        ORDER BY year, month, day, hour
      `;
      
      const result = await session.run(query, { startTime, endTime: now });
      
      for (const record of result.records) {
        const year = record.get('year').toNumber();
        const month = record.get('month').toNumber();
        const day = record.get('day').toNumber();
        const hour = record.get('hour').toNumber();
        const value = record.get('value').toNumber();
        
        const timestamp = new Date(year, month - 1, day, hour).toISOString();
        data.push({ timestamp, value, metric });
      }
    } else if (metric === 'bytes') {
      // Original bytes metric
      query = `
        MATCH (f:Flow)
        WHERE f.flowStartMilliseconds >= $startTime 
          AND f.flowStartMilliseconds <= $endTime
          AND (f.malicious IS NULL OR f.malicious = false) 
          AND (f.honeypot IS NULL OR f.honeypot = false)
        WITH f, datetime({epochMillis: f.flowStartMilliseconds}) as dt
        RETURN 
          dt.year as year, dt.month as month, dt.day as day, dt.hour as hour,
          sum(coalesce(f.octetTotalCount, 0)) as value
        ORDER BY year, month, day, hour
      `;
      
      const result = await session.run(query, { startTime, endTime: now });
      
      for (const record of result.records) {
        const year = record.get('year').toNumber();
        const month = record.get('month').toNumber();
        const day = record.get('day').toNumber();
        const hour = record.get('hour').toNumber();
        const value = record.get('value').toNumber();
        
        const timestamp = new Date(year, month - 1, day, hour).toISOString();
        data.push({ timestamp, value, metric });
      }
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