import { NextResponse } from 'next/server';
import neo4j from 'neo4j-driver';

function logistic_regression(num_ports, pcr, por, coef_ports, coef_pcr, coef_por, intercept) {
  const z = (coef_ports * num_ports) + (coef_pcr * pcr) + (coef_por * por) + intercept;
  return 1 / (1 + Math.exp(-z));
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
    // Filter to show only legitimate flow data, excluding honeypot and malicious data
    const result = await session.run(`
      MATCH (src:Host)-[:SENT]->(f:Flow)-[:USES_DST_PORT]->(dst_port:Port)
      WHERE (f.malicious IS NULL OR f.malicious = false) 
        AND (f.honeypot IS NULL OR f.honeypot = false)
      RETURN src.ip AS src_ip, f.destinationIPv4Address AS dst_ip, f.flowStartMilliseconds AS flow_start, dst_port.port AS dst_port,
             f.protocolIdentifier AS protocol, f.packets AS packets, f.reversePackets AS reverse_packets,
             f.bytes AS bytes, f.reverseBytes AS reverse_bytes
    `);

    const unique_ports = {};
    for (const record of result.records) {
      const src_ip = record.get('src_ip');
      const dst_ip = record.get('dst_ip');
      const dst_port_raw = record.get('dst_port');
      // Convert Neo4j integer to JavaScript number
      const dst_port = Number(dst_port_raw);
      const bytes = record.get('bytes') || 0;
      const reverse_bytes = record.get('reverse_bytes') || 0;
      const packets = record.get('packets') || 0;
      const flow_start = record.get('flow_start');
      // Use date string for grouping
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
          dest_ip_string: new Set(), // Track destination IPs
          bytes: 0,
          reverse_bytes: 0,
          packets: 0,
          pcr: 0,
          por: 0,
          p_value: 0
        };
      }
      unique_ports[key].dest_port_string.add(dst_port);
      unique_ports[key].dest_ip_string.add(String(dst_ip)); // Ensure string conversion for IPs
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

    // Generate alerts based on p_value thresholds
    const alerts = Object.values(unique_ports).map((entry) => {
      let severity = 'low';
      
      // Threat level calculation based on p_value
      if (entry.p_value >= 0.8) severity = 'critical';        // >= 0.8 Critical
      else if (entry.p_value >= 0.6) severity = 'high';       // >= 0.6 High  
      else if (entry.p_value >= 0.4) severity = 'medium';     // >= 0.4 Medium
      else if (entry.p_value >= 0.1) severity = 'low';        // >= 0.1 Low
      else return null; // Filter out alerts with p_value < 0.1
      
      return {
        type: 'unique_ports_logistic',
        ip: entry.src_ip,
        date: entry.date,
        unique_ports: entry.num_ports,
        pcr: entry.pcr,
        por: entry.por,
        p_value: entry.p_value,
        severity,
        target_ports: Array.from(entry.dest_port_string).slice(0, 10), // Include up to 10 ports as examples
        target_ips: Array.from(entry.dest_ip_string).slice(0, 10), // Include up to 10 destination IPs as examples
        message: `IP ${entry.src_ip} on ${entry.date} connected to ${entry.num_ports} unique ports (p_value: ${entry.p_value.toFixed(3)}, Threat Level: ${severity.toUpperCase()})`
      };
    }).filter(alert => alert !== null); // Remove filtered out alerts

    return NextResponse.json({ alerts });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
  } finally {
    if (session) await session.close();
    if (driver) await driver.close();
  }
} 