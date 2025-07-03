import { NextRequest, NextResponse } from 'next/server'
import neo4j from 'neo4j-driver'

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

    // Calculate time range based on period
    const now = Date.now();
    let startTime = now;
    if (period === '24h') startTime = now - (24 * 60 * 60 * 1000);
    else if (period === '7d') startTime = now - (7 * 24 * 60 * 60 * 1000);
    else if (period === '30d') startTime = now - (30 * 24 * 60 * 60 * 1000);

    let query = '';
    if (metric === 'alerts' || metric === 'flows') {
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
    } else if (metric === 'bytes') {
      query = `
        MATCH (f:Flow)
        WHERE f.flowStartMilliseconds >= $startTime 
          AND f.flowStartMilliseconds <= $endTime
          AND (f.malicious IS NULL OR f.malicious = false) 
          AND (f.honeypot IS NULL OR f.honeypot = false)
        WITH f, datetime({epochMillis: f.flowStartMilliseconds}) as dt
        RETURN 
          dt.year as year, dt.month as month, dt.day as day, dt.hour as hour,
          sum(coalesce(f.bytes, 0)) as value
        ORDER BY year, month, day, hour
      `;
    }

    const result = await session.run(query, { 
      startTime: startTime, 
      endTime: now 
    });
    
    const data = [];
    for (const record of result.records) {
      const year = record.get('year').toNumber();
      const month = record.get('month').toNumber();
      const day = record.get('day').toNumber();
      const hour = record.get('hour').toNumber();
      const value = record.get('value').toNumber();
      
      const timestamp = new Date(year, month - 1, day, hour).toISOString();
      data.push({ timestamp, value, metric });
    }

    return NextResponse.json({
      data,
      metric,
      period,
      granularity,
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