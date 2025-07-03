import { NextRequest, NextResponse } from 'next/server'
import neo4j from 'neo4j-driver'

export async function GET(request: NextRequest) {
  let driver, session;
  try {
    const { searchParams } = new URL(request.url)
    const chartType = searchParams.get('chart_type') || 'protocols'
    
    driver = neo4j.driver(
      'bolt://localhost:7687',
      neo4j.auth.basic('neo4j', 'password123')
    );
    session = driver.session();

    let query = '';
    let data = [];
    let total = 0;

    // Query based on chart type, filtering out honeypot and malicious data
    if (chartType === 'protocols') {
      query = `
        MATCH (f:Flow)-[:USES_PROTOCOL]->(p:Protocol)
        WHERE (f.malicious IS NULL OR f.malicious = false) 
          AND (f.honeypot IS NULL OR f.honeypot = false)
        RETURN p.name as name, count(f) as value
        ORDER BY value DESC
        LIMIT 10
      `;
    } else if (chartType === 'ports') {
      query = `
        MATCH (f:Flow)-[:USES_DST_PORT]->(port:Port)
        WHERE (f.malicious IS NULL OR f.malicious = false) 
          AND (f.honeypot IS NULL OR f.honeypot = false)
        RETURN port.port as port, port.service as service, count(f) as value
        ORDER BY value DESC
        LIMIT 10
      `;
    } else if (chartType === 'threats') {
      query = `
        MATCH (src:Host)-[:SENT]->(f:Flow)
        WHERE (f.malicious IS NULL OR f.malicious = false) 
          AND (f.honeypot IS NULL OR f.honeypot = false)
        RETURN src.ip as name, count(f) as value
        ORDER BY value DESC
        LIMIT 10
      `;
    } else {
      // Default to protocols
      query = `
        MATCH (f:Flow)-[:USES_PROTOCOL]->(p:Protocol)
        WHERE (f.malicious IS NULL OR f.malicious = false) 
          AND (f.honeypot IS NULL OR f.honeypot = false)
        RETURN p.name as name, count(f) as value
        ORDER BY value DESC
        LIMIT 10
      `;
    }

    const result = await session.run(query);
    
    for (const record of result.records) {
      let name;
      if (chartType === 'ports') {
        const port = record.get('port');
        const service = record.get('service');
        name = `${port} ${service ? `(${service})` : ''}`;
      } else {
        name = record.get('name');
      }
      
      const value = record.get('value').toNumber();
      data.push({ name, value });
      total += value;
    }

    // Calculate percentages
    data = data.map(item => ({
      ...item,
      percentage: total > 0 ? (item.value / total * 100).toFixed(1) : 0
    }));

    return NextResponse.json({
      data,
      chart_type: chartType,
      total,
      success: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching bar chart data:', error)
    
    // Return fallback data if database query fails
    return NextResponse.json({
      data: [
        { name: "TCP", value: 2847, percentage: 68.5 },
        { name: "UDP", value: 1044, percentage: 25.1 },
        { name: "ICMP", value: 234, percentage: 5.6 },
        { name: "GRE", value: 32, percentage: 0.8 }
      ],
      chart_type: 'protocols',
      total: 4157,
      success: false,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  } finally {
    if (session) await session.close();
    if (driver) await driver.close();
  }
} 