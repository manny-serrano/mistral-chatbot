import type React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ShieldCheck,
  Target,
  Globe,
  Zap,
  Brain,
  Shield,
  CheckCircle,
  Github,
  Linkedin,
  Twitter,
} from "lucide-react"

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950/40 to-gray-900 text-zinc-100 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-fuchsia-500/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>

      {/* Header */}
      <header className="border-b border-purple-500/20 bg-gray-950/80 backdrop-blur-xl sticky top-0 z-50 relative">
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
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/" className="text-sm font-medium text-zinc-400 hover:text-purple-300 transition-colors">
                Home
              </Link>
              <Link
                href="/dashboard"
                className="text-sm font-medium text-zinc-400 hover:text-purple-300 transition-colors"
              >
                Dashboard
              </Link>
              <span className="text-sm font-medium text-purple-300">About</span>
              <Link
                href="/reports"
                className="text-sm font-medium text-zinc-400 hover:text-purple-300 transition-colors"
              >
                Reports
              </Link>
              <Link href="/login">
                <Button className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 shadow-lg shadow-purple-500/25">
                  Get Started
                </Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative py-8">
        {/* Enhanced background for better contrast */}
        <div className="absolute inset-0 bg-gradient-to-r from-gray-950/90 via-purple-950/50 to-gray-950/90" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/40 via-transparent to-transparent" />

        <div className="relative mx-auto max-w-7xl px-6">
          {/* Hero Section */}
          <section className="py-20 lg:py-32">
            <div className="text-center">
              <Badge
                variant="outline"
                className="mb-6 border-purple-400/30 bg-purple-500/10 text-purple-300 backdrop-blur-sm"
              >
                About CyberSense AI
              </Badge>
              <h1 className="text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl text-white mb-6">
                Protecting the{" "}
                <span className="bg-gradient-to-r from-purple-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                  Digital World
                </span>
              </h1>
              <p className="mx-auto max-w-3xl text-xl leading-8 text-zinc-200">
                We're a team of cybersecurity experts and AI researchers dedicated to making advanced threat detection
                accessible to organizations of all sizes. Our mission is to democratize cybersecurity through
                intelligent automation.
              </p>
            </div>
          </section>

          {/* Mission & Vision */}
          <section className="py-20">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <Card className="bg-gray-900/80 border-purple-400/40 backdrop-blur-xl">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="rounded-lg bg-purple-500/20 p-3 border border-purple-400/30">
                      <Target className="h-6 w-6 text-purple-300" />
                    </div>
                    <CardTitle className="text-2xl text-white">Our Mission</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-lg text-zinc-200 leading-relaxed">
                    To empower cybersecurity professionals with AI-driven tools that provide real-time threat
                    intelligence, automated analysis, and actionable insights. We believe that advanced cybersecurity
                    should be accessible, intuitive, and effective for teams of all sizes.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/80 border-violet-400/40 backdrop-blur-xl">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="rounded-lg bg-violet-500/20 p-3 border border-violet-400/30">
                      <Globe className="h-6 w-6 text-violet-300" />
                    </div>
                    <CardTitle className="text-2xl text-white">Our Vision</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-lg text-zinc-200 leading-relaxed">
                    A world where organizations can proactively defend against cyber threats using intelligent systems
                    that learn, adapt, and respond faster than human analysts alone. We envision a future where
                    cybersecurity is predictive, not reactive.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Company Stats */}
          <section className="py-20">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-white mb-4">Trusted by Security Teams Worldwide</h2>
              <p className="text-xl text-zinc-200">Our platform protects organizations across the globe</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-purple-300 bg-clip-text text-transparent mb-2">
                  500+
                </div>
                <div className="text-lg font-medium text-white">Organizations Protected</div>
                <div className="text-sm text-zinc-400 mt-1">Across 50+ countries</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold bg-gradient-to-r from-violet-400 to-violet-300 bg-clip-text text-transparent mb-2">
                  10M+
                </div>
                <div className="text-lg font-medium text-white">Threats Detected</div>
                <div className="text-sm text-zinc-400 mt-1">In the last 12 months</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold bg-gradient-to-r from-fuchsia-400 to-fuchsia-300 bg-clip-text text-transparent mb-2">
                  99.7%
                </div>
                <div className="text-lg font-medium text-white">Detection Accuracy</div>
                <div className="text-sm text-zinc-400 mt-1">With minimal false positives</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-emerald-300 bg-clip-text text-transparent mb-2">
                  {"<30s"}
                </div>
                <div className="text-lg font-medium text-white">Average Response Time</div>
                <div className="text-sm text-zinc-400 mt-1">From detection to alert</div>
              </div>
            </div>
          </section>

          {/* Technology & Innovation */}
          <section className="py-20">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-white mb-4">Innovation at Our Core</h2>
              <p className="text-xl text-zinc-200 max-w-3xl mx-auto">
                We leverage cutting-edge technologies to stay ahead of evolving cyber threats
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="bg-gray-900/80 border-purple-400/40 backdrop-blur-xl">
                <CardHeader>
                  <div className="rounded-lg bg-purple-500/20 p-3 w-fit border border-purple-500/20 mb-4">
                    <Brain className="h-8 w-8 text-purple-400" />
                  </div>
                  <CardTitle className="text-xl text-white">Advanced AI Models</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-zinc-200 mb-4">
                    Our proprietary machine learning models are trained on the MISTRAL research dataset and continuously
                    updated with the latest threat intelligence.
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-sm text-zinc-300">
                      <CheckCircle className="h-4 w-4 text-purple-400" />
                      Deep learning threat classification
                    </li>
                    <li className="flex items-center gap-2 text-sm text-zinc-300">
                      <CheckCircle className="h-4 w-4 text-purple-400" />
                      Behavioral anomaly detection
                    </li>
                    <li className="flex items-center gap-2 text-sm text-zinc-300">
                      <CheckCircle className="h-4 w-4 text-purple-400" />
                      Predictive threat modeling
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/80 border-violet-400/40 backdrop-blur-xl">
                <CardHeader>
                  <div className="rounded-lg bg-violet-500/20 p-3 w-fit border border-violet-500/20 mb-4">
                    <Zap className="h-8 w-8 text-violet-400" />
                  </div>
                  <CardTitle className="text-xl text-white">Real-time Processing</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-zinc-200 mb-4">
                    Our distributed architecture processes millions of network events per second, providing instant
                    threat detection and response capabilities.
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-sm text-zinc-300">
                      <CheckCircle className="h-4 w-4 text-violet-400" />
                      Stream processing engine
                    </li>
                    <li className="flex items-center gap-2 text-sm text-zinc-300">
                      <CheckCircle className="h-4 w-4 text-violet-400" />
                      Edge computing deployment
                    </li>
                    <li className="flex items-center gap-2 text-sm text-zinc-300">
                      <CheckCircle className="h-4 w-4 text-violet-400" />
                      Auto-scaling infrastructure
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/80 border-fuchsia-400/40 backdrop-blur-xl">
                <CardHeader>
                  <div className="rounded-lg bg-fuchsia-500/20 p-3 w-fit border border-fuchsia-500/20 mb-4">
                    <Shield className="h-8 w-8 text-fuchsia-400" />
                  </div>
                  <CardTitle className="text-xl text-white">Security by Design</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-zinc-200 mb-4">
                    Built with security-first principles, our platform ensures your data remains protected while
                    providing comprehensive threat visibility.
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-sm text-zinc-300">
                      <CheckCircle className="h-4 w-4 text-fuchsia-400" />
                      End-to-end encryption
                    </li>
                    <li className="flex items-center gap-2 text-sm text-zinc-300">
                      <CheckCircle className="h-4 w-4 text-fuchsia-400" />
                      Zero-trust architecture
                    </li>
                    <li className="flex items-center gap-2 text-sm text-zinc-300">
                      <CheckCircle className="h-4 w-4 text-fuchsia-400" />
                      SOC 2 Type II compliant
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Team Section */}
          <section className="py-20">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-white mb-4">Meet Our Team</h2>
              <p className="text-xl text-zinc-200">
                Cybersecurity experts, AI researchers, and engineers working together to protect the digital world
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <TeamMember
                name="Dr. Sarah Chen"
                role="Chief Technology Officer"
                bio="Former DARPA researcher with 15+ years in AI and cybersecurity. PhD in Computer Science from MIT."
                image="/placeholder.svg?height=300&width=300"
                social={{
                  linkedin: "#",
                  twitter: "#",
                  github: "#",
                }}
              />
              <TeamMember
                name="Marcus Rodriguez"
                role="Head of Security Research"
                bio="Ex-NSA analyst and penetration testing expert. Discovered 50+ CVEs and leads our threat intelligence team."
                image="/placeholder.svg?height=300&width=300"
                social={{
                  linkedin: "#",
                  twitter: "#",
                  github: "#",
                }}
              />
              <TeamMember
                name="Dr. Aisha Patel"
                role="VP of Engineering"
                bio="Distributed systems architect with experience at Google and Amazon. Specializes in real-time data processing."
                image="/placeholder.svg?height=300&width=300"
                social={{
                  linkedin: "#",
                  twitter: "#",
                  github: "#",
                }}
              />
            </div>
          </section>


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
    </div>
  )
}

