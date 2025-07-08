"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Shield,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Crown,
  Activity,
  Camera,
  Save,
  Edit3,
  Building,
  Globe,
  Clock,
  Award,
} from "lucide-react"

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false)
  const [profileData, setProfileData] = useState({
    name: "John Smith",
    email: "john.smith@company.com",
    phone: "+1 (555) 123-4567",
    location: "San Francisco, CA",
    company: "CyberTech Solutions",
    department: "Security Operations",
    role: "Senior Security Analyst",
    bio: "Experienced cybersecurity professional with 8+ years in threat detection and incident response. Specialized in advanced persistent threats and security automation.",
    joinDate: "March 2022",
    timezone: "Pacific Standard Time (PST)",
    website: "https://johnsmith.dev",
  })

  const handleSave = () => {
    setIsEditing(false)
    // Add save logic here
    console.log("Profile saved:", profileData)
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
                <span className="text-xl font-bold text-white">LEVANT AI</span>
              </Link>
              <div className="text-zinc-400">/</div>
              <h1 className="text-lg font-semibold text-white">My Profile</h1>
            </div>
            <div className="flex items-center gap-3">
              {isEditing ? (
                <>
                  <Button onClick={handleSave} className="bg-purple-600 hover:bg-purple-700">
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                </>
              ) : (
                <Button onClick={() => setIsEditing(true)} variant="outline">
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <Card className="bg-gray-900/50 border-purple-500/30 backdrop-blur-xl">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center">
                  <div className="relative">
                    <Avatar className="h-32 w-32 border-4 border-purple-500/30">
                      <AvatarImage src="/placeholder.svg?height=128&width=128" alt={profileData.name} />
                      <AvatarFallback className="bg-gradient-to-r from-purple-600 to-violet-600 text-white text-2xl font-bold">
                        {profileData.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    {isEditing && (
                      <Button
                        size="sm"
                        className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-purple-600 hover:bg-purple-700"
                      >
                        <Camera className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="mt-4 space-y-2">
                    <h2 className="text-2xl font-bold text-white">{profileData.name}</h2>
                    <p className="text-purple-400 font-medium">{profileData.role}</p>
                    <p className="text-zinc-400">{profileData.company}</p>

                    <div className="flex items-center justify-center gap-2 mt-3">
                      <Badge className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-300 border-yellow-500/30">
                        <Crown className="h-3 w-3 mr-1" />
                        Pro Plan
                      </Badge>
                      <Badge className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-300 border-green-500/30">
                        <Shield className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                    <Activity className="h-5 w-5 text-purple-400 mx-auto mb-1" />
                    <p className="text-sm text-zinc-400">Threats Blocked</p>
                    <p className="text-lg font-bold text-white">1,247</p>
                  </div>
                  <div className="text-center p-3 bg-violet-500/10 rounded-lg border border-violet-500/20">
                    <Award className="h-5 w-5 text-violet-400 mx-auto mb-1" />
                    <p className="text-sm text-zinc-400">Security Score</p>
                    <p className="text-lg font-bold text-white">98%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Profile Details */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="personal" className="space-y-6">
              <TabsList className="bg-gray-900/50 border border-purple-500/30">
                <TabsTrigger value="personal" className="data-[state=active]:bg-purple-600">
                  Personal Info
                </TabsTrigger>
                <TabsTrigger value="professional" className="data-[state=active]:bg-purple-600">
                  Professional
                </TabsTrigger>
                <TabsTrigger value="activity" className="data-[state=active]:bg-purple-600">
                  Activity
                </TabsTrigger>
              </TabsList>

              <TabsContent value="personal">
                <Card className="bg-gray-900/50 border-purple-500/30 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="text-white">Personal Information</CardTitle>
                    <CardDescription className="text-zinc-400">
                      Manage your personal details and contact information
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-zinc-300">
                          Full Name
                        </Label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                          <Input
                            id="name"
                            value={profileData.name}
                            onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                            disabled={!isEditing}
                            className="pl-10 bg-gray-800/50 border-purple-500/30 text-white"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-zinc-300">
                          Email Address
                        </Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                          <Input
                            id="email"
                            type="email"
                            value={profileData.email}
                            onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                            disabled={!isEditing}
                            className="pl-10 bg-gray-800/50 border-purple-500/30 text-white"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-zinc-300">
                          Phone Number
                        </Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                          <Input
                            id="phone"
                            value={profileData.phone}
                            onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                            disabled={!isEditing}
                            className="pl-10 bg-gray-800/50 border-purple-500/30 text-white"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="location" className="text-zinc-300">
                          Location
                        </Label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                          <Input
                            id="location"
                            value={profileData.location}
                            onChange={(e) => setProfileData({ ...profileData, location: e.target.value })}
                            disabled={!isEditing}
                            className="pl-10 bg-gray-800/50 border-purple-500/30 text-white"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="timezone" className="text-zinc-300">
                          Timezone
                        </Label>
                        <div className="relative">
                          <Clock className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                          <Input
                            id="timezone"
                            value={profileData.timezone}
                            onChange={(e) => setProfileData({ ...profileData, timezone: e.target.value })}
                            disabled={!isEditing}
                            className="pl-10 bg-gray-800/50 border-purple-500/30 text-white"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="website" className="text-zinc-300">
                          Website
                        </Label>
                        <div className="relative">
                          <Globe className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                          <Input
                            id="website"
                            value={profileData.website}
                            onChange={(e) => setProfileData({ ...profileData, website: e.target.value })}
                            disabled={!isEditing}
                            className="pl-10 bg-gray-800/50 border-purple-500/30 text-white"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bio" className="text-zinc-300">
                        Bio
                      </Label>
                      <Textarea
                        id="bio"
                        value={profileData.bio}
                        onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                        disabled={!isEditing}
                        rows={4}
                        className="bg-gray-800/50 border-purple-500/30 text-white"
                        placeholder="Tell us about yourself..."
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="professional">
                <Card className="bg-gray-900/50 border-purple-500/30 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="text-white">Professional Information</CardTitle>
                    <CardDescription className="text-zinc-400">
                      Your work details and professional background
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="company" className="text-zinc-300">
                          Company
                        </Label>
                        <div className="relative">
                          <Building className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                          <Input
                            id="company"
                            value={profileData.company}
                            onChange={(e) => setProfileData({ ...profileData, company: e.target.value })}
                            disabled={!isEditing}
                            className="pl-10 bg-gray-800/50 border-purple-500/30 text-white"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="department" className="text-zinc-300">
                          Department
                        </Label>
                        <Input
                          id="department"
                          value={profileData.department}
                          onChange={(e) => setProfileData({ ...profileData, department: e.target.value })}
                          disabled={!isEditing}
                          className="bg-gray-800/50 border-purple-500/30 text-white"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="role" className="text-zinc-300">
                          Job Title
                        </Label>
                        <Input
                          id="role"
                          value={profileData.role}
                          onChange={(e) => setProfileData({ ...profileData, role: e.target.value })}
                          disabled={!isEditing}
                          className="bg-gray-800/50 border-purple-500/30 text-white"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="joinDate" className="text-zinc-300">
                          Join Date
                        </Label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                          <Input
                            id="joinDate"
                            value={profileData.joinDate}
                            disabled
                            className="pl-10 bg-gray-800/30 border-purple-500/20 text-zinc-400"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="activity">
                <Card className="bg-gray-900/50 border-purple-500/30 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="text-white">Recent Activity</CardTitle>
                    <CardDescription className="text-zinc-400">
                      Your recent security activities and achievements
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        { action: "Blocked malware attack", time: "2 hours ago", type: "security" },
                        { action: "Updated security policies", time: "1 day ago", type: "config" },
                        { action: "Completed security training", time: "3 days ago", type: "training" },
                        { action: "Investigated phishing attempt", time: "1 week ago", type: "investigation" },
                        { action: "Generated security report", time: "2 weeks ago", type: "report" },
                      ].map((activity, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-4 p-4 bg-gray-800/30 rounded-lg border border-purple-500/20"
                        >
                          <div
                            className={`h-10 w-10 rounded-full flex items-center justify-center ${
                              activity.type === "security"
                                ? "bg-red-500/20 text-red-400"
                                : activity.type === "config"
                                  ? "bg-blue-500/20 text-blue-400"
                                  : activity.type === "training"
                                    ? "bg-green-500/20 text-green-400"
                                    : activity.type === "investigation"
                                      ? "bg-yellow-500/20 text-yellow-400"
                                      : "bg-purple-500/20 text-purple-400"
                            }`}
                          >
                            <Shield className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <p className="text-white font-medium">{activity.action}</p>
                            <p className="text-zinc-400 text-sm">{activity.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
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
