import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { reportData, reportId } = await request.json()
    
    if (!reportData) {
      return NextResponse.json({ error: 'Report data is required' }, { status: 400 })
    }

    console.log('Received report data keys:', Object.keys(reportData))
    console.log('Report metadata:', reportData.metadata)

    // Handle wrapped response structure - extract actual report data
    const actualReportData = reportData?.report || reportData || {}
    
    console.log('Actual report data keys:', Object.keys(actualReportData))
    console.log('Actual report metadata:', actualReportData.metadata)

    // Extract data with safe defaults from the actual report structure
    const metadata = actualReportData?.metadata || {}
    const executiveSummary = actualReportData?.executive_summary || {}
    const networkTraffic = actualReportData?.network_traffic_overview || {}
    const securityFindings = actualReportData?.security_findings || {}
    const recommendations = actualReportData?.recommendations_and_next_steps?.prioritized_recommendations || []
    const aiAnalysis = actualReportData?.ai_analysis || []
    
    // Use protocol_breakdown as in the viewer
    const protocolBreakdown = networkTraffic?.protocol_breakdown || {}

    const formatBytes = (bytes: number) => {
      if (bytes === 0) return '0 Bytes'
      const k = 1024
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    const formatDate = (dateString: string) => {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    const getBadgeClass = (level: string) => {
      switch (level?.toUpperCase()) {
        case 'HIGH':
          return 'badge-high'
        case 'IMMEDIATE':
          return 'badge-immediate'
        case 'MEDIUM':
          return 'badge-medium'
        case 'SCHEDULED':
          return 'badge-scheduled'
        case 'LOW':
        case 'PLANNED':
          return 'badge-low'
        default:
          return 'badge-medium'
      }
    }

    // Enhanced SVG Icons matching Lucide React icons exactly
    const icons = {
      shield: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline-block;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`,
      alertTriangle: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline-block;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
      trendingUp: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline-block;"><polyline points="22,7 13.5,15.5 8.5,10.5 2,17"></polyline><polyline points="16,7 22,7 22,13"></polyline></svg>`,
      calendar: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline-block;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
      clock: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline-block;"><circle cx="12" cy="12" r="10"></circle><polyline points="12,6 12,12 16,14"></polyline></svg>`,
      fileText: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline-block;"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2Z"></path><polyline points="14,2 14,8 20,8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`
    }

    // Protocol number to name map
    const PROTOCOL_MAP: Record<number, string> = {
      1: 'ICMP', 2: 'IGMP', 6: 'TCP', 17: 'UDP', 41: 'IPv6', 47: 'GRE',
      50: 'ESP', 51: 'AH', 58: 'ICMPv6', 89: 'OSPF', 112: 'VRRP'
    }

    const getProtocolName = (key: string, proto: any) => {
      if (proto && typeof proto.protocol_id === 'number') {
        return PROTOCOL_MAP[proto.protocol_id] || `Protocol ${proto.protocol_id}`
      }
      const m = key.match(/(?:protocol_)?(\d+)/i)
      if (m) {
        const id = Number(m[1])
        return PROTOCOL_MAP[id] || `Protocol ${id}`
      }
      return key.toUpperCase()
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${metadata.report_title || 'Security Report'}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.5;
            color: #111827;
            background-color: #ffffff;
            font-size: 16px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .container {
            max-width: 896px;
            margin: 0 auto;
            padding: 32px 24px;
          }
          
          /* Header Styles - matching viewer exactly */
          .header {
            text-align: center;
            margin-bottom: 32px;
            page-break-inside: avoid;
          }
          
          .title {
            font-size: 30px;
            font-weight: 700;
            color: #111827;
            margin-bottom: 16px;
            line-height: 1.2;
          }
          
          .subtitle {
            font-size: 18px;
            color: #6B7280;
            margin-bottom: 16px;
          }
          
          .meta-info {
            display: flex;
            justify-content: center;
            gap: 24px;
            font-size: 14px;
            color: #6B7280;
            flex-wrap: wrap;
          }
          
          .meta-item {
            display: flex;
            align-items: center;
            gap: 8px;
          }
          
          .meta-item svg {
            color: #6B7280;
            flex-shrink: 0;
          }
          
          /* Section Styles */
          .section {
            margin-bottom: 32px;
            page-break-inside: auto;
          }
          
          .section-title {
            font-size: 24px;
            font-weight: 700;
            color: #111827;
            margin-bottom: 16px;
          }
          
          .subsection-title {
            font-size: 18px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 12px;
          }
          
          .separator {
            border: none;
            border-top: 1px solid #E5E7EB;
            margin: 32px 0;
          }
          
          /* Card Grid Styles */
          .card-grid {
            display: grid;
            gap: 16px;
            margin-bottom: 24px;
          }
          
          .card-grid-3 {
            grid-template-columns: repeat(3, 1fr);
          }
          
          .card-grid-4 {
            grid-template-columns: repeat(4, 1fr);
          }
          
          .card-grid-2 {
            grid-template-columns: repeat(2, 1fr);
          }
          
          /* Executive Summary Cards */
          .executive-card {
            background-color: #F9FAFB;
            border: 1px solid #F3F4F6;
            border-radius: 8px;
            padding: 16px;
            page-break-inside: avoid;
          }
          
          .card-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 12px;
          }
          
          .card-header svg {
            color: #6B7280;
          }
          
          .card-label {
            font-size: 14px;
            font-weight: 500;
            color: #6B7280;
          }
          
          .card-value {
            font-size: 20px;
            font-weight: 700;
            color: #111827;
          }
          
          /* Traffic Cards */
          .traffic-card {
            background-color: #F9FAFB;
            border: 1px solid #F3F4F6;
            border-radius: 8px;
            padding: 16px;
            page-break-inside: avoid;
          }
          
          .traffic-card-label {
            font-size: 14px;
            font-weight: 500;
            color: #6B7280;
            margin-bottom: 8px;
          }
          
          .traffic-card-value {
            font-size: 20px;
            font-weight: 700;
            color: #111827;
          }
          
          /* Badge Styles - matching viewer exactly */
          .badge {
            display: inline-flex;
            align-items: center;
            padding: 4px 12px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
            border: 1px solid;
            text-transform: uppercase;
            letter-spacing: 0.025em;
          }
          
          .badge-high {
            background-color: #FEF2F2;
            color: #B91C1C;
            border-color: #FECACA;
          }
          
          .badge-immediate {
            background-color: #FEF2F2;
            color: #B91C1C;
            border-color: #FECACA;
          }
          
          .badge-medium {
            background-color: #FFFBEB;
            color: #D97706;
            border-color: #FDE68A;
          }
          
          .badge-scheduled {
            background-color: #FFFBEB;
            color: #D97706;
            border-color: #FDE68A;
          }
          
          .badge-low {
            background-color: #F0FDF4;
            color: #16A34A;
            border-color: #BBF7D0;
          }
          
          .badge-planned {
            background-color: #EFF6FF;
            color: #2563EB;
            border-color: #BFDBFE;
          }
          
          /* List Styles */
          .findings-list {
            margin: 0;
            padding: 0;
            list-style: none;
          }
          
          .findings-item {
            display: flex;
            align-items: flex-start;
            margin-bottom: 12px;
            line-height: 1.5;
          }
          
          .findings-bullet {
            width: 6px;
            height: 6px;
            background-color: #9CA3AF;
            border-radius: 50%;
            margin-right: 12px;
            margin-top: 9px;
            flex-shrink: 0;
          }
          
          .findings-text {
            flex: 1;
            font-size: 16px;
            color: #374151;
          }
          
          /* Traffic Source/Destination Items */
          .traffic-section {
            page-break-inside: auto;
          }
          
          .traffic-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px;
            margin-bottom: 8px;
            background-color: #F9FAFB;
            border: 1px solid #F3F4F6;
            border-radius: 6px;
            page-break-inside: avoid;
          }
          
          .traffic-ip {
            font-family: Monaco, Menlo, 'Ubuntu Mono', monospace;
            font-size: 14px;
            font-weight: 500;
            color: #374151;
          }
          
          .traffic-info {
            text-align: right;
          }
          
          .traffic-bytes {
            font-size: 14px;
            font-weight: 600;
            color: #111827;
          }
          
          .traffic-flows {
            font-size: 12px;
            color: #6B7280;
          }
          
          /* Protocol Distribution */
          .protocol-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
            page-break-inside: auto;
          }
          
          .protocol-card {
            padding: 12px;
            background-color: #F9FAFB;
            border: 1px solid #F3F4F6;
            border-radius: 6px;
            page-break-inside: avoid;
          }
          
          .protocol-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 4px;
          }
          
          .protocol-name {
            font-size: 14px;
            font-weight: 600;
            color: #111827;
          }
          
          .protocol-stats {
            font-size: 12px;
            color: #6B7280;
          }
          
          .protocol-suspicious {
            background-color: #FFFBEB;
            color: #D97706;
            border-color: #FDE68A;
            font-size: 12px;
            padding: 2px 8px;
            border-radius: 4px;
            border: 1px solid;
          }
          
          /* Security Analysis */
          .security-section {
            page-break-inside: auto;
          }
          
          .security-category {
            margin-bottom: 24px;
            page-break-inside: auto;
          }
          
          .security-card {
            background-color: #F9FAFB;
            padding: 16px;
            border-radius: 8px;
            border: 1px solid #F3F4F6;
          }
          
          .security-header {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
            margin-bottom: 16px;
            align-items: center;
          }
          
          .security-label {
            font-size: 14px;
            color: #6B7280;
          }
          
          .security-value {
            font-weight: 600;
          }
          
          .scanner-section {
            margin-bottom: 16px;
          }
          
          .scanner-title {
            font-size: 14px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 8px;
          }
          
          .scanner-item {
            font-size: 14px;
            color: #374151;
            margin-bottom: 4px;
          }
          
          .scanner-ip {
            font-family: Monaco, Menlo, 'Ubuntu Mono', monospace;
            font-weight: 500;
          }
          
          /* Recommendations */
          .recommendations-section {
            page-break-inside: auto;
          }
          
          .recommendation-card {
            border: 1px solid #E5E7EB;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 16px;
            page-break-inside: avoid;
          }
          
          .recommendation-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            margin-bottom: 12px;
          }
          
          .recommendation-title {
            font-size: 16px;
            font-weight: 600;
            color: #111827;
          }
          
          .recommendation-content {
            font-size: 14px;
            color: #374151;
            margin-bottom: 8px;
            line-height: 1.5;
          }
          
          .recommendation-meta {
            display: flex;
            gap: 16px;
            font-size: 12px;
            color: #6B7280;
          }
          
          /* AI Analysis */
          .ai-analysis-section {
            page-break-inside: auto;
          }
          
          .ai-analysis-card {
            border: 1px solid #E5E7EB;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 16px;
            page-break-inside: avoid;
          }
          
          .ai-analysis-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            margin-bottom: 12px;
          }
          
          .ai-analysis-meta {
            font-size: 12px;
            color: #6B7280;
          }
          
          .ai-analysis-content {
            font-size: 14px;
            color: #374151;
            margin-bottom: 8px;
            line-height: 1.5;
          }
          
          /* Footer */
          .footer {
            margin-top: 48px;
            padding-top: 24px;
            border-top: 1px solid #E5E7EB;
            text-align: center;
            font-size: 14px;
            color: #6B7280;
          }
          
          .footer p {
            margin-bottom: 4px;
          }
          
          /* Print optimizations */
          @media print {
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            
            .section {
              page-break-inside: auto;
            }
            
            .executive-card,
            .traffic-card,
            .protocol-card,
            .traffic-item,
            .recommendation-card,
            .ai-analysis-card {
              page-break-inside: avoid;
              break-inside: avoid;
            }
            
            .security-category,
            .traffic-section,
            .protocol-grid,
            .security-section,
            .recommendations-section,
            .ai-analysis-section {
              page-break-inside: auto;
              break-inside: auto;
            }
            
            h1, h2, h3 {
              page-break-after: avoid;
              break-after: avoid;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Header -->
          <div class="header">
            <h1 class="title">${metadata.report_title || 'Security Report'}</h1>
            <p class="subtitle">Generated by ${metadata.generated_by || 'LEVANT AI Security Platform'}</p>
            <div class="meta-info">
              <div class="meta-item">
                ${icons.calendar}
                <span>${formatDate(metadata.generation_date) || 'Unknown Date'}</span>
              </div>
              <div class="meta-item">
                ${icons.clock}
                <span>${metadata.analysis_duration_hours || 'N/A'} hour analysis</span>
              </div>
              <div class="meta-item">
                ${icons.fileText}
                <span>Version ${metadata.report_version || 'N/A'}</span>
              </div>
            </div>
          </div>

          <hr class="separator">

          <!-- Executive Summary -->
          <section class="section">
            <h2 class="section-title">Executive Summary</h2>
            
            <div class="card-grid card-grid-3">
              <div class="executive-card">
                <div class="card-header">
                  ${icons.shield}
                  <span class="card-label">Risk Level</span>
                </div>
                <span class="badge ${getBadgeClass(executiveSummary.overall_risk_level)}">
                  ${executiveSummary.overall_risk_level || 'UNKNOWN'}
                </span>
              </div>
              
              <div class="executive-card">
                <div class="card-header">
                  ${icons.alertTriangle}
                  <span class="card-label">Critical Issues</span>
                </div>
                <div class="card-value">
                  ${executiveSummary.critical_issues_count || 0}
                </div>
              </div>
              
              <div class="executive-card">
                <div class="card-header">
                  ${icons.trendingUp}
                  <span class="card-label">Priority</span>
                </div>
                <span class="badge ${getBadgeClass(executiveSummary.recommendations_priority)}">
                  ${executiveSummary.recommendations_priority || 'MEDIUM'}
                </span>
              </div>
            </div>

            <h3 class="subsection-title">Key Findings</h3>
            <ul class="findings-list">
              ${(executiveSummary.key_findings || []).map((finding: string) => `
                <li class="findings-item">
                  <span class="findings-bullet"></span>
                  <span class="findings-text">${finding}</span>
                </li>
              `).join('')}
            </ul>
          </section>

          <hr class="separator">

          <!-- Network Traffic Analysis -->
          <section class="section">
            <h2 class="section-title">Network Traffic Analysis</h2>
            
            <div class="card-grid card-grid-4">
              <div class="traffic-card">
                <div class="traffic-card-label">Total Flows</div>
                <div class="traffic-card-value">
                  ${(networkTraffic.basic_stats?.total_flows || 0).toLocaleString()}
                </div>
              </div>
              
              <div class="traffic-card">
                <div class="traffic-card-label">Total Data</div>
                <div class="traffic-card-value">
                  ${formatBytes(networkTraffic.basic_stats?.total_bytes || 0)}
                </div>
              </div>
              
              <div class="traffic-card">
                <div class="traffic-card-label">Total Packets</div>
                <div class="traffic-card-value">
                  ${(networkTraffic.basic_stats?.total_packets || 0).toLocaleString()}
                </div>
              </div>
              
              <div class="traffic-card">
                <div class="traffic-card-label">Avg Bandwidth</div>
                <div class="traffic-card-value">
                  ${networkTraffic.bandwidth_stats?.average_mbps || 0} Mbps
                </div>
              </div>
            </div>

            <div class="card-grid card-grid-2">
              <div class="traffic-section">
                <h3 class="subsection-title">Top Traffic Sources</h3>
                <div>
                  ${(networkTraffic.top_sources || []).slice(0, 5).map((source: any) => `
                    <div class="traffic-item">
                      <span class="traffic-ip">${source.ip}</span>
                      <div class="traffic-info">
                        <div class="traffic-bytes">${formatBytes(source.bytes)}</div>
                        <div class="traffic-flows">${source.flow_count} flows</div>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>

              <div class="traffic-section">
                <h3 class="subsection-title">Top Traffic Destinations</h3>
                <div>
                  ${(networkTraffic.top_destinations || []).slice(0, 5).map((dest: any) => `
                    <div class="traffic-item">
                      <span class="traffic-ip">${dest.ip}</span>
                      <div class="traffic-info">
                        <div class="traffic-bytes">${formatBytes(dest.bytes)}</div>
                        <div class="traffic-flows">${dest.flow_count} flows</div>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>

            <div>
              <h3 class="subsection-title">Protocol Distribution</h3>
              <div class="protocol-grid">
                ${Object.entries(protocolBreakdown).slice(0, 6).map(([protocol, data]: [string, any]) => `
                  <div class="protocol-card">
                    <div class="protocol-header">
                      <span class="protocol-name">${getProtocolName(protocol, data)}</span>
                      ${data.is_suspicious ? `<span class="protocol-suspicious">Suspicious</span>` : ''}
                    </div>
                    <div class="protocol-stats">
                      ${data.flow_count?.toLocaleString() || 0} flows • ${formatBytes(data.total_bytes || 0)}
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          </section>

          <hr class="separator">

          <!-- Security Analysis -->
          <section class="section security-section">
            <h2 class="section-title">Security Analysis</h2>
            
            ${Object.entries(securityFindings || {}).map(([category, findings]: [string, any]) => {
              if (typeof findings !== 'object' || !findings) return ''
              
              return `
                <div class="security-category">
                  <h3 class="subsection-title">${category.replace(/_/g, ' ').toUpperCase()}</h3>
                  
                  <div class="security-card">
                    <div class="security-header">
                      <div>
                        <span class="security-label">Severity</span>
                        <span class="badge ${getBadgeClass(findings.severity)}">
                          ${findings.severity || 'UNKNOWN'}
                        </span>
                      </div>
                      ${findings.count !== undefined ? `
                        <div>
                          <span class="security-label">Count: </span>
                          <span class="security-value">${findings.count}</span>
                        </div>
                      ` : ''}
                      ${findings.matching_flows !== undefined ? `
                        <div>
                          <span class="security-label">Matching Flows: </span>
                          <span class="security-value">${findings.matching_flows}</span>
                        </div>
                      ` : ''}
                    </div>
                    
                    ${findings.potential_scanners ? `
                      <div class="scanner-section">
                        <div class="scanner-title">Potential Scanners Detected</div>
                        <div>
                          ${findings.potential_scanners.slice(0, 5).map((scanner: any) => `
                            <div class="scanner-item">
                              <span class="scanner-ip">${scanner.source_ip}</span> - ${scanner.ports_scanned} ports scanned
                            </div>
                          `).join('')}
                        </div>
                      </div>
                    ` : ''}
                    
                    ${findings.high_volume_sources ? `
                      <div class="scanner-section">
                        <div class="scanner-title">High Volume Sources</div>
                        <div>
                          ${findings.high_volume_sources.slice(0, 5).map((source: any) => `
                            <div class="scanner-item">
                              <span class="scanner-ip">${source.source_ip}</span> - ${source.gb_sent} GB transferred
                            </div>
                          `).join('')}
                        </div>
                      </div>
                    ` : ''}
                  </div>
                </div>
              `
            }).join('')}
          </section>

          <hr class="separator">

          <!-- Recommendations -->
          <section class="section recommendations-section">
            <h2 class="section-title">Recommendations</h2>
            
            <div>
              ${recommendations.map((rec: any) => `
                <div class="recommendation-card">
                  <div class="recommendation-header">
                    <h3 class="recommendation-title">${(rec.category || 'General').toUpperCase()}</h3>
                    <span class="badge ${getBadgeClass(rec.priority)}">
                      ${rec.priority || 'MEDIUM'}
                    </span>
                  </div>
                  
                  <div class="recommendation-content">
                    <strong>Finding:</strong> ${rec.finding || 'N/A'}
                  </div>
                  
                  <div class="recommendation-content">
                    <strong>Recommendation:</strong> ${rec.recommendation || 'N/A'}
                  </div>
                  
                  <div class="recommendation-meta">
                    <span><strong>Effort:</strong> ${rec.estimated_effort || 'N/A'}</span>
                    <span><strong>Timeline:</strong> ${rec.timeline || 'N/A'}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </section>

          ${aiAnalysis.length > 0 ? `
            <hr class="separator">
            
            <section class="section ai-analysis-section">
              <h2 class="section-title">AI Security Analysis</h2>
              
              <div>
                ${aiAnalysis.map((analysis: any) => `
                  <div class="ai-analysis-card">
                    <div class="ai-analysis-header">
                      <span class="ai-analysis-meta">MITRE ATT&CK: ${analysis.attack_technique || 'N/A'}</span>
                      <span class="ai-analysis-meta">
                        Confidence: ${Math.round((analysis.confidence_score || 0) * 100)}%
                      </span>
                    </div>
                    
                    <div class="ai-analysis-content">
                      <strong>Finding:</strong> ${analysis.finding || 'N/A'}
                    </div>
                    
                    <div class="ai-analysis-content">
                      <strong>Business Impact:</strong> ${analysis.business_impact || 'N/A'}
                    </div>
                    
                    <div class="ai-analysis-content">
                      <strong>Recommended Action:</strong> ${analysis.recommended_action || 'N/A'}
                    </div>
                    
                    <div class="ai-analysis-meta">
                      <strong>Timeline:</strong> ${analysis.timeline || 'N/A'}
                    </div>
                  </div>
                `).join('')}
              </div>
            </section>
          ` : ''}

          <!-- Footer -->
          <div class="footer">
            <p>This report was automatically generated by LEVANT AI Security Platform</p>
            <p>Report ID: ${reportId || 'N/A'}</p>
          </div>
        </div>
      </body>
      </html>
    `

    return NextResponse.json({ 
      html,
      success: true,
      message: 'PDF HTML generated successfully' 
    })

  } catch (error) {
    console.error('Error generating PDF:', error)
    return NextResponse.json({ 
      error: 'Failed to generate PDF',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 