// Team Member Component
interface TeamMemberProps {
  name: string
  role: string
  bio: string
  image: string
  social: {
    linkedin?: string
    twitter?: string
    github?: string
  }
}

function TeamMember({ name, role, bio, image, social }: TeamMemberProps) {
  return (
    <Card className="bg-gray-900/80 border-purple-400/40 backdrop-blur-xl">
      <CardContent className="p-6 text-center">
        <div className="mb-4">
          <img
            src={image || "/placeholder.svg"}
            alt={name}
            className="w-24 h-24 rounded-full mx-auto mb-4 border-2 border-purple-400/30"
          />
          <h3 className="text-xl font-bold text-white">{name}</h3>
          <p className="text-purple-300 font-medium">{role}</p>
        </div>
        <p className="text-sm text-zinc-300 mb-4">{bio}</p>
        <div className="flex items-center justify-center gap-3">
          {social.linkedin && (
            <a
              href={social.linkedin}
              className="text-zinc-400 hover:text-purple-300 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Linkedin className="h-5 w-5" />
            </a>
          )}
          {social.twitter && (
            <a
              href={social.twitter}
              className="text-zinc-400 hover:text-purple-300 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Twitter className="h-5 w-5" />
            </a>
          )}
          {social.github && (
            <a
              href={social.github}
              className="text-zinc-400 hover:text-purple-300 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github className="h-5 w-5" />
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  )
}


