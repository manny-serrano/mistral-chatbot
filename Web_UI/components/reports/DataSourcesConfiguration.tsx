import { Database } from 'lucide-react'
import { REPORT_STYLES } from '@/lib/report-styles'
import { DataSourcesAndConfiguration } from '@/lib/report-types'

interface DataSourcesConfigurationProps {
  data: DataSourcesAndConfiguration
}

export function DataSourcesConfiguration({ data }: DataSourcesConfigurationProps) {
  // Handle case where data might be null/undefined
  if (!data) {
    return (
      <section className={REPORT_STYLES.layout.sectionContainer}>
        <h2 className={REPORT_STYLES.typography.sectionTitle}>Data Sources & Configuration</h2>
        <p className="text-gray-500">No configuration data available.</p>
      </section>
    )
  }

  return (
    <section className={REPORT_STYLES.layout.sectionContainer}>
      <h2 className={REPORT_STYLES.typography.sectionTitle}>Data Sources & Configuration</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Data Sources */}
        <div>
          <h3 className={REPORT_STYLES.typography.subsectionTitle}>Data Sources</h3>
          <div className="space-y-3">
            <div className={REPORT_STYLES.cards.base}>
              <div className="flex items-center mb-2">
                <Database className="h-4 w-4 text-gray-600 mr-2" />
                <span className="font-medium text-gray-900">Primary Data Source</span>
              </div>
              <p className="text-sm text-gray-700 mb-1">
                <strong>Source:</strong> {data.primary_data_source || 'Not specified'}
              </p>
            </div>
            
            {data.yaf_ipfix_sensors && data.yaf_ipfix_sensors.length > 0 && (
              <div className={REPORT_STYLES.cards.base}>
                <div className="flex items-center mb-2">
                  <Database className="h-4 w-4 text-gray-600 mr-2" />
                  <span className="font-medium text-gray-900">YAF IPFIX Sensors</span>
                </div>
                <ul className="text-sm text-gray-700">
                  {data.yaf_ipfix_sensors.map((sensor, index) => (
                    <li key={index} className="list-disc ml-4">{sensor}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {data.threat_intelligence_sources && data.threat_intelligence_sources.length > 0 && (
              <div className={REPORT_STYLES.cards.base}>
                <div className="flex items-center mb-2">
                  <Database className="h-4 w-4 text-gray-600 mr-2" />
                  <span className="font-medium text-gray-900">Threat Intelligence Sources</span>
                </div>
                <ul className="text-sm text-gray-700">
                  {data.threat_intelligence_sources.map((source, index) => (
                    <li key={index} className="list-disc ml-4">{source}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Analysis Configuration */}
        <div>
          <h3 className={REPORT_STYLES.typography.subsectionTitle}>Analysis Configuration</h3>
          <div className={REPORT_STYLES.cards.base}>
            <div className="space-y-3">
              {data.analysis_methodology && (
                <>
              <div>
                    <span className="text-sm font-medium text-gray-600">Normal Traffic Analysis:</span>
                    <p className="text-sm text-gray-900">{data.analysis_methodology.normal_traffic_analysis || 'Not specified'}</p>
              </div>
              <div>
                    <span className="text-sm font-medium text-gray-600">Threat Detection:</span>
                    <p className="text-sm text-gray-900">{data.analysis_methodology.threat_detection || 'Not specified'}</p>
              </div>
              <div>
                    <span className="text-sm font-medium text-gray-600">Comparison Scope:</span>
                    <p className="text-sm text-gray-900">{data.analysis_methodology.comparison_scope || 'Not specified'}</p>
                    </div>
                </>
              )}
              
              {data.configuration_details && (
                <>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Sampling Rate:</span>
                    <p className="text-sm text-gray-900">{data.configuration_details.sampling_rate || 'Not specified'}</p>
                </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Flow Timeout:</span>
                    <p className="text-sm text-gray-900">{data.configuration_details.flow_timeout || 'Not specified'}</p>
              </div>
              <div>
                    <span className="text-sm font-medium text-gray-600">Collection Method:</span>
                    <p className="text-sm text-gray-900">{data.configuration_details.collection_method || 'Not specified'}</p>
                  </div>
                </>
              )}
              
              {data.ipfix_information_elements && data.ipfix_information_elements.length > 0 && (
                <div>
                  <span className="text-sm font-medium text-gray-600">IPFIX Elements:</span>
                <p className="text-sm text-gray-900">
                    {data.ipfix_information_elements.length} information elements configured
                </p>
              </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
} 