"use client"

import Link from "next/link"
import { Bell } from "lucide-react"

export function NotificationBell() {
  return (
    <Link 
      href="/notifications" 
      className="rounded-full bg-gray-800/50 backdrop-blur-sm p-2 text-zinc-400 hover:bg-gray-700/50 hover:text-zinc-100 border border-purple-500/20 transition-colors"
      title="View Notifications"
    >
      <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
    </Link>
  )
} 