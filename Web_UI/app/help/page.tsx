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
  Video,
  ExternalLink,
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
      title: "Video Tutorials",
      description: "Step-by-step video guides for common tasks",
      type: "Video",
      icon: <Video className="h-5 w-5" />,
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
