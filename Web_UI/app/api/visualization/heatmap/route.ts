import { NextRequest, NextResponse } from 'next/server'
import neo4j from 'neo4j-driver'

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

    let query = '';
    let data = [];

    if (heatmapType === 'hourly_activity') {
      // Activity by day of week and hour
      query = `
        MATCH (f:Flow)
        WHERE (f.malicious IS NULL OR f.malicious = false) 
          AND (f.honeypot IS NULL OR f.honeypot = false)
        WITH f, datetime({epochMillis: f.flowStartMilliseconds}) as dt
        WITH dt.dayOfWeek as dayOfWeek, dt.hour as hour, count(f) as value
        RETURN dayOfWeek, hour, value
        ORDER BY dayOfWeek, hour
      `;
      
      const result = await session.run(query);
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      
      for (const record of result.records) {
        const dayOfWeek = record.get('dayOfWeek').toNumber();
        const hour = record.get('hour').toNumber();
        const value = record.get('value').toNumber();
        
        data.push({
          day: days[dayOfWeek],
          day_index: dayOfWeek,
          hour: hour,
          value: value
        });
      }
    } else if (heatmapType === 'ip_activity') {
      // Activity by source IP and hour
      query = `
        MATCH (src:Host)-[:SENT]->(f:Flow)
        WHERE (f.malicious IS NULL OR f.malicious = false) 
          AND (f.honeypot IS NULL OR f.honeypot = false)
        WITH src.ip as ip, datetime({epochMillis: f.flowStartMilliseconds}) as dt, count(f) as value
        WITH ip, dt.hour as hour, sum(value) as value
        RETURN ip, hour, value
        ORDER BY value DESC, ip, hour
        LIMIT 200
      `;
      
      const result = await session.run(query);
      
      for (const record of result.records) {
        const ip = record.get('ip');
        const hour = record.get('hour').toNumber();
        const value = record.get('value').toNumber();
        
        data.push({
          ip: ip,
          hour: hour,
          value: value
        });
      }
    }

    return NextResponse.json({
      data,
      heatmap_type: heatmapType,
      success: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching heatmap data:', error)
    
    // Return fallback data if database query fails
    const mockData = []
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
      for (let hour = 0; hour < 24; hour++) {
        const baseActivity = dayIdx < 5 && hour >= 9 && hour <= 17 ? 80 : 20
        mockData.push({
          day: days[dayIdx],
          day_index: dayIdx,
          hour: hour,
          value: baseActivity + Math.floor(Math.random() * 30)
        })
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