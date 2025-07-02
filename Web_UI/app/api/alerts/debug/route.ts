import { NextResponse } from 'next/server';
import neo4j from 'neo4j-driver';

function logistic_regression(num_ports, pcr, por, coef_ports, coef_pcr, coef_por, intercept) {
  const z = (coef_ports * num_ports) + (coef_pcr * pcr) + (coef_por * por) + intercept;
  return 1 / (1 + Math.exp(-z));
}

function isPrivateIP(ip: string): boolean {
  const privateRanges = [
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^127\./,
    /^169\.254\./,
    /^::1$/,
    /^fc00:/,
    /^fe80:/
  ];
  
  return privateRanges.some(range => range.test(ip));
}

function getIPCategory(ip: string): string {
  if (isPrivateIP(ip)) {
    if (ip.startsWith('192.168.')) return 'Private (192.168.x.x)';
    if (ip.startsWith('10.')) return 'Private (10.x.x.x)';
    if (ip.startsWith('172.')) return 'Private (172.16-31.x.x)';
    if (ip.startsWith('127.')) return 'Localhost (127.x.x.x)';
    return 'Private (Other)';
  }
  
  // Categorize public IPs by region (rough estimates)
  const firstOctet = parseInt(ip.split('.')[0]);
  if (firstOctet >= 1 && firstOctet <= 126) return 'Public (Americas)';
  if (firstOctet >= 128 && firstOctet <= 191) return 'Public (Europe/Asia)';
  if (firstOctet >= 192 && firstOctet <= 223) return 'Public (Asia/Pacific)';
  return 'Public (Other)';
}

export async function GET() {
  let driver, session;
  try {
    driver = neo4j.driver(
      'bolt://localhost:7687',
      neo4j.auth.basic('neo4j', 'password123')
    );
    session = driver.session();

    // Query all flows with required properties
    const result = await session.run(`
      MATCH (src:Host)-[:SENT]->(f:Flow)-[:USES_DST_PORT]->(dst_port:Port)
      RETURN src.ip AS src_ip, f.flowStartMilliseconds AS flow_start, dst_port.port AS dst_port,
             f.protocolIdentifier AS protocol, f.packets AS packets, f.reversePackets AS reverse_packets,
             f.bytes AS bytes, f.reverseBytes AS reverse_bytes
    `);

    const unique_ports = {};
    for (const record of result.records) {
      const src_ip = record.get('src_ip');
      const dst_port = record.get('dst_port');
      const bytes = record.get('bytes') || 0;
      const reverse_bytes = record.get('reverse_bytes') || 0;
      const packets = record.get('packets') || 0;
      const flow_start = record.get('flow_start');
      
      let date = 'unknown';
      if (flow_start !== null && flow_start !== undefined && !isNaN(Number(flow_start))) {
        const d = new Date(Number(flow_start));
        if (!isNaN(d.getTime())) {
          date = d.toISOString().slice(0, 10);
        }
      }
      const key = `${src_ip}_${date}`;

      if (!unique_ports[key]) {
        unique_ports[key] = {
          src_ip,
          date,
          dest_port_string: new Set(),
          bytes: 0,
          reverse_bytes: 0,
          packets: 0,
          pcr: 0,
          por: 0,
          p_value: 0
        };
      }
      unique_ports[key].dest_port_string.add(dst_port);
      unique_ports[key].bytes += bytes;
      unique_ports[key].reverse_bytes += reverse_bytes;
      unique_ports[key].packets += packets;
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

    // Generate alerts and analyze IP distribution
    const alerts = Object.values(unique_ports).map((entry) => {
      let severity = 'low';
      if (entry.p_value >= 0.8) severity = 'critical';
      else if (entry.p_value >= 0.6) severity = 'high';
      else if (entry.p_value >= 0.4) severity = 'medium';
      return {
        type: 'unique_ports_logistic',
        ip: entry.src_ip,
        date: entry.date,
        unique_ports: entry.num_ports,
        pcr: entry.pcr,
        por: entry.por,
        p_value: entry.p_value,
        severity,
        message: `IP ${entry.src_ip} on ${entry.date} connected to ${entry.num_ports} unique ports (p_value: ${entry.p_value.toFixed(3)})`
      };
    });

    // Analyze IP categories
    const ipAnalysis = {
      total_alerts: alerts.length,
      unique_ips: new Set(alerts.map(a => a.ip)).size,
      ip_categories: {},
      private_ips: [],
      public_ips: [],
      severity_breakdown: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      }
    };

    const uniqueIPs = [...new Set(alerts.map(a => a.ip))];
    
    uniqueIPs.forEach(ip => {
      const category = getIPCategory(ip);
      ipAnalysis.ip_categories[category] = (ipAnalysis.ip_categories[category] || 0) + 1;
      
      if (isPrivateIP(ip)) {
        ipAnalysis.private_ips.push(ip);
      } else {
        ipAnalysis.public_ips.push(ip);
      }
    });

    alerts.forEach(alert => {
      ipAnalysis.severity_breakdown[alert.severity]++;
    });

    // Sample IPs from each category
    const samples = {};
    Object.keys(ipAnalysis.ip_categories).forEach(category => {
      samples[category] = uniqueIPs
        .filter(ip => getIPCategory(ip) === category)
        .slice(0, 5); // Show first 5 IPs as examples
    });

    return NextResponse.json({
      analysis: ipAnalysis,
      sample_ips: samples,
      explanation: {
        why_geolocation_shows_fewer: "Geolocation map only shows public IPs that can be geolocated. Private IPs (192.168.x.x, 10.x.x.x, etc.) are filtered out.",
        private_ip_count: ipAnalysis.private_ips.length,
        public_ip_count: ipAnalysis.public_ips.length,
        ratio: `${((ipAnalysis.public_ips.length / uniqueIPs.length) * 100).toFixed(1)}% of IPs are public and can be geolocated`
      }
    });

  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
  } finally {
    if (session) await session.close();
    if (driver) await driver.close();
  }
} 