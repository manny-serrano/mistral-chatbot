"use client"

import { Clock, Loader2, Zap } from "lucide-react"
import { Progress } from "./progress"

interface ReportProgressCardProps {
  reportId: string
  progress: number
  message: string
  trackingCount: number
  estimatedTime?: string
}

export function ReportProgressCard({ 
  reportId, 
  progress, 
  message, 
  trackingCount, 
  estimatedTime = "1-2 min" 
}: ReportProgressCardProps) {
  return (
    <div className="mb-6 p-6 bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-lg backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 bg-blue-400 rounded-full animate-pulse" />
            <Loader2 className="h-5 w-5 text-blue-300 animate-spin" />
          </div>
          <div>
            <h3 className="text-blue-300 font-semibold text-lg">
              {trackingCount === 1 
                ? 'Generating Security Report...' 
                : `Generating ${trackingCount} Reports...`
              }
            </h3>
            <p className="text-blue-400 text-sm">
              Real-time analysis in progress • No refresh needed
            </p>
          </div>
        </div>
        <div className="text-blue-300 text-sm flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span>Est. {estimatedTime}</span>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-blue-200 font-medium">{message}</span>
          <span className="text-blue-300 font-mono">{progress}%</span>
        </div>
        
        <Progress 
          value={progress} 
          className="h-3 bg-blue-950/40 border border-blue-500/20"
        />
        
        {/* Progress Segments Indicator */}
        <div className="flex justify-between text-xs text-blue-400/70 mt-2">
          <span className={progress >= 10 ? "text-blue-300" : ""}>Init</span>
          <span className={progress >= 25 ? "text-blue-300" : ""}>Scanning</span>
          <span className={progress >= 50 ? "text-blue-300" : ""}>Analysis</span>
          <span className={progress >= 75 ? "text-blue-300" : ""}>Threats</span>
          <span className={progress >= 100 ? "text-green-300" : ""}>Complete</span>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="flex items-center gap-3 mt-4 pt-3 border-t border-blue-500/20">
        <div className="flex items-center gap-2 text-xs text-blue-300">
          <Zap className="h-3 w-3" />
          <span>Real-time updates enabled</span>
        </div>
        <div className="text-xs text-blue-400">
          Report ID: {reportId.split('_')[2]?.substring(0, 8)}...
        </div>
      </div>
    </div>
  )
} 