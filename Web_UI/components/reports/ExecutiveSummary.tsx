import React from 'react'
import { Shield, AlertTriangle, TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { REPORT_STYLES } from '@/lib/report-styles'
import { ExecutiveSummary as ExecutiveSummaryType } from '@/lib/report-types'

interface ExecutiveSummaryProps {
  summary: ExecutiveSummaryType
}

export function ExecutiveSummary({ summary }: ExecutiveSummaryProps) {
  return (
    <section className={REPORT_STYLES.layout.sectionContainer}>
      <h2 className={REPORT_STYLES.typography.sectionTitle}>Executive Summary</h2>
      
      <div className={REPORT_STYLES.grids.executive}>
        <div className={REPORT_STYLES.cards.base}>
          <div className="flex items-center mb-2">
            <Shield className="h-5 w-5 text-gray-600 mr-2" />
            <span className="text-sm font-medium text-gray-600">Risk Level</span>
          </div>
          <Badge 
            variant="outline"
            className={`${REPORT_STYLES.badges.base} ${REPORT_STYLES.badges.severity[summary.overall_risk_level.toLowerCase() as keyof typeof REPORT_STYLES.badges.severity]}`}
          >
            {summary.overall_risk_level}
          </Badge>
        </div>
        
        <div className={REPORT_STYLES.cards.base}>
          <div className="flex items-center mb-2">
            <AlertTriangle className="h-5 w-5 text-gray-600 mr-2" />
            <span className="text-sm font-medium text-gray-600">Critical Issues</span>
          </div>
          <span className="text-2xl font-bold text-gray-900">
            {summary.critical_issues_count}
          </span>
        </div>
        
        <div className={REPORT_STYLES.cards.base}>
          <div className="flex items-center mb-2">
            <TrendingUp className="h-5 w-5 text-gray-600 mr-2" />
            <span className="text-sm font-medium text-gray-600">Priority</span>
          </div>
          <Badge variant="outline" className="text-sm">
            {summary.recommendations_priority}
          </Badge>
        </div>
      </div>

      <h3 className={REPORT_STYLES.typography.subsectionTitle}>Key Findings</h3>
      <ul className="space-y-2">
        {summary.key_findings.map((finding, index) => (
          <li key={index} className="flex items-start">
            <span className="w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
            <span className="text-gray-700">{finding}</span>
          </li>
        ))}
      </ul>
    </section>
  )
} 