import { Badge } from '@/components/ui/badge'
import { REPORT_STYLES } from '@/lib/report-styles'
import { NetworkTrafficOverview } from '@/lib/report-types'

interface NetworkAnalysisProps {
  networkData: NetworkTrafficOverview
}

export function NetworkAnalysis({ networkData }: NetworkAnalysisProps) {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Map of protocol numbers to names (subset for display)
  const PROTOCOL_MAP: Record<number, string> = {
    1: 'ICMP',
    2: 'IGMP',
    6: 'TCP',
    17: 'UDP',
    41: 'IPv6',
    47: 'GRE',
    50: 'ESP',
    51: 'AH',
    58: 'ICMPv6',
    89: 'OSPF',
    112: 'VRRP',
  }

  const getProtocolName = (protoKey: string, protoData: any): string => {
    // Prefer explicit ID from data if present
    if (protoData && typeof protoData.protocol_id === 'number') {
      const name = PROTOCOL_MAP[protoData.protocol_id]
      if (name) return name
    }

    // Handle keys like "Protocol_112"
    const match = protoKey.match(/(?:protocol_)?(\d+)/i)
    if (match) {
      const id = Number(match[1])
      return PROTOCOL_MAP[id] || `Protocol ${id}`
    }

    // Not numeric, just return capitalized
    return protoKey.toUpperCase()
  }

  return (
    <section className={REPORT_STYLES.layout.sectionContainer}>
      <h2 className={REPORT_STYLES.typography.sectionTitle}>Network Traffic Analysis</h2>
      
      <div className={REPORT_STYLES.grids.networkStats}>
        <div className={REPORT_STYLES.cards.base}>
          <h4 className="text-sm font-medium text-gray-600 mb-1">Total Flows</h4>
          <p className="text-xl font-bold text-gray-900">
            {networkData.basic_stats.total_flows.toLocaleString()}
          </p>
        </div>
        
        <div className={REPORT_STYLES.cards.base}>
          <h4 className="text-sm font-medium text-gray-600 mb-1">Total Data</h4>
          <p className="text-xl font-bold text-gray-900">
            {formatBytes(networkData.basic_stats.total_bytes)}
          </p>
        </div>
        
        <div className={REPORT_STYLES.cards.base}>
          <h4 className="text-sm font-medium text-gray-600 mb-1">Total Packets</h4>
          <p className="text-xl font-bold text-gray-900">
            {networkData.basic_stats.total_packets.toLocaleString()}
          </p>
        </div>
        
        <div className={REPORT_STYLES.cards.base}>
          <h4 className="text-sm font-medium text-gray-600 mb-1">Avg Bandwidth</h4>
          <p className="text-xl font-bold text-gray-900">
            {networkData.bandwidth_stats.average_mbps} Mbps
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Top Sources */}
        <div>
          <h3 className={REPORT_STYLES.typography.subsectionTitle}>Top Traffic Sources</h3>
          <div className="space-y-2">
            {networkData.top_sources.slice(0, 5).map((source, index) => (
              <div key={index} className={`flex items-center justify-between p-3 ${REPORT_STYLES.cards.base}`}>
                <span className="font-mono text-sm text-gray-700">{source.ip}</span>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">{formatBytes(source.bytes)}</div>
                  <div className="text-xs text-gray-500">{source.flow_count} flows</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Destinations */}
        <div>
          <h3 className={REPORT_STYLES.typography.subsectionTitle}>Top Traffic Destinations</h3>
          <div className="space-y-2">
            {networkData.top_destinations.slice(0, 5).map((dest, index) => (
              <div key={index} className={`flex items-center justify-between p-3 ${REPORT_STYLES.cards.base}`}>
                <span className="font-mono text-sm text-gray-700">{dest.ip}</span>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">{formatBytes(dest.bytes)}</div>
                  <div className="text-xs text-gray-500">{dest.flow_count} flows</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Protocol Breakdown */}
      <div>
        <h3 className={REPORT_STYLES.typography.subsectionTitle}>Protocol Distribution</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(networkData.protocol_breakdown).slice(0, 6).map(([protocol, data]) => (
            <div key={protocol} className={`p-3 ${REPORT_STYLES.cards.base}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-900">{getProtocolName(protocol, data)}</span>
                {data.is_suspicious && (
                  <Badge variant="outline" className={`${REPORT_STYLES.badges.base} ${REPORT_STYLES.badges.severity.medium}`}>
                    Suspicious
                  </Badge>
                )}
              </div>
              <div className="text-xs text-gray-600">
                {(data.flow_count || 0).toLocaleString()} flows • {formatBytes(data.total_bytes || 0)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
} 