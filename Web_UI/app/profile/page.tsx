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
  Camera,
  Save,
  Edit3,
  Globe,
  Clock,
} from "lucide-react"

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false)
  const [profileData, setProfileData] = useState({
    name: "John Smith",
    email: "john.smith@company.com",
    phone: "+1 (555) 123-4567",
    location: "San Francisco, CA",
    bio: "Experienced cybersecurity professional with 8+ years in threat detection and incident response. Specialized in advanced persistent threats and security automation.",
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
                    <p className="text-purple-400 font-medium">Security Analyst</p>
                    <p className="text-zinc-400">CyberTech Solutions</p>

                    <div className="flex items-center justify-center gap-2 mt-3">
                      <Badge className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-300 border-green-500/30">
                        <Shield className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    </div>
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
