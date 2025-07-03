"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  ShieldCheck,
  User,
  Bell,
  Shield,
  Palette,
  Download,
  Upload,
  Trash2,
  Eye,
  EyeOff,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Mail,
  Smartphone,
  Lock,
  Monitor,
  Moon,
  Sun,
  Zap,
} from "lucide-react"
import { ProfileDropdown } from "@/components/profile-dropdown"

export default function SettingsPage() {
  const [showApiKey, setShowApiKey] = useState(false)
  const [settings, setSettings] = useState({
    // Profile
    firstName: "John",
    lastName: "Smith",
    email: "john.smith@company.com",
    company: "Acme Corp",
    jobTitle: "Security Analyst",
    bio: "Cybersecurity professional with 8+ years of experience in threat detection and incident response.",

    // Notifications
    emailNotifications: true,
    pushNotifications: true,
    securityAlerts: true,
    weeklyReports: true,
    productUpdates: false,
    marketingEmails: false,

    // Security
    twoFactorAuth: true,
    sessionTimeout: "30",
    loginNotifications: true,
    apiAccess: true,

    // Appearance
    theme: "dark",
    language: "en",
    timezone: "UTC-8",
    dateFormat: "MM/DD/YYYY",

    // Privacy
    dataSharing: false,
    analytics: true,
    crashReports: true,
  })

  const handleSettingChange = (key: string, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = () => {
    // Save settings logic here
    console.log("Saving settings:", settings)
  }

  const handleExportData = () => {
    // Export data logic here
    console.log("Exporting user data...")
  }

  const handleDeleteAccount = () => {
    // Delete account logic here
    console.log("Deleting account...")
  }

  return (
    <main className="flex min-h-screen flex-col bg-gradient-to-br from-black via-purple-950/40 to-gray-950 text-zinc-100 relative">
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>

      <header className="border-b border-purple-500/20 bg-black/80 backdrop-blur-xl sticky top-0 z-50 relative">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="rounded-md bg-gradient-to-r from-purple-500 to-violet-500 p-1.5 shadow-lg shadow-purple-500/25">
                <ShieldCheck className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                CyberSense AI
              </h1>
            </Link>

            {/* Centered Navigation */}
            <div className="absolute left-1/2 transform -translate-x-1/2">
              <nav className="hidden md:flex items-center gap-6">
                <Link href="/" className="text-sm font-medium text-zinc-300 hover:text-purple-300 transition-colors">
                  Home
                </Link>
                <Link
                  href="/dashboard"
                  className="text-sm font-medium text-zinc-300 hover:text-purple-300 transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/chat"
                  className="text-sm font-medium text-zinc-300 hover:text-purple-300 transition-colors"
                >
                  Chat
                </Link>
                <Link
                  href="/alerts"
                  className="text-sm font-medium text-zinc-300 hover:text-purple-300 transition-colors"
                >
                  Alerts
                </Link>
                <Link
                  href="/reports"
                  className="text-sm font-medium text-zinc-300 hover:text-purple-300 transition-colors"
                >
                  Reports
                </Link>
                <Link
                  href="/visualization"
                  className="text-sm font-medium text-zinc-300 hover:text-purple-300 transition-colors"
                >
                  Visualization
                </Link>
              </nav>
            </div>

            <ProfileDropdown />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative py-8">
        {/* Enhanced background for better contrast */}
        <div className="absolute inset-0 bg-gradient-to-r from-gray-950/90 via-purple-950/50 to-gray-950/90" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/40 via-transparent to-transparent" />

        <div className="relative mx-auto max-w-7xl px-6">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-purple-500/20 p-3 border border-purple-400/30 backdrop-blur-sm">
                  <User className="h-6 w-6 text-purple-300" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-white">Settings</h1>
                  <p className="text-lg text-zinc-200 mt-1">Manage your account preferences and security settings</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  className="border-purple-400/40 text-zinc-200 hover:bg-purple-900/40 bg-transparent backdrop-blur-sm"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
                <Button
                  onClick={handleSave}
                  className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>
          </div>

          {/* Settings Tabs */}
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-6 bg-gray-900/80 border border-purple-500/20 backdrop-blur-xl">
              <TabsTrigger value="profile" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                <User className="h-4 w-4 mr-2" />
                Profile
              </TabsTrigger>
              <TabsTrigger
                value="notifications"
                className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
              >
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </TabsTrigger>
              <TabsTrigger
                value="security"
                className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
              >
                <Shield className="h-4 w-4 mr-2" />
                Security
              </TabsTrigger>
              <TabsTrigger
                value="appearance"
                className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
              >
                <Palette className="h-4 w-4 mr-2" />
                Appearance
              </TabsTrigger>
              <TabsTrigger value="privacy" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                <Eye className="h-4 w-4 mr-2" />
                Privacy
              </TabsTrigger>
              <TabsTrigger
                value="advanced"
                className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
              >
                <Zap className="h-4 w-4 mr-2" />
                Advanced
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <Card className="bg-gray-900/80 border-purple-400/40 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-xl text-white">Profile Information</CardTitle>
                  <CardDescription className="text-zinc-300">
                    Update your personal information and professional details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-r from-purple-500 to-violet-500 flex items-center justify-center text-white text-2xl font-bold">
                        {settings.firstName[0]}
                        {settings.lastName[0]}
                      </div>
                      <Button
                        size="sm"
                        className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0 bg-purple-600 hover:bg-purple-700"
                      >
                        <Upload className="h-4 w-4" />
                      </Button>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-white">
                        {settings.firstName} {settings.lastName}
                      </h3>
                      <p className="text-sm text-zinc-400">
                        {settings.jobTitle} at {settings.company}
                      </p>
                      <Badge className="mt-1 bg-purple-500/20 text-purple-300 border-purple-500/30">Pro Plan</Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-white">First Name</Label>
                      <Input
                        value={settings.firstName}
                        onChange={(e) => handleSettingChange("firstName", e.target.value)}
                        className="bg-gray-800/50 border-purple-400/30 text-white focus:border-purple-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white">Last Name</Label>
                      <Input
                        value={settings.lastName}
                        onChange={(e) => handleSettingChange("lastName", e.target.value)}
                        className="bg-gray-800/50 border-purple-400/30 text-white focus:border-purple-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white">Email</Label>
                      <Input
                        value={settings.email}
                        onChange={(e) => handleSettingChange("email", e.target.value)}
                        className="bg-gray-800/50 border-purple-400/30 text-white focus:border-purple-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white">Company</Label>
                      <Input
                        value={settings.company}
                        onChange={(e) => handleSettingChange("company", e.target.value)}
                        className="bg-gray-800/50 border-purple-400/30 text-white focus:border-purple-400"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-white">Job Title</Label>
                      <Input
                        value={settings.jobTitle}
                        onChange={(e) => handleSettingChange("jobTitle", e.target.value)}
                        className="bg-gray-800/50 border-purple-400/30 text-white focus:border-purple-400"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-white">Bio</Label>
                      <Textarea
                        value={settings.bio}
                        onChange={(e) => handleSettingChange("bio", e.target.value)}
                        className="bg-gray-800/50 border-purple-400/30 text-white focus:border-purple-400 min-h-[100px]"
                        placeholder="Tell us about yourself..."
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-6">
              <Card className="bg-gray-900/80 border-purple-400/40 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-xl text-white">Notification Preferences</CardTitle>
                  <CardDescription className="text-zinc-300">
                    Choose how you want to be notified about important events
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-white">Security Notifications</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="h-5 w-5 text-red-400" />
                          <div>
                            <p className="font-medium text-white">Security Alerts</p>
                            <p className="text-sm text-zinc-400">Critical security events and threats</p>
                          </div>
                        </div>
                        <Switch
                          checked={settings.securityAlerts}
                          onCheckedChange={(checked) => handleSettingChange("securityAlerts", checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Mail className="h-5 w-5 text-blue-400" />
                          <div>
                            <p className="font-medium text-white">Email Notifications</p>
                            <p className="text-sm text-zinc-400">Receive notifications via email</p>
                          </div>
                        </div>
                        <Switch
                          checked={settings.emailNotifications}
                          onCheckedChange={(checked) => handleSettingChange("emailNotifications", checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Smartphone className="h-5 w-5 text-green-400" />
                          <div>
                            <p className="font-medium text-white">Push Notifications</p>
                            <p className="text-sm text-zinc-400">Browser and mobile push notifications</p>
                          </div>
                        </div>
                        <Switch
                          checked={settings.pushNotifications}
                          onCheckedChange={(checked) => handleSettingChange("pushNotifications", checked)}
                        />
                      </div>
                    </div>
                  </div>

                  <Separator className="bg-purple-500/20" />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-white">Reports & Updates</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-white">Weekly Reports</p>
                          <p className="text-sm text-zinc-400">Summary of security events and metrics</p>
                        </div>
                        <Switch
                          checked={settings.weeklyReports}
                          onCheckedChange={(checked) => handleSettingChange("weeklyReports", checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-white">Product Updates</p>
                          <p className="text-sm text-zinc-400">New features and improvements</p>
                        </div>
                        <Switch
                          checked={settings.productUpdates}
                          onCheckedChange={(checked) => handleSettingChange("productUpdates", checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-white">Marketing Emails</p>
                          <p className="text-sm text-zinc-400">Promotional content and newsletters</p>
                        </div>
                        <Switch
                          checked={settings.marketingEmails}
                          onCheckedChange={(checked) => handleSettingChange("marketingEmails", checked)}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-6">
              <Card className="bg-gray-900/80 border-purple-400/40 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-xl text-white">Security Settings</CardTitle>
                  <CardDescription className="text-zinc-300">
                    Manage your account security and authentication methods
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-green-400" />
                        <div>
                          <p className="font-medium text-white">Two-Factor Authentication</p>
                          <p className="text-sm text-green-300">Your account is protected with 2FA</p>
                        </div>
                      </div>
                      <Switch
                        checked={settings.twoFactorAuth}
                        onCheckedChange={(checked) => handleSettingChange("twoFactorAuth", checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-white">Login Notifications</p>
                        <p className="text-sm text-zinc-400">Get notified of new login attempts</p>
                      </div>
                      <Switch
                        checked={settings.loginNotifications}
                        onCheckedChange={(checked) => handleSettingChange("loginNotifications", checked)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-white">Session Timeout</Label>
                      <Select
                        value={settings.sessionTimeout}
                        onValueChange={(value) => handleSettingChange("sessionTimeout", value)}
                      >
                        <SelectTrigger className="bg-gray-800/50 border-purple-400/30 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-purple-400/30">
                          <SelectItem value="15">15 minutes</SelectItem>
                          <SelectItem value="30">30 minutes</SelectItem>
                          <SelectItem value="60">1 hour</SelectItem>
                          <SelectItem value="240">4 hours</SelectItem>
                          <SelectItem value="never">Never</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator className="bg-purple-500/20" />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-white">API Access</h3>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-white">API Key Access</p>
                        <p className="text-sm text-zinc-400">Allow API access to your account</p>
                      </div>
                      <Switch
                        checked={settings.apiAccess}
                        onCheckedChange={(checked) => handleSettingChange("apiAccess", checked)}
                      />
                    </div>

                    {settings.apiAccess && (
                      <div className="space-y-2">
                        <Label className="text-white">API Key</Label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Input
                              type={showApiKey ? "text" : "password"}
                              value="cs_live_1234567890abcdef"
                              readOnly
                              className="bg-gray-800/50 border-purple-400/30 text-white pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowApiKey(!showApiKey)}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
                            >
                              {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                          <Button
                            variant="outline"
                            className="border-purple-400/40 text-zinc-200 hover:bg-purple-900/40 bg-transparent"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator className="bg-purple-500/20" />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-white">Password</h3>
                    <Button
                      variant="outline"
                      className="border-purple-400/40 text-zinc-200 hover:bg-purple-900/40 bg-transparent"
                    >
                      <Lock className="h-4 w-4 mr-2" />
                      Change Password
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Appearance Tab */}
            <TabsContent value="appearance" className="space-y-6">
              <Card className="bg-gray-900/80 border-purple-400/40 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-xl text-white">Appearance Settings</CardTitle>
                  <CardDescription className="text-zinc-300">
                    Customize the look and feel of your dashboard
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-white">Theme</Label>
                      <div className="grid grid-cols-3 gap-3">
                        <div
                          className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                            settings.theme === "dark"
                              ? "border-purple-400 bg-purple-500/20"
                              : "border-zinc-700 bg-zinc-800/50"
                          }`}
                          onClick={() => handleSettingChange("theme", "dark")}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Moon className="h-4 w-4 text-purple-400" />
                            <span className="text-sm font-medium text-white">Dark</span>
                          </div>
                          <div className="w-full h-8 bg-gray-900 rounded border border-gray-700"></div>
                        </div>
                        <div
                          className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                            settings.theme === "light"
                              ? "border-purple-400 bg-purple-500/20"
                              : "border-zinc-700 bg-zinc-800/50"
                          }`}
                          onClick={() => handleSettingChange("theme", "light")}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Sun className="h-4 w-4 text-yellow-400" />
                            <span className="text-sm font-medium text-white">Light</span>
                          </div>
                          <div className="w-full h-8 bg-white rounded border border-gray-300"></div>
                        </div>
                        <div
                          className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                            settings.theme === "auto"
                              ? "border-purple-400 bg-purple-500/20"
                              : "border-zinc-700 bg-zinc-800/50"
                          }`}
                          onClick={() => handleSettingChange("theme", "auto")}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Monitor className="h-4 w-4 text-blue-400" />
                            <span className="text-sm font-medium text-white">Auto</span>
                          </div>
                          <div className="w-full h-8 bg-gradient-to-r from-gray-900 to-white rounded border border-gray-500"></div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-white">Language</Label>
                        <Select
                          value={settings.language}
                          onValueChange={(value) => handleSettingChange("language", value)}
                        >
                          <SelectTrigger className="bg-gray-800/50 border-purple-400/30 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 border-purple-400/30">
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="es">Español</SelectItem>
                            <SelectItem value="fr">Français</SelectItem>
                            <SelectItem value="de">Deutsch</SelectItem>
                            <SelectItem value="ja">日本語</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-white">Timezone</Label>
                        <Select
                          value={settings.timezone}
                          onValueChange={(value) => handleSettingChange("timezone", value)}
                        >
                          <SelectTrigger className="bg-gray-800/50 border-purple-400/30 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 border-purple-400/30">
                            <SelectItem value="UTC-8">Pacific Time (UTC-8)</SelectItem>
                            <SelectItem value="UTC-5">Eastern Time (UTC-5)</SelectItem>
                            <SelectItem value="UTC+0">UTC</SelectItem>
                            <SelectItem value="UTC+1">Central European Time (UTC+1)</SelectItem>
                            <SelectItem value="UTC+9">Japan Standard Time (UTC+9)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-white">Date Format</Label>
                        <Select
                          value={settings.dateFormat}
                          onValueChange={(value) => handleSettingChange("dateFormat", value)}
                        >
                          <SelectTrigger className="bg-gray-800/50 border-purple-400/30 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 border-purple-400/30">
                            <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                            <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                            <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Privacy Tab */}
            <TabsContent value="privacy" className="space-y-6">
              <Card className="bg-gray-900/80 border-purple-400/40 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-xl text-white">Privacy Settings</CardTitle>
                  <CardDescription className="text-zinc-300">Control how your data is used and shared</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-white">Data Sharing</p>
                        <p className="text-sm text-zinc-400">Share anonymized data to improve threat detection</p>
                      </div>
                      <Switch
                        checked={settings.dataSharing}
                        onCheckedChange={(checked) => handleSettingChange("dataSharing", checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-white">Analytics</p>
                        <p className="text-sm text-zinc-400">Help us improve the product with usage analytics</p>
                      </div>
                      <Switch
                        checked={settings.analytics}
                        onCheckedChange={(checked) => handleSettingChange("analytics", checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-white">Crash Reports</p>
                        <p className="text-sm text-zinc-400">Automatically send crash reports to help fix issues</p>
                      </div>
                      <Switch
                        checked={settings.crashReports}
                        onCheckedChange={(checked) => handleSettingChange("crashReports", checked)}
                      />
                    </div>
                  </div>

                  <Separator className="bg-purple-500/20" />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-white">Data Management</h3>
                    <div className="space-y-3">
                      <Button
                        onClick={handleExportData}
                        variant="outline"
                        className="w-full justify-start border-purple-400/40 text-zinc-200 hover:bg-purple-900/40 bg-transparent"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export My Data
                      </Button>
                      <p className="text-sm text-zinc-400">
                        Download a copy of all your data including settings, alerts, and reports.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Advanced Tab */}
            <TabsContent value="advanced" className="space-y-6">
              <Card className="bg-gray-900/80 border-purple-400/40 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-xl text-white">Advanced Settings</CardTitle>
                  <CardDescription className="text-zinc-300">
                    Advanced configuration options and account management
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-white">Account Management</h3>
                    <div className="space-y-3">
                      <Button
                        variant="outline"
                        className="w-full justify-start border-purple-400/40 text-zinc-200 hover:bg-purple-900/40 bg-transparent"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Reset All Settings
                      </Button>
                      <p className="text-sm text-zinc-400">Reset all settings to their default values.</p>
                    </div>
                  </div>

                  <Separator className="bg-purple-500/20" />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-red-400">Danger Zone</h3>
                    <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg space-y-4">
                      <div>
                        <h4 className="font-medium text-red-300 mb-2">Delete Account</h4>
                        <p className="text-sm text-zinc-400 mb-4">
                          Permanently delete your account and all associated data. This action cannot be undone.
                        </p>
                        <Button
                          onClick={handleDeleteAccount}
                          variant="destructive"
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Account
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-purple-500/20 bg-gray-950/90 backdrop-blur-xl py-12 relative">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-gradient-to-r from-purple-500 to-violet-500 p-1.5 shadow-lg shadow-purple-500/25">
                <ShieldCheck className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                CyberSense AI
              </span>
            </div>
            <p className="text-sm text-zinc-400">© 2025 CyberSense AI. Built for cybersecurity professionals.</p>
          </div>
        </div>
      </footer>
    </main>
  )
}
