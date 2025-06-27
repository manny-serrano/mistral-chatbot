"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Shield,
  Key,
  Plus,
  Copy,
  Eye,
  EyeOff,
  Trash2,
  Edit3,
  Calendar,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
} from "lucide-react"

interface ApiKey {
  id: string
  name: string
  key: string
  description: string
  permissions: string[]
  created: string
  lastUsed: string
  status: "active" | "inactive" | "expired"
  usage: number
  limit: number
}

export default function ApiKeysPage() {
  const [showKeys, setShowKeys] = useState<{ [key: string]: boolean }>({})
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newKeyName, setNewKeyName] = useState("")
  const [newKeyDescription, setNewKeyDescription] = useState("")
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])

  const [apiKeys, setApiKeys] = useState<ApiKey[]>([
    {
      id: "1",
      name: "Production API",
      key: "sk_live_1234567890abcdef1234567890abcdef",
      description: "Main production API key for threat detection services",
      permissions: ["read", "write", "admin"],
      created: "2024-01-15",
      lastUsed: "2 hours ago",
      status: "active",
      usage: 15420,
      limit: 50000,
    },
    {
      id: "2",
      name: "Development API",
      key: "sk_test_abcdef1234567890abcdef1234567890",
      description: "Development and testing API key",
      permissions: ["read", "write"],
      created: "2024-02-01",
      lastUsed: "1 day ago",
      status: "active",
      usage: 2340,
      limit: 10000,
    },
    {
      id: "3",
      name: "Analytics API",
      key: "sk_analytics_9876543210fedcba9876543210fedcba",
      description: "Read-only access for analytics and reporting",
      permissions: ["read"],
      created: "2024-01-20",
      lastUsed: "3 days ago",
      status: "inactive",
      usage: 890,
      limit: 5000,
    },
  ])

  const toggleKeyVisibility = (keyId: string) => {
    setShowKeys((prev) => ({
      ...prev,
      [keyId]: !prev[keyId],
    }))
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    // Add toast notification here
  }

  const maskKey = (key: string) => {
    return key.substring(0, 12) + "..." + key.substring(key.length - 4)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500/20 text-green-300 border-green-500/30"
      case "inactive":
        return "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
      case "expired":
        return "bg-red-500/20 text-red-300 border-red-500/30"
      default:
        return "bg-gray-500/20 text-gray-300 border-gray-500/30"
    }
  }

  const getPermissionColor = (permission: string) => {
    switch (permission) {
      case "admin":
        return "bg-red-500/20 text-red-300 border-red-500/30"
      case "write":
        return "bg-orange-500/20 text-orange-300 border-orange-500/30"
      case "read":
        return "bg-blue-500/20 text-blue-300 border-blue-500/30"
      default:
        return "bg-gray-500/20 text-gray-300 border-gray-500/30"
    }
  }

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
              <h1 className="text-lg font-semibold text-white">API Keys</h1>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Create API Key
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-900 border-purple-500/30">
                <DialogHeader>
                  <DialogTitle className="text-white">Create New API Key</DialogTitle>
                  <DialogDescription className="text-zinc-400">
                    Generate a new API key for accessing CyberSense AI services
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="key-name" className="text-zinc-300">
                      Key Name
                    </Label>
                    <Input
                      id="key-name"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      placeholder="e.g., Production API"
                      className="bg-gray-800/50 border-purple-500/30 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="key-description" className="text-zinc-300">
                      Description
                    </Label>
                    <Textarea
                      id="key-description"
                      value={newKeyDescription}
                      onChange={(e) => setNewKeyDescription(e.target.value)}
                      placeholder="Describe what this API key will be used for..."
                      className="bg-gray-800/50 border-purple-500/30 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Permissions</Label>
                    <div className="space-y-2">
                      {["read", "write", "admin"].map((permission) => (
                        <div key={permission} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={permission}
                            checked={selectedPermissions.includes(permission)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPermissions([...selectedPermissions, permission])
                              } else {
                                setSelectedPermissions(selectedPermissions.filter((p) => p !== permission))
                              }
                            }}
                            className="rounded border-purple-500/30"
                          />
                          <Label htmlFor={permission} className="text-zinc-300 capitalize">
                            {permission} Access
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button className="bg-purple-600 hover:bg-purple-700">Create Key</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gray-900/50 border-purple-500/30 backdrop-blur-xl">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <Key className="h-6 w-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Total Keys</p>
                  <p className="text-2xl font-bold text-white">{apiKeys.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-green-500/30 backdrop-blur-xl">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Active Keys</p>
                  <p className="text-2xl font-bold text-white">
                    {apiKeys.filter((key) => key.status === "active").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-blue-500/30 backdrop-blur-xl">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Activity className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Total Requests</p>
                  <p className="text-2xl font-bold text-white">
                    {apiKeys.reduce((sum, key) => sum + key.usage, 0).toLocaleString()}
                  </p>
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
                  <p className="text-sm text-zinc-400">Rate Limit Usage</p>
                  <p className="text-2xl font-bold text-white">67%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* API Keys List */}
        <Card className="bg-gray-900/50 border-purple-500/30 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-white">Your API Keys</CardTitle>
            <CardDescription className="text-zinc-400">Manage your API keys and monitor their usage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {apiKeys.map((apiKey) => (
                <div key={apiKey.id} className="p-6 bg-gray-800/30 rounded-lg border border-purple-500/20">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">{apiKey.name}</h3>
                        <Badge className={getStatusColor(apiKey.status)}>{apiKey.status}</Badge>
                      </div>
                      <p className="text-zinc-400 text-sm mb-3">{apiKey.description}</p>

                      {/* Permissions */}
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-sm text-zinc-400">Permissions:</span>
                        {apiKey.permissions.map((permission) => (
                          <Badge key={permission} className={getPermissionColor(permission)}>
                            {permission}
                          </Badge>
                        ))}
                      </div>

                      {/* API Key */}
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex-1 bg-gray-900/50 rounded-lg p-3 border border-purple-500/20">
                          <code className="text-sm text-white font-mono">
                            {showKeys[apiKey.id] ? apiKey.key : maskKey(apiKey.key)}
                          </code>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => toggleKeyVisibility(apiKey.id)}>
                          {showKeys[apiKey.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => copyToClipboard(apiKey.key)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Usage Stats */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-zinc-400" />
                          <span className="text-zinc-400">Created:</span>
                          <span className="text-white">{apiKey.created}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-zinc-400" />
                          <span className="text-zinc-400">Last used:</span>
                          <span className="text-white">{apiKey.lastUsed}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Activity className="h-4 w-4 text-zinc-400" />
                          <span className="text-zinc-400">Usage:</span>
                          <span className="text-white">
                            {apiKey.usage.toLocaleString()} / {apiKey.limit.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Usage Bar */}
                      <div className="w-full bg-gray-700 rounded-full h-2 mb-4">
                        <div
                          className="bg-gradient-to-r from-purple-600 to-violet-600 h-2 rounded-full"
                          style={{ width: `${(apiKey.usage / apiKey.limit) * 100}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <Button variant="outline" size="sm">
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-400 border-red-500/30 hover:bg-red-500/20 bg-transparent"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
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
