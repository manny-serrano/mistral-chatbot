'use client';
import Link from "next/link"
import dynamic from "next/dynamic"
import { Chat } from "@/components/chat"
import ThreatDashboard from "@/components/threat-dashboard"
import { ShieldCheck } from "lucide-react"
import { ProfileDropdown } from "@/components/profile-dropdown"
import { NotificationBell } from "@/components/ui/notification-bell"
import { usePathname } from "next/navigation"
import { useState } from "react"

// Dynamically import NetworkGraph to prevent SSR issues
const CustomNetworkGraph = dynamic(() => import("@/components/custom-network-graph").then(mod => ({ default: mod.CustomNetworkGraph })), {
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
    <main className="flex min-h-screen flex-col bg-gradient-to-br from-black via-purple-950/40 to-gray-950 text-zinc-100 relative">
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-gray-950/90 via-purple-950/50 to-gray-950/90" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/40 via-transparent to-transparent" />
      <header className="border-b border-purple-500/20 bg-black/80 backdrop-blur-xl px-3 sm:px-6 py-4 relative z-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="rounded-md bg-gradient-to-r from-purple-500 to-violet-500 p-1.5 shadow-lg shadow-purple-500/25">
              <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
              LEVANT AI
            </h1>
          </Link>
          
          {/* Centered Navigation */}
          <div className="absolute left-1/2 transform -translate-x-1/2">
            <nav className="flex items-center gap-2 sm:gap-4 md:gap-6">
              <span className="text-xs sm:text-sm font-medium text-purple-300">Dashboard</span>
              <Link
                href="/chat"
                className="text-xs sm:text-sm font-medium text-zinc-300 hover:text-purple-300 transition-colors"
              >
                Chat
              </Link>
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
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <NotificationBell />
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
