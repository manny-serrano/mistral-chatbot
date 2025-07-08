"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Shield,
  Key,
  Smartphone,
  AlertTriangle,
  CheckCircle,
  Eye,
  EyeOff,
  Fingerprint,
  Lock,
  Globe,
  Monitor,
  Clock,
  MapPin,
} from "lucide-react"

export default function SecurityPage() {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true)
  const [loginNotifications, setLoginNotifications] = useState(true)
  const [securityAlerts, setSecurityAlerts] = useState(true)
  const [deviceTracking, setDeviceTracking] = useState(true)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-purple-950">
      {/* Header */}
      <div className="border-b border-purple-500/20 bg-gray-900/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <Shield className="h-8 w-8 text-purple-400" />
                <span className="text-xl font-bold text-white">LEVANT AI</span>
              </Link>
              <div className="text-zinc-400">/</div>
              <h1 className="text-lg font-semibold text-white">Security Center</h1>
            </div>
            <Badge className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-300 border-green-500/30">
              <CheckCircle className="h-3 w-3 mr-1" />
              Secure
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Security Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gray-900/50 border-green-500/30 backdrop-blur-xl">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <Shield className="h-6 w-6 text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Security Score</p>
                  <p className="text-2xl font-bold text-white">98%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-blue-500/30 backdrop-blur-xl">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Key className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Active Sessions</p>
                  <p className="text-2xl font-bold text-white">3</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-yellow-500/30 backdrop-blur-xl">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Security Alerts</p>
                  <p className="text-2xl font-bold text-white">2</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-purple-500/30 backdrop-blur-xl">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <Smartphone className="h-6 w-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Trusted Devices</p>
                  <p className="text-2xl font-bold text-white">5</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="password" className="space-y-6">
          <TabsList className="bg-gray-900/50 border border-purple-500/30">
            <TabsTrigger value="password" className="data-[state=active]:bg-purple-600">
              Password & Auth
            </TabsTrigger>
            <TabsTrigger value="devices" className="data-[state=active]:bg-purple-600">
              Devices & Sessions
            </TabsTrigger>
            <TabsTrigger value="notifications" className="data-[state=active]:bg-purple-600">
              Security Alerts
            </TabsTrigger>
            <TabsTrigger value="privacy" className="data-[state=active]:bg-purple-600">
              Privacy Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="password">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Change Password */}
              <Card className="bg-gray-900/50 border-purple-500/30 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    Change Password
                  </CardTitle>
                  <CardDescription className="text-zinc-400">
                    Update your password to keep your account secure
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-password" className="text-zinc-300">
                      Current Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="current-password"
                        type={showCurrentPassword ? "text" : "password"}
                        className="bg-gray-800/50 border-purple-500/30 text-white pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="h-4 w-4 text-zinc-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-zinc-400" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-password" className="text-zinc-300">
                      New Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showNewPassword ? "text" : "password"}
                        className="bg-gray-800/50 border-purple-500/30 text-white pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-4 w-4 text-zinc-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-zinc-400" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password" className="text-zinc-300">
                      Confirm New Password
                    </Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      className="bg-gray-800/50 border-purple-500/30 text-white"
                    />
                  </div>

                  <Button className="w-full bg-purple-600 hover:bg-purple-700">Update Password</Button>
                </CardContent>
              </Card>

              {/* Two-Factor Authentication */}
              <Card className="bg-gray-900/50 border-purple-500/30 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Fingerprint className="h-5 w-5" />
                    Two-Factor Authentication
                  </CardTitle>
                  <CardDescription className="text-zinc-400">
                    Add an extra layer of security to your account
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-white font-medium">Enable 2FA</p>
                      <p className="text-sm text-zinc-400">Require a code from your phone to sign in</p>
                    </div>
                    <Switch checked={twoFactorEnabled} onCheckedChange={setTwoFactorEnabled} />
                  </div>

                  {twoFactorEnabled && (
                    <div className="space-y-4 p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-400" />
                        <p className="text-green-300 font-medium">2FA is enabled</p>
                      </div>
                      <p className="text-sm text-zinc-400">
                        Your account is protected with two-factor authentication using your mobile device.
                      </p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          View Recovery Codes
                        </Button>
                        <Button variant="outline" size="sm">
                          Reconfigure
                        </Button>
                      </div>
                    </div>
                  )}

                  {!twoFactorEnabled && <Button className="w-full bg-green-600 hover:bg-green-700">Set Up 2FA</Button>}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="devices">
            <Card className="bg-gray-900/50 border-purple-500/30 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-white">Active Sessions & Devices</CardTitle>
                <CardDescription className="text-zinc-400">
                  Manage your active sessions and trusted devices
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    {
                      device: "MacBook Pro",
                      location: "San Francisco, CA",
                      ip: "192.168.1.100",
                      lastActive: "Active now",
                      current: true,
                      browser: "Chrome",
                    },
                    {
                      device: "iPhone 14 Pro",
                      location: "San Francisco, CA",
                      ip: "192.168.1.101",
                      lastActive: "2 hours ago",
                      current: false,
                      browser: "Safari",
                    },
                    {
                      device: "Windows Desktop",
                      location: "New York, NY",
                      ip: "10.0.0.50",
                      lastActive: "1 day ago",
                      current: false,
                      browser: "Edge",
                    },
                  ].map((session, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg border border-purple-500/20"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                          <Monitor className="h-6 w-6 text-purple-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-white font-medium">{session.device}</p>
                            {session.current && (
                              <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-xs">
                                Current
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-zinc-400">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {session.location}
                            </span>
                            <span className="flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              {session.ip}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {session.lastActive}
                            </span>
                          </div>
                        </div>
                      </div>
                      {!session.current && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-400 border-red-500/30 hover:bg-red-500/20 bg-transparent"
                        >
                          Revoke
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card className="bg-gray-900/50 border-purple-500/30 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-white">Security Notifications</CardTitle>
                <CardDescription className="text-zinc-400">
                  Configure how you receive security alerts and notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-white font-medium">Login Notifications</p>
                    <p className="text-sm text-zinc-400">Get notified when someone signs into your account</p>
                  </div>
                  <Switch checked={loginNotifications} onCheckedChange={setLoginNotifications} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-white font-medium">Security Alerts</p>
                    <p className="text-sm text-zinc-400">Receive alerts about suspicious activity</p>
                  </div>
                  <Switch checked={securityAlerts} onCheckedChange={setSecurityAlerts} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-white font-medium">Device Tracking</p>
                    <p className="text-sm text-zinc-400">Track new device logins and locations</p>
                  </div>
                  <Switch checked={deviceTracking} onCheckedChange={setDeviceTracking} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="privacy">
            <Card className="bg-gray-900/50 border-purple-500/30 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-white">Privacy Settings</CardTitle>
                <CardDescription className="text-zinc-400">
                  Control your privacy and data sharing preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-white font-medium">Data Analytics</p>
                      <p className="text-sm text-zinc-400">Allow anonymous usage analytics to improve our service</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-white font-medium">Marketing Communications</p>
                      <p className="text-sm text-zinc-400">Receive product updates and security tips</p>
                    </div>
                    <Switch />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-white font-medium">Third-party Integrations</p>
                      <p className="text-sm text-zinc-400">Allow integrations with external security tools</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>

                <div className="pt-4 border-t border-purple-500/20">
                  <div className="flex gap-4">
                    <Button variant="outline">Download My Data</Button>
                    <Button
                      variant="outline"
                      className="text-red-400 border-red-500/30 hover:bg-red-500/20 bg-transparent"
                    >
                      Delete Account
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer */}
      <footer className="border-t border-purple-500/20 bg-gray-900/50 backdrop-blur-xl mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-zinc-400">© 2025 LEVANT AI. Built for cybersecurity professionals.</p>
        </div>
      </footer>
    </div>
  )
}
