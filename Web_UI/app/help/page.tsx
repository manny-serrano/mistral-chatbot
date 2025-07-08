"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Shield,
  HelpCircle,
  Search,
  Book,
  MessageCircle,
  Mail,
  Phone,
  FileText,
  Video,
  Users,
  Zap,
  CheckCircle,
  ExternalLink,
  ChevronRight,
  Clock,
} from "lucide-react"

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("")

  const faqItems = [
    {
      question: "How do I set up threat detection?",
      answer:
        "Navigate to your dashboard and click on 'Threat Detection' in the sidebar. Follow the setup wizard to configure your detection rules and parameters.",
      category: "Getting Started",
    },
    {
      question: "What types of threats can LEVANT AI detect?",
      answer:
        "LEVANT AI can detect malware, phishing attempts, DDoS attacks, unauthorized access attempts, data breaches, and advanced persistent threats (APTs).",
      category: "Features",
    },
    {
      question: "How do I upgrade my plan?",
      answer:
        "Go to Settings > Billing and click 'Upgrade Plan'. Choose your desired plan and follow the payment process.",
      category: "Billing",
    },
    {
      question: "Can I integrate LEVANT AI with other security tools?",
      answer:
        "Yes, we support integrations with popular SIEM tools, firewalls, and security platforms through our API and webhooks.",
      category: "Integrations",
    },
    {
      question: "How do I export security reports?",
      answer:
        "In the Reports section, select the report you want to export and click the 'Export' button. You can choose from PDF, CSV, or JSON formats.",
      category: "Reports",
    },
  ]

  const resources = [
    {
      title: "Getting Started Guide",
      description: "Complete guide to setting up your LEVANT AI account",
      type: "Documentation",
      icon: <Book className="h-5 w-5" />,
      link: "#",
    },
    {
      title: "API Documentation",
      description: "Comprehensive API reference and integration guides",
      type: "Documentation",
      icon: <FileText className="h-5 w-5" />,
      link: "#",
    },
    {
      title: "Video Tutorials",
      description: "Step-by-step video guides for common tasks",
      type: "Video",
      icon: <Video className="h-5 w-5" />,
      link: "#",
    },
    {
      title: "Community Forum",
      description: "Connect with other users and share knowledge",
      type: "Community",
      icon: <Users className="h-5 w-5" />,
      link: "#",
    },
  ]

  const filteredFAQ = faqItems.filter(
    (item) =>
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase()),
  )

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
              <h1 className="text-lg font-semibold text-white">Help & Support</h1>
            </div>
            <Button className="bg-purple-600 hover:bg-purple-700">
              <MessageCircle className="h-4 w-4 mr-2" />
              Contact Support
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="h-16 w-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <HelpCircle className="h-8 w-8 text-purple-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">How can we help you?</h1>
          <p className="text-zinc-400 text-lg mb-8">
            Find answers to common questions or get in touch with our support team
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-zinc-400" />
            <Input
              placeholder="Search for help articles, guides, or FAQs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 bg-gray-800/50 border-purple-500/30 text-white text-lg"
            />
          </div>
        </div>

        <Tabs defaultValue="faq" className="space-y-8">
          <TabsList className="bg-gray-900/50 border border-purple-500/30">
            <TabsTrigger value="faq" className="data-[state=active]:bg-purple-600">
              FAQ
            </TabsTrigger>
            <TabsTrigger value="resources" className="data-[state=active]:bg-purple-600">
              Resources
            </TabsTrigger>
            <TabsTrigger value="contact" className="data-[state=active]:bg-purple-600">
              Contact Us
            </TabsTrigger>
            <TabsTrigger value="status" className="data-[state=active]:bg-purple-600">
              System Status
            </TabsTrigger>
          </TabsList>

          <TabsContent value="faq">
            <Card className="bg-gray-900/50 border-purple-500/30 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-white">Frequently Asked Questions</CardTitle>
                <CardDescription className="text-zinc-400">
                  Find quick answers to the most common questions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredFAQ.map((item, index) => (
                    <div key={index} className="p-4 bg-gray-800/30 rounded-lg border border-purple-500/20">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-white font-medium pr-4">{item.question}</h3>
                        <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">
                          {item.category}
                        </Badge>
                      </div>
                      <p className="text-zinc-400 text-sm leading-relaxed">{item.answer}</p>
                    </div>
                  ))}

                  {filteredFAQ.length === 0 && searchQuery && (
                    <div className="text-center py-12">
                      <Search className="h-16 w-16 text-zinc-400 mx-auto mb-4" />
                      <p className="text-white font-medium">No results found</p>
                      <p className="text-zinc-400 text-sm mt-2">Try different keywords or contact our support team</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="resources">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {resources.map((resource, index) => (
                <Card
                  key={index}
                  className="bg-gray-900/50 border-purple-500/30 backdrop-blur-xl hover:border-purple-400/50 transition-colors cursor-pointer"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 bg-purple-500/20 rounded-lg flex items-center justify-center text-purple-400">
                        {resource.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-white font-medium">{resource.title}</h3>
                          <ExternalLink className="h-4 w-4 text-zinc-400" />
                        </div>
                        <p className="text-zinc-400 text-sm mb-3">{resource.description}</p>
                        <Badge className="bg-gray-700/50 text-zinc-300 border-gray-600/30 text-xs">
                          {resource.type}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Quick Links */}
            <Card className="bg-gray-900/50 border-purple-500/30 backdrop-blur-xl mt-8">
              <CardHeader>
                <CardTitle className="text-white">Quick Links</CardTitle>
                <CardDescription className="text-zinc-400">Popular help topics and guides</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    "Setting up your first threat detection rule",
                    "Understanding security alerts and notifications",
                    "Configuring API integrations",
                    "Generating and exporting security reports",
                    "Managing user permissions and access",
                    "Troubleshooting common issues",
                  ].map((link, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg border border-purple-500/20 hover:border-purple-400/40 transition-colors cursor-pointer"
                    >
                      <ChevronRight className="h-4 w-4 text-purple-400" />
                      <span className="text-zinc-300 text-sm">{link}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contact">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="bg-gray-900/50 border-purple-500/30 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-white">Contact Support</CardTitle>
                  <CardDescription className="text-zinc-400">Get in touch with our support team</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center gap-4 p-4 bg-gray-800/30 rounded-lg border border-purple-500/20">
                    <div className="h-12 w-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <MessageCircle className="h-6 w-6 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-medium">Live Chat</h3>
                      <p className="text-zinc-400 text-sm">Available 24/7 for immediate assistance</p>
                      <Button size="sm" className="mt-2 bg-blue-600 hover:bg-blue-700">
                        Start Chat
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-gray-800/30 rounded-lg border border-purple-500/20">
                    <div className="h-12 w-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                      <Mail className="h-6 w-6 text-green-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-medium">Email Support</h3>
                      <p className="text-zinc-400 text-sm">support@cybersense.ai</p>
                      <p className="text-zinc-500 text-xs mt-1">Response within 24 hours</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-gray-800/30 rounded-lg border border-purple-500/20">
                    <div className="h-12 w-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                      <Phone className="h-6 w-6 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-medium">Phone Support</h3>
                      <p className="text-zinc-400 text-sm">+1 (555) 123-4567</p>
                      <p className="text-zinc-500 text-xs mt-1">Mon-Fri, 9 AM - 6 PM EST</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/50 border-purple-500/30 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-white">Support Hours</CardTitle>
                  <CardDescription className="text-zinc-400">When our support team is available</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg border border-purple-500/20">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-zinc-400" />
                        <span className="text-white">Live Chat</span>
                      </div>
                      <Badge className="bg-green-500/20 text-green-300 border-green-500/30">24/7</Badge>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg border border-purple-500/20">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-zinc-400" />
                        <span className="text-white">Email Support</span>
                      </div>
                      <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">24 hours</Badge>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg border border-purple-500/20">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-zinc-400" />
                        <span className="text-white">Phone Support</span>
                      </div>
                      <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">Business Hours</Badge>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-purple-500/20">
                    <h4 className="text-white font-medium mb-2">Priority Support</h4>
                    <p className="text-zinc-400 text-sm mb-3">
                      Pro and Enterprise customers receive priority support with faster response times.
                    </p>
                    <Button variant="outline" size="sm">
                      Upgrade Plan
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="status">
            <Card className="bg-gray-900/50 border-purple-500/30 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  System Status
                </CardTitle>
                <CardDescription className="text-zinc-400">
                  Current status of all LEVANT AI services
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { service: "Threat Detection API", status: "operational", uptime: "99.9%" },
                    { service: "Dashboard & Web App", status: "operational", uptime: "99.8%" },
                    { service: "Alert Notifications", status: "operational", uptime: "99.9%" },
                    { service: "Data Processing", status: "operational", uptime: "99.7%" },
                    { service: "Reporting System", status: "maintenance", uptime: "99.5%" },
                    { service: "API Gateway", status: "operational", uptime: "99.9%" },
                  ].map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg border border-purple-500/20"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-3 w-3 rounded-full ${
                            item.status === "operational"
                              ? "bg-green-400"
                              : item.status === "maintenance"
                                ? "bg-yellow-400"
                                : "bg-red-400"
                          }`}
                        ></div>
                        <span className="text-white font-medium">{item.service}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-zinc-400 text-sm">{item.uptime} uptime</span>
                        <Badge
                          className={
                            item.status === "operational"
                              ? "bg-green-500/20 text-green-300 border-green-500/30"
                              : item.status === "maintenance"
                                ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
                                : "bg-red-500/20 text-red-300 border-red-500/30"
                          }
                        >
                          {item.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <div className="flex items-start gap-3">
                    <Zap className="h-5 w-5 text-blue-400 mt-0.5" />
                    <div>
                      <h4 className="text-white font-medium">Scheduled Maintenance</h4>
                      <p className="text-zinc-400 text-sm mt-1">
                        The reporting system will undergo maintenance on January 20, 2025, from 2:00 AM to 4:00 AM EST.
                        All other services will remain operational.
                      </p>
                    </div>
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
