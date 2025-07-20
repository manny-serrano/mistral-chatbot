import React from 'react'
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { REPORT_STYLES } from '@/lib/report-styles'
import { ComplianceAndGovernance } from '@/lib/report-types'

interface ComplianceGovernanceProps {
  data: ComplianceAndGovernance
}

export function ComplianceGovernance({ data }: ComplianceGovernanceProps) {
  // Handle case where data might be null/undefined
  if (!data) {
    return (
      <section className={REPORT_STYLES.layout.sectionContainer}>
        <h2 className={REPORT_STYLES.typography.sectionTitle}>Compliance & Governance</h2>
        <p className="text-gray-500">No compliance data available.</p>
      </section>
    )
  }

  const getComplianceIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'compliant':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'non-compliant':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'partial':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />
    }
  }

  const getComplianceClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'compliant':
        return `${REPORT_STYLES.badges.base} ${REPORT_STYLES.badges.severity.low}`
      case 'non-compliant':
        return `${REPORT_STYLES.badges.base} ${REPORT_STYLES.badges.severity.high}`
      case 'partial':
        return `${REPORT_STYLES.badges.base} ${REPORT_STYLES.badges.severity.medium}`
      default:
        return 'border-gray-200 text-gray-700 bg-gray-50'
    }
  }

  return (
    <section className={REPORT_STYLES.layout.sectionContainer}>
      <h2 className={REPORT_STYLES.typography.sectionTitle}>Compliance & Governance</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Compliance Status */}
        <div>
          <h3 className={REPORT_STYLES.typography.subsectionTitle}>Compliance Status</h3>
          <div className="space-y-3">
            {data.compliance_status && data.compliance_status.map((item, index) => (
                              <div key={index} className={REPORT_STYLES.cards.base}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    {getComplianceIcon(item.status)}
                    <span className="font-medium text-gray-900 ml-2">{item.framework}</span>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${getComplianceClass(item.status)}`}
                  >
                    {item.status}
                  </Badge>
                </div>
                <p className="text-sm text-gray-700 mb-1">
                  <strong>Score:</strong> {item.score}%
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Last Assessment:</strong> {new Date(item.last_assessment).toLocaleDateString()}
                </p>
                {item.gaps && item.gaps.length > 0 && (
                  <div className="mt-2">
                    <span className="text-xs font-medium text-gray-600">Key Gaps:</span>
                    <ul className="text-xs text-gray-700 ml-4 mt-1">
                      {item.gaps.slice(0, 3).map((gap, gapIndex) => (
                        <li key={gapIndex} className="list-disc">{gap}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Governance Policies */}
        <div>
          <h3 className={REPORT_STYLES.typography.subsectionTitle}>Governance Policies</h3>
                      <div className={REPORT_STYLES.cards.base}>
            <div className="space-y-3">
              {data.governance_policies?.data_retention && (
              <div>
                <span className="text-sm font-medium text-gray-600">Data Retention:</span>
                <p className="text-sm text-gray-900">{data.governance_policies.data_retention}</p>
              </div>
              )}
              {data.governance_policies?.access_controls && (
              <div>
                <span className="text-sm font-medium text-gray-600">Access Controls:</span>
                <ul className="text-sm text-gray-900 ml-4">
                  {data.governance_policies.access_controls.map((control, index) => (
                    <li key={index} className="list-disc">{control}</li>
                  ))}
                </ul>
              </div>
              )}
              {data.governance_policies?.review_schedule && (
              <div>
                <span className="text-sm font-medium text-gray-600">Review Schedule:</span>
                <p className="text-sm text-gray-900">{data.governance_policies.review_schedule}</p>
              </div>
              )}
              {data.governance_policies?.approval_authority && (
              <div>
                <span className="text-sm font-medium text-gray-600">Approval Authority:</span>
                <p className="text-sm text-gray-900">{data.governance_policies.approval_authority}</p>
              </div>
              )}
            </div>
          </div>

          {/* Risk Assessments */}
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Recent Risk Assessments</h4>
            <div className="space-y-2">
              {data.risk_assessments && data.risk_assessments.slice(0, 3).map((assessment, index) => (
                <div key={index} className="text-sm border-l-2 border-gray-200 pl-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">{assessment.type}</span>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${REPORT_STYLES.badges.base} ${REPORT_STYLES.badges.severity[assessment.risk_level.toLowerCase() as keyof typeof REPORT_STYLES.badges.severity]}`}
                    >
                      {assessment.risk_level}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600">{new Date(assessment.date).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
} 