import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Alert types shared between alerts page and dashboard
export interface ApiAlert {
  type: string
  ip: string
  date: string
  unique_ports: number
  pcr: number
  por: number
  p_value: number
  severity: "critical" | "high" | "medium" | "low"
  message: string
}

export interface AlertUI {
  id: string
  severity: "critical" | "high" | "medium" | "low"
  type: string
  title: string
  description: string
  timestamp: string
  timeValue: number
  source: string
  destination: string
  status: string
  assignee: string
  tags: string[]
  affectedAssets: number
  confidence: number
  location: string
  firstSeen: string
  lastSeen: string
  riskScore: number
}
