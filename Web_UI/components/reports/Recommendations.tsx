import { Badge } from '@/components/ui/badge'
import { REPORT_STYLES } from '@/lib/report-styles'
import { RecommendationsAndNextSteps } from '@/lib/report-types'

interface RecommendationsProps {
  recommendations: RecommendationsAndNextSteps
}

export function Recommendations({ recommendations }: RecommendationsProps) {
  return (
    <section className={REPORT_STYLES.layout.sectionContainer}>
      <h2 className={REPORT_STYLES.typography.sectionTitle}>Recommendations</h2>
      
      <div className="space-y-4">
        {recommendations.prioritized_recommendations.map((rec, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4 print:break-inside-avoid">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-base font-semibold text-gray-900">{rec.category}</h3>
              <Badge 
                variant="outline" 
                className={`text-xs ${REPORT_STYLES.badges.base} ${REPORT_STYLES.badges.priority[rec.priority.toLowerCase() as keyof typeof REPORT_STYLES.badges.priority]}`}
              >
                {rec.priority}
              </Badge>
            </div>
            
            <p className="text-sm text-gray-700 mb-2">
              <strong>Finding:</strong> {rec.finding}
            </p>
            
            <p className="text-sm text-gray-700 mb-2">
              <strong>Recommendation:</strong> {rec.recommendation}
            </p>
            
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span><strong>Effort:</strong> {rec.estimated_effort}</span>
              <span><strong>Timeline:</strong> {rec.timeline}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
} 