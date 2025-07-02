'use client';
import Link from "next/link"
import dynamic from "next/dynamic"
import { Chat } from "@/components/chat"
import ThreatDashboard from "@/components/threat-dashboard"
import { ShieldCheck, Bell } from "lucide-react"
import { ProfileDropdown } from "@/components/profile-dropdown"
import { usePathname } from "next/navigation"
import { useState } from "react"

// Dynamically import NetworkGraph to prevent SSR issues
const NetworkGraph = dynamic(() => import("@/components/network-graph").then(mod => ({ default: mod.NetworkGraph })), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-64 bg-zinc-900 rounded-lg border border-zinc-800"><p className="text-zinc-400">Loading network graph...</p></div>
})

export default function DashboardPage() {
  const pathname = usePathname();
  const [isChatExpanded, setIsChatExpanded] = useState(false);

  const toggleChatExpansion = () => {
    setIsChatExpanded(!isChatExpanded);
  };

  return (
    <main className="flex min-h-screen flex-col bg-gradient-to-br from-gray-950 via-purple-950/30 to-gray-900 text-zinc-100 relative">
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>

      <header className="border-b border-purple-500/20 bg-gray-950/80 backdrop-blur-xl px-3 sm:px-6 py-4 relative z-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="rounded-md bg-gradient-to-r from-purple-500 to-violet-500 p-1.5 shadow-lg shadow-purple-500/25">
              <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
              CyberSense AI
            </h1>
          </Link>
          
          {/* Responsive Navigation - Always visible with smaller text on mobile */}
          <nav className="flex items-center gap-2 sm:gap-4 md:gap-6">
            <span className="text-xs sm:text-sm font-medium text-purple-300">Dashboard</span>
            <Link
              href="/alerts"
              className={`text-xs sm:text-sm font-medium transition-colors ${pathname === "/alerts" ? "text-purple-300" : "text-zinc-300 hover:text-purple-300"}`}
            >
              Alerts
            </Link>
            <Link href="/reports" className="text-xs sm:text-sm font-medium text-zinc-300 hover:text-purple-300 transition-colors">
              Reports
            </Link>
            <Link
              href="/visualization"
              className="text-xs sm:text-sm font-medium text-zinc-300 hover:text-purple-300 transition-colors"
            >
              <span className="hidden sm:inline">Visualization</span>
              <span className="sm:hidden">Visual</span>
            </Link>
          </nav>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <button className="rounded-full bg-gray-800/50 backdrop-blur-sm p-2 text-zinc-400 hover:bg-gray-700/50 hover:text-zinc-100 border border-purple-500/20">
              <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            <ProfileDropdown />
          </div>
        </div>
      </header>

      {/* Responsive Layout: Stack on mobile, side-by-side on larger screens */}
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col lg:flex-row gap-3 sm:gap-6 p-3 sm:p-6 relative z-10">
        {/* Dashboard Section */}
        <div className={`flex ${isChatExpanded ? 'lg:w-1/2' : 'lg:w-2/3'} w-full flex-col gap-6 transition-all duration-300`}>
          <ThreatDashboard />
        </div>
        
        {/* Chat Section - Full width on mobile, partial on desktop */}
        <div className={`${isChatExpanded ? 'lg:w-1/2' : 'lg:w-1/3'} w-full transition-all duration-300`}>
          <Chat onToggleExpansion={toggleChatExpansion} isExpanded={isChatExpanded} />
        </div>
      </div>
    </main>
  )
}
