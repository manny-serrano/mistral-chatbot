"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Shield,
  Bell,
  AlertTriangle,
  CheckCircle,
  Info,
  X,
  Settings,
  Mail,
  Smartphone,
  Clock,
  Filter,
  BookMarkedIcon as MarkAsRead,
} from "lucide-react"

interface Notification {
  id: string
  type: "security" | "system" | "billing" | "update"
  title: string
  message: string
  timestamp: string
  read: boolean
  priority: "high" | "medium" | "low"
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "1",
      type: "security",
      title: "Critical Security Alert",
      message: "Suspicious login attempt detected from unknown location (IP: 192.168.1.100)",
      timestamp: "2 minutes ago",
      read: false,
      priority: "high",
    },
    {
      id: "2",
      type: "security",
      title: "Malware Blocked",
      message: "Successfully blocked malware attempt on endpoint DESKTOP-ABC123",
      timestamp: "15 minutes ago",
      read: false,
      priority: "medium",
    },
    {
      id: "3",
      type: "system",
      title: "System Maintenance",
      message: "Scheduled maintenance will occur tonight from 2:00 AM to 4:00 AM EST",
      timestamp: "1 hour ago",
      read: true,
      priority: "low",
    },
    {
      id: "4",
      type: "billing",
      title: "Usage Alert",
      message: "You've reached 75% of your monthly API request limit",
      timestamp: "3 hours ago",
      read: false,
      priority: "medium",
    },
    {
      id: "5",
      type: "update",
      title: "New Feature Available",
      message: "Advanced threat correlation is now available in your dashboard",
      timestamp: "1 day ago",
      read: true,
      priority: "low",
    },
  ])

  const [emailNotifications, setEmailNotifications] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(true)
  const [securityAlerts, setSecurityAlerts] = useState(true)
  const [systemUpdates, setSystemUpdates] = useState(false)

  const markAsRead = (id: string) => {
    setNotifications((prev) => prev.map((notif) => (notif.id === id ? { ...notif, read: true } : notif)))
  }

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })))
  }

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((notif) => notif.id !== id))
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "security":
        return <AlertTriangle className="h-5 w-5 text-red-400" />
      case "system":
        return <Settings className="h-5 w-5 text-blue-400" />
      case "billing":
        return <Info className="h-5 w-5 text-yellow-400" />
      case "update":
        return <CheckCircle className="h-5 w-5 text-green-400" />
      default:
        return <Bell className="h-5 w-5 text-gray-400" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-500/20 text-red-300 border-red-500/30"
      case "medium":
        return "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
      case "low":
        return "bg-green-500/20 text-green-300 border-green-500/30"
      default:
        return "bg-gray-500/20 text-gray-300 border-gray-500/30"
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-purple-950">
      {/* Header */}
      <div className="border-b border-purple-500/20 bg-gray-900/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <Shield className="h-8 w-8 text-purple-400" />
                <span className="text-xl font-bold text-white">CyberSense AI</span>
              </Link>
              <div className="text-zinc-400">/</div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-white">Notifications</h1>
                {unreadCount > 0 && (
                  <Badge className="bg-red-500/20 text-red-300 border-red-500/30">{unreadCount} new</Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={markAllAsRead}>
                <MarkAsRead className="h-4 w-4 mr-2" />
                Mark All Read
              </Button>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="bg-gray-900/50 border border-purple-500/30">
            <TabsTrigger value="all" className="data-[state=active]:bg-purple-600">
              All Notifications
            </TabsTrigger>
            <TabsTrigger value="unread" className="data-[state=active]:bg-purple-600">
              Unread ({unreadCount})
            </TabsTrigger>
            <TabsTrigger value="security" className="data-[state=active]:bg-purple-600">
              Security
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-purple-600">
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <Card className="bg-gray-900/50 border-purple-500/30 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-white">All Notifications</CardTitle>
                <CardDescription className="text-zinc-400">Your complete notification history</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 rounded-lg border transition-all ${
                        notification.read
                          ? "bg-gray-800/30 border-purple-500/20"
                          : "bg-purple-500/10 border-purple-500/30"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="mt-1">{getNotificationIcon(notification.type)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className={`font-medium ${notification.read ? "text-zinc-300" : "text-white"}`}>
                                {notification.title}
                              </h3>
                              <Badge className={getPriorityColor(notification.priority)}>{notification.priority}</Badge>
                              {!notification.read && <div className="h-2 w-2 bg-purple-400 rounded-full"></div>}
                            </div>
                            <p className={`text-sm ${notification.read ? "text-zinc-500" : "text-zinc-400"}`}>
                              {notification.message}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Clock className="h-3 w-3 text-zinc-500" />
                              <span className="text-xs text-zinc-500">{notification.timestamp}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsRead(notification.id)}
                              className="text-purple-400 hover:text-purple-300"
                            >
                              Mark Read
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteNotification(notification.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="unread">
            <Card className="bg-gray-900/50 border-purple-500/30 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-white">Unread Notifications</CardTitle>
                <CardDescription className="text-zinc-400">Notifications that require your attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {notifications
                    .filter((n) => !n.read)
                    .map((notification) => (
                      <div
                        key={notification.id}
                        className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/30"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="mt-1">{getNotificationIcon(notification.type)}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-medium text-white">{notification.title}</h3>
                                <Badge className={getPriorityColor(notification.priority)}>
                                  {notification.priority}
                                </Badge>
                                <div className="h-2 w-2 bg-purple-400 rounded-full"></div>
                              </div>
                              <p className="text-sm text-zinc-400">{notification.message}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <Clock className="h-3 w-3 text-zinc-500" />
                                <span className="text-xs text-zinc-500">{notification.timestamp}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsRead(notification.id)}
                              className="text-purple-400 hover:text-purple-300"
                            >
                              Mark Read
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteNotification(notification.id)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  {notifications.filter((n) => !n.read).length === 0 && (
                    <div className="text-center py-12">
                      <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
                      <p className="text-white font-medium">All caught up!</p>
                      <p className="text-zinc-400 text-sm mt-2">You have no unread notifications.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card className="bg-gray-900/50 border-purple-500/30 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-white">Security Notifications</CardTitle>
                <CardDescription className="text-zinc-400">Security alerts and threat notifications</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {notifications
                    .filter((n) => n.type === "security")
                    .map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 rounded-lg border transition-all ${
                          notification.read ? "bg-gray-800/30 border-purple-500/20" : "bg-red-500/10 border-red-500/30"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="mt-1">
                              <AlertTriangle className="h-5 w-5 text-red-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className={`font-medium ${notification.read ? "text-zinc-300" : "text-white"}`}>
                                  {notification.title}
                                </h3>
                                <Badge className={getPriorityColor(notification.priority)}>
                                  {notification.priority}
                                </Badge>
                                {!notification.read && <div className="h-2 w-2 bg-red-400 rounded-full"></div>}
                              </div>
                              <p className={`text-sm ${notification.read ? "text-zinc-500" : "text-zinc-400"}`}>
                                {notification.message}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <Clock className="h-3 w-3 text-zinc-500" />
                                <span className="text-xs text-zinc-500">{notification.timestamp}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            {!notification.read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => markAsRead(notification.id)}
                                className="text-purple-400 hover:text-purple-300"
                              >
                                Mark Read
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteNotification(notification.id)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card className="bg-gray-900/50 border-purple-500/30 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-white">Notification Settings</CardTitle>
                <CardDescription className="text-zinc-400">
                  Configure how and when you receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-zinc-400" />
                        <p className="text-white font-medium">Email Notifications</p>
                      </div>
                      <p className="text-sm text-zinc-400">Receive notifications via email</p>
                    </div>
                    <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-zinc-400" />
                        <p className="text-white font-medium">Push Notifications</p>
                      </div>
                      <p className="text-sm text-zinc-400">Receive push notifications on your devices</p>
                    </div>
                    <Switch checked={pushNotifications} onCheckedChange={setPushNotifications} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-zinc-400" />
                        <p className="text-white font-medium">Security Alerts</p>
                      </div>
                      <p className="text-sm text-zinc-400">Get notified about security threats and incidents</p>
                    </div>
                    <Switch checked={securityAlerts} onCheckedChange={setSecurityAlerts} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Settings className="h-4 w-4 text-zinc-400" />
                        <p className="text-white font-medium">System Updates</p>
                      </div>
                      <p className="text-sm text-zinc-400">
                        Receive notifications about system maintenance and updates
                      </p>
                    </div>
                    <Switch checked={systemUpdates} onCheckedChange={setSystemUpdates} />
                  </div>
                </div>

                <div className="pt-4 border-t border-purple-500/20">
                  <Button className="bg-purple-600 hover:bg-purple-700">Save Settings</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer */}
      <footer className="border-t border-purple-500/20 bg-gray-900/50 backdrop-blur-xl mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-zinc-400">© 2025 CyberSense AI. Built for cybersecurity professionals.</p>
        </div>
      </footer>
    </div>
  )
}
