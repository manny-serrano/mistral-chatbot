'use client';
import Link from "next/link"
import dynamic from "next/dynamic"
import { Chat } from "@/components/chat"
import ThreatDashboard from "@/components/threat-dashboard"
import { ShieldCheck, Bell } from "lucide-react"
import { ProfileDropdown } from "@/components/profile-dropdown"

// Dynamically import NetworkGraph to prevent SSR issues
const NetworkGraph = dynamic(() => import("@/components/network-graph").then(mod => ({ default: mod.NetworkGraph })), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-64 bg-zinc-900 rounded-lg border border-zinc-800"><p className="text-zinc-400">Loading network graph...</p></div>
})

export default function DashboardPage() {
  return (
    <main className="flex min-h-screen flex-col bg-gradient-to-br from-gray-950 via-purple-950/30 to-gray-900 text-zinc-100 relative">
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>

      <header className="border-b border-purple-500/20 bg-gray-950/80 backdrop-blur-xl px-6 py-4 relative z-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="rounded-md bg-gradient-to-r from-purple-500 to-violet-500 p-1.5 shadow-lg shadow-purple-500/25">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
              CyberSense AI
            </h1>
          </Link>
          <nav className="flex items-center gap-6">
            <span className="text-sm font-medium text-purple-300">Dashboard</span>
            <Link href="/alerts" className="text-sm font-medium text-zinc-300 hover:text-purple-300 transition-colors">
              Alerts
            </Link>
            <Link href="/reports" className="text-sm font-medium text-zinc-300 hover:text-purple-300 transition-colors">
              Reports
            </Link>
            <Link
              href="/visualization"
              className="text-sm font-medium text-zinc-300 hover:text-purple-300 transition-colors"
            >
              Visualization
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <button className="rounded-full bg-gray-800/50 backdrop-blur-sm p-2 text-zinc-400 hover:bg-gray-700/50 hover:text-zinc-100 border border-purple-500/20">
              <Bell className="h-5 w-5" />
            </button>
            <ProfileDropdown />
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 p-6 relative z-10">
        <div className="flex w-2/3 flex-col gap-6">
          <ThreatDashboard />
        </div>
        <div className="w-1/3">
          <Chat />
        </div>
      </div>
    </main>
  )
}
