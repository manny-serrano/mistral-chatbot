"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { User, Settings, Bell, HelpCircle, LogOut } from "lucide-react"

interface ProfileDropdownProps {
  user?: {
    name: string
    email: string
    avatar?: string
    role: string
    plan: string
    lastActive: string
  }
}

export function ProfileDropdown({
  user = {
    name: "John Smith",
    email: "john.smith@company.com",
    avatar: "/placeholder.svg?height=40&width=40",
    role: "Security Analyst",
    plan: "Pro",
    lastActive: "2 minutes ago",
  },
}: ProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleSignOut = async () => {
    try {
      // Call the logout API to clear session
      await fetch('/api/auth/session', { method: 'DELETE' })
      console.log("Successfully signed out")
      // Redirect to login page
      window.location.href = "/login"
    } catch (error) {
      console.error('Logout failed:', error)
      // Fallback to redirect even if logout API fails
      window.location.href = "/login"
    }
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-10 w-10 rounded-full ring-2 ring-purple-500/20 hover:ring-purple-400/40 transition-all duration-200"
        >
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
            <AvatarFallback className="bg-gradient-to-r from-purple-600 to-violet-600 text-white font-medium">
              {user.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          {/* Online indicator */}
          <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 border-2 border-gray-950 rounded-full"></div>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-80 bg-gray-900/95 border-purple-500/30 backdrop-blur-xl shadow-2xl shadow-purple-500/20"
        align="end"
        sideOffset={8}
      >
        {/* User Info Header */}
        <div className="p-4 border-b border-purple-500/20">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
              <AvatarFallback className="bg-gradient-to-r from-purple-600 to-violet-600 text-white font-medium text-lg">
                {user.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-white font-medium truncate">{user.name}</p>
              </div>
              <p className="text-sm text-zinc-400 truncate">{user.email}</p>
              <p className="text-xs text-zinc-500">{user.role}</p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="p-2">
          <DropdownMenuItem asChild>
            <Link
              href="/profile"
              className="flex items-center gap-3 px-3 py-2 text-zinc-200 hover:text-white hover:bg-purple-500/20 rounded-lg cursor-pointer transition-colors"
            >
              <User className="h-4 w-4" />
              <div className="flex-1">
                <p className="font-medium">My Profile</p>
                <p className="text-xs text-zinc-400">View and edit your profile</p>
              </div>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link
              href="/settings"
              className="flex items-center gap-3 px-3 py-2 text-zinc-200 hover:text-white hover:bg-purple-500/20 rounded-lg cursor-pointer transition-colors"
            >
              <Settings className="h-4 w-4" />
              <div className="flex-1">
                <p className="font-medium">Settings</p>
                <p className="text-xs text-zinc-400">Preferences and configuration</p>
              </div>
            </Link>
          </DropdownMenuItem>
        </div>

        <DropdownMenuSeparator className="bg-purple-500/20" />

        {/* Notifications */}
        <div className="p-2">
          <DropdownMenuItem asChild>
            <Link
              href="/notifications"
              className="flex items-center gap-3 px-3 py-2 text-zinc-200 hover:text-white hover:bg-purple-500/20 rounded-lg cursor-pointer transition-colors"
            >
              <div className="relative">
                <Bell className="h-4 w-4" />
                <div className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full"></div>
              </div>
              <div className="flex-1">
                <p className="font-medium">Notifications</p>
                <p className="text-xs text-zinc-400">3 new alerts</p>
              </div>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link
              href="/help"
              className="flex items-center gap-3 px-3 py-2 text-zinc-200 hover:text-white hover:bg-purple-500/20 rounded-lg cursor-pointer transition-colors"
            >
              <HelpCircle className="h-4 w-4" />
              <div className="flex-1">
                <p className="font-medium">Help & Support</p>
                <p className="text-xs text-zinc-400">Get help and documentation</p>
              </div>
            </Link>
          </DropdownMenuItem>
        </div>

        <DropdownMenuSeparator className="bg-purple-500/20" />

        {/* Sign Out */}
        <div className="p-2">
          <DropdownMenuItem
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg cursor-pointer transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <div className="flex-1">
              <p className="font-medium">Sign Out</p>
              <p className="text-xs text-red-400/70">End your current session</p>
            </div>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
