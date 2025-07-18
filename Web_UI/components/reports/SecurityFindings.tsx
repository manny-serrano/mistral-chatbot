import { Badge } from '@/components/ui/badge'
import { REPORT_STYLES } from '@/lib/report-styles'
import { SecurityFindings as SecurityFindingsType } from '@/lib/report-types'

interface SecurityFindingsProps {
  findings: SecurityFindingsType
}

export function SecurityFindings({ findings }: SecurityFindingsProps) {
  return (
    <section className={REPORT_STYLES.layout.sectionContainer}>
      <h2 className={REPORT_STYLES.typography.sectionTitle}>Security Analysis</h2>
      
      {Object.entries(findings).map(([category, data]) => {
        if (typeof data !== 'object' || !data) return null
        
        return (
          <div key={category} className="mb-6">
            <h3 className={REPORT_STYLES.typography.subsectionTitle}>
              {category.replace(/_/g, ' ').toUpperCase()}
            </h3>
            
            <div className={REPORT_STYLES.cards.content}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <span className="text-sm text-gray-600">Severity</span>
                  {data.severity && (
                    <Badge 
                      variant="outline" 
                      className={`ml-2 text-xs ${REPORT_STYLES.badges.base} ${REPORT_STYLES.badges.severity[data.severity.toLowerCase() as keyof typeof REPORT_STYLES.badges.severity]}`}
                    >
                      {data.severity}
                    </Badge>
                  )}
                </div>
                <div>
                  <span className="text-sm text-gray-600">Count</span>
                  <span className="ml-2 font-medium">{data.count || 0}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Status</span>
                  <Badge variant="outline" className="ml-2 text-xs">
                    {data.mitigation_status || 'Under Review'}
                  </Badge>
                </div>
              </div>
              
              {data.details && (
                <div className="text-sm text-gray-700">
                  <strong>Details:</strong> {data.details}
                </div>
              )}
              
              {data.ips && data.ips.length > 0 && (
                <div className="mt-2 text-sm text-gray-700">
                  <strong>Affected IPs:</strong> {data.ips.slice(0, 5).join(', ')}
                  {data.ips.length > 5 && ` (+${data.ips.length - 5} more)`}
                </div>
              )}
              
              {/* Port Scanning - Potential Scanners */}
              {category === 'port_scanning' && (data as any).potential_scanners && (data as any).potential_scanners.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Potential Scanners Detected</h4>
                  <div className="space-y-1">
                    {(data as any).potential_scanners.slice(0, 5).map((scanner: any, index: number) => (
                      <div key={index} className="text-sm text-gray-700">
                        <span className="font-mono">{scanner.source_ip || scanner.ip}</span> - {scanner.ports_scanned || scanner.port_count} ports scanned
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Data Exfiltration - High Volume Sources */}
              {category === 'data_exfiltration' && (data as any).high_volume_sources && (data as any).high_volume_sources.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">High Volume Sources</h4>
                  <div className="space-y-1">
                    {(data as any).high_volume_sources.slice(0, 5).map((source: any, index: number) => (
                      <div key={index} className="text-sm text-gray-700">
                        <span className="font-mono">{source.source_ip || source.ip}</span> - {source.gb_sent || source.data_transferred} GB transferred
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </section>
  )
}