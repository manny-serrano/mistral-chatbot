import React from 'react'
import { Brain, Target, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { REPORT_STYLES } from '@/lib/report-styles'
import { AIAnalysis as AIAnalysisType } from '@/lib/report-types'

interface AIAnalysisProps {
  analysis: AIAnalysisType[]
}

export function AIAnalysis({ analysis }: AIAnalysisProps) {
  const getConfidenceClass = (score: number) => {
    if (score >= 0.8) return `${REPORT_STYLES.badges.base} ${REPORT_STYLES.badges.severity.high}`
    if (score >= 0.6) return `${REPORT_STYLES.badges.base} ${REPORT_STYLES.badges.severity.medium}`
    return `${REPORT_STYLES.badges.base} ${REPORT_STYLES.badges.severity.low}`
  }

  return (
    <section className={REPORT_STYLES.layout.sectionContainer}>
      <h2 className={REPORT_STYLES.typography.sectionTitle}>AI Security Analysis</h2>
      
      <div className="space-y-4">
        {analysis.map((item, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4 print:break-inside-avoid">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center">
                <Brain className="h-5 w-5 text-blue-600 mr-2" />
                <span className="text-xs text-gray-500">MITRE ATT&CK: {item.attack_technique}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge 
                  variant="outline" 
                  className={`text-xs ${getConfidenceClass(item.confidence_score)}`}
                >
                  {Math.round(item.confidence_score * 100)}% Confidence
                </Badge>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-1 flex items-center">
                  <Target className="h-4 w-4 text-gray-600 mr-1" />
                  Finding
                </h4>
                <p className="text-sm text-gray-700 ml-5">{item.finding}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-1">Business Impact</h4>
                <p className="text-sm text-gray-700">{item.business_impact}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-1">Recommended Action</h4>
                <p className="text-sm text-gray-700">{item.recommended_action}</p>
              </div>
              
              <div className="flex items-center text-xs text-gray-500 pt-2 border-t border-gray-100">
                <Clock className="h-3 w-3 mr-1" />
                <strong>Timeline:</strong> 
                <span className="ml-1">{item.timeline}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
} 