"use client"

import type React from "react"
import Link from "next/link"
import { useAuthContext } from "@/components/auth/auth-provider"
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
  ArrowRight,
} from "lucide-react"

export default function AboutPage() {
  const { isAuthenticated, loading, logout, user } = useAuthContext()
  
  // Show a basic navigation during SSR/prerendering
  const showBasicNav = loading || typeof window === 'undefined'
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950/40 to-gray-900 text-zinc-100 relative overflow-hidden">
      {/* Animated background elements - Responsive sizes */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-10 w-32 sm:w-72 h-32 sm:h-72 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-48 sm:w-96 h-48 sm:h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 left-1/3 w-40 sm:w-80 h-40 sm:h-80 bg-fuchsia-500/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>

      {/* Header - Responsive */}
      <header className="border-b border-purple-500/20 bg-gray-950/80 backdrop-blur-xl sticky top-0 z-50 relative">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="rounded-md bg-gradient-to-r from-purple-500 to-violet-500 p-1.5 shadow-lg shadow-purple-500/25">
                <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                LEVANT AI
              </h1>
            </Link>
            <nav className="flex items-center gap-2 sm:gap-4 md:gap-6">
              <Link href="/" className="text-xs sm:text-sm font-medium text-zinc-400 hover:text-purple-300 transition-colors">
                Home
              </Link>
              {showBasicNav ? (
                // Basic navigation for SSR/loading state
                <>
                  <span className="text-xs sm:text-sm font-medium text-purple-300">About</span>
                  <Link href="/login">
                    <Button size="sm" className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 shadow-lg shadow-purple-500/25 text-xs sm:text-sm">
                      Get Started
                    </Button>
                  </Link>
                </>
              ) : isAuthenticated ? (
                // Authenticated navigation
                <>
                  <Link
                    href="/dashboard"
                    className="text-xs sm:text-sm font-medium text-zinc-400 hover:text-purple-300 transition-colors"
                  >
                    Dashboard
                  </Link>
                  <span className="text-xs sm:text-sm font-medium text-purple-300">About</span>
                  <div className="flex items-center gap-2 sm:gap-3 ml-2">
                    <span className="text-xs sm:text-sm text-zinc-300 hidden sm:inline">
                      {user?.displayName || user?.givenName || 'User'}
                    </span>
                    <Button 
                      onClick={logout}
                      variant="outline"
                      size="sm"
                      className="border-purple-400/40 text-zinc-200 hover:bg-purple-900/40 bg-transparent text-xs sm:text-sm"
                    >
                      Logout
                    </Button>
                  </div>
                </>
              ) : (
                // Unauthenticated navigation
                <>
                  <span className="text-xs sm:text-sm font-medium text-purple-300">About</span>
                  <Link href="/login">
                    <Button size="sm" className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 shadow-lg shadow-purple-500/25 text-xs sm:text-sm">
                      Get Started
                    </Button>
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content - Responsive */}
      <main className="relative py-6 sm:py-8">
        {/* Enhanced background for better contrast */}
        <div className="absolute inset-0 bg-gradient-to-r from-gray-950/90 via-purple-950/50 to-gray-950/90" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/40 via-transparent to-transparent" />

        <div className="relative mx-auto max-w-7xl px-3 sm:px-6">
          {/* Hero Section - Responsive */}
          <section className="pt-12 sm:pt-16 pb-12 sm:pb-16 flex items-start justify-center">
            <div className="text-center w-full">
              <Badge
                variant="outline"
                className="mb-4 sm:mb-6 border-purple-400/30 bg-purple-500/10 text-purple-300 backdrop-blur-sm text-xs sm:text-sm"
              >
                About LEVANT AI
              </Badge>
              <h1 className="text-3xl sm:text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-white mb-4 sm:mb-6">
                Protecting the{" "}
                <span className="bg-gradient-to-r from-purple-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                  Digital World
                </span>
              </h1>
              <p className="mx-auto max-w-3xl text-base sm:text-xl lg:text-2xl leading-relaxed text-zinc-200 mb-6 sm:mb-8 px-4 sm:px-0">
                We're a team of cybersecurity experts and AI researchers dedicated to making advanced threat detection
                accessible to organizations of all sizes. Our mission is to democratize cybersecurity through
                intelligent automation.
              </p>

              {/* Scroll Hint */}
              <div 
                className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity duration-200 mb-6 sm:mb-8"
                style={{
                  animation: 'bounce 3s infinite'
                }}
                onClick={() => {
                  document.getElementById('mission-vision')?.scrollIntoView({ 
                    behavior: 'smooth' 
                  });
                }}
              >
                <p className="text-xs sm:text-sm text-zinc-400 mb-2 font-medium">Learn more about us</p>
                <div className="w-5 h-5 sm:w-6 sm:h-6 border-r-2 border-b-2 border-purple-400 transform rotate-45 opacity-70"></div>
              </div>

              {/* Hero Illustration - Responsive size */}
              <div className="flex justify-center">
                <svg 
                  className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 opacity-60"
                  viewBox="0 0 200 200" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Shield */}
                  <path 
                    d="M100 20C100 20 140 30 160 40C160 60 160 120 100 180C40 120 40 60 40 40C60 30 100 20 100 20Z" 
                    stroke="url(#shield-gradient)" 
                    strokeWidth="2" 
                    fill="none"
                    className="opacity-60"
                  />
                  
                  {/* Inner shield */}
                  <path 
                    d="M100 40C100 40 130 47 145 54C145 70 145 110 100 155C55 110 55 70 55 54C70 47 100 40 100 40Z" 
                    fill="url(#shield-gradient)" 
                    className="opacity-20"
                  />
                  
                  {/* Network nodes */}
                  <circle cx="100" cy="80" r="8" fill="#9333ea" className="opacity-80" />
                  <circle cx="75" cy="100" r="6" fill="#7c3aed" className="opacity-80" />
                  <circle cx="125" cy="100" r="6" fill="#7c3aed" className="opacity-80" />
                  <circle cx="100" cy="120" r="6" fill="#7c3aed" className="opacity-80" />
                  <circle cx="85" cy="65" r="4" fill="#a855f7" className="opacity-60" />
                  <circle cx="115" cy="65" r="4" fill="#a855f7" className="opacity-60" />
                  
                  {/* Connection lines */}
                  <line x1="100" y1="80" x2="75" y2="100" stroke="#9333ea" strokeWidth="1" className="opacity-40" />
                  <line x1="100" y1="80" x2="125" y2="100" stroke="#9333ea" strokeWidth="1" className="opacity-40" />
                  <line x1="100" y1="80" x2="100" y2="120" stroke="#9333ea" strokeWidth="1" className="opacity-40" />
                  <line x1="75" y1="100" x2="100" y2="120" stroke="#9333ea" strokeWidth="1" className="opacity-40" />
                  <line x1="125" y1="100" x2="100" y2="120" stroke="#9333ea" strokeWidth="1" className="opacity-40" />
                  <line x1="85" y1="65" x2="100" y2="80" stroke="#a855f7" strokeWidth="1" className="opacity-30" />
                  <line x1="115" y1="65" x2="100" y2="80" stroke="#a855f7" strokeWidth="1" className="opacity-30" />
                  
                  {/* Gradient definitions */}
                  <defs>
                    <linearGradient id="shield-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#9333ea" />
                      <stop offset="50%" stopColor="#7c3aed" />
                      <stop offset="100%" stopColor="#ec4899" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
          </section>

          {/* Mission & Vision - Responsive */}
          <section id="mission-vision" className="py-12 sm:py-20">
            <div className="grid grid-cols-1 gap-8 sm:gap-12 max-w-4xl mx-auto">
              <Card className="bg-gray-900/80 border-purple-400/40 backdrop-blur-xl">
                <CardHeader className="p-4 sm:p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="rounded-lg bg-purple-500/20 p-2 sm:p-3 border border-purple-400/30">
                      <Target className="h-5 w-5 sm:h-6 sm:w-6 text-purple-300" />
                    </div>
                    <CardTitle className="text-xl sm:text-2xl text-white">Our Mission</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  <p className="text-base sm:text-xl text-zinc-200 leading-relaxed">
                    To empower cybersecurity professionals with AI-driven tools that deliver real-time intelligence, automated analysis, and actionable insights. We believe advanced cybersecurity must be accessible, intuitive, and effective for teams of all sizes. We foster a security-first culture that helps every organization stay ahead of emerging threats.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/80 border-violet-400/40 backdrop-blur-xl">
                <CardHeader className="p-4 sm:p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="rounded-lg bg-violet-500/20 p-2 sm:p-3 border border-violet-400/30">
                      <Globe className="h-5 w-5 sm:h-6 sm:w-6 text-violet-300" />
                    </div>
                    <CardTitle className="text-xl sm:text-2xl text-white">Our Vision</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  <p className="text-base sm:text-xl text-zinc-200 leading-relaxed">
                    A world where organizations can proactively defend against cyber threats using intelligent systems
                    that learn, adapt, and respond faster than human analysts alone. We envision seamless, AI-driven defenses woven into every layer of global digital infrastructure, enabling secure innovation without compromise.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Scroll Hint */}
            <div 
              className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity duration-200 mt-8 sm:mt-12 mb-6 sm:mb-8"
              style={{ animation: 'bounce 3s infinite' }}
              onClick={() => {
                document.getElementById('technology')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <p className="text-xs sm:text-sm text-zinc-400 mb-2 sm:mb-3 font-medium">See our impact</p>
              <div className="w-5 h-5 sm:w-6 sm:h-6 border-r-2 border-b-2 border-purple-400 transform rotate-45 opacity-70"></div>
            </div>
          </section>

          {/* Technology & Innovation - Responsive */}
          <section id="technology" className="py-12 sm:py-20">
            <div className="text-center mb-12 sm:mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Innovation at Our Core</h2>
              <p className="text-base sm:text-xl text-zinc-200 max-w-3xl mx-auto px-4 sm:px-0">
                We leverage cutting-edge technologies to stay ahead of evolving cyber threats
              </p>
            </div>

            {/* Responsive Grid: 1 col on mobile, 1 col on small tablets, 3 cols on desktop */}
            <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-3">
              <Card className="bg-gray-900/80 border-purple-400/40 backdrop-blur-xl">
                <CardHeader className="p-4 sm:p-6">
                  <div className="rounded-lg bg-purple-500/20 p-2 sm:p-3 w-fit border border-purple-500/20 mb-4">
                    <Brain className="h-6 w-6 sm:h-8 sm:w-8 text-purple-400" />
                  </div>
                  <CardTitle className="text-lg sm:text-xl text-white">Advanced AI Models</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  <p className="text-sm sm:text-base text-zinc-200 mb-4">
                    Our proprietary machine learning models are trained on the MISTRAL research dataset and continuously
                    updated with the latest threat intelligence.
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-xs sm:text-sm text-zinc-300">
                      <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-purple-400 flex-shrink-0" />
                      Deep learning threat classification
                    </li>
                    <li className="flex items-center gap-2 text-xs sm:text-sm text-zinc-300">
                      <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-purple-400 flex-shrink-0" />
                      Behavioral anomaly detection
                    </li>
                    <li className="flex items-center gap-2 text-xs sm:text-sm text-zinc-300">
                      <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-purple-400 flex-shrink-0" />
                      Predictive threat modeling
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/80 border-violet-400/40 backdrop-blur-xl">
                <CardHeader className="p-4 sm:p-6">
                  <div className="rounded-lg bg-violet-500/20 p-2 sm:p-3 w-fit border border-violet-500/20 mb-4">
                    <Zap className="h-6 w-6 sm:h-8 sm:w-8 text-violet-400" />
                  </div>
                  <CardTitle className="text-lg sm:text-xl text-white">Real-time Processing</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  <p className="text-sm sm:text-base text-zinc-200 mb-4">
                    Our distributed architecture processes thousands of network events per second, providing instant
                    threat detection and response capabilities.
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-xs sm:text-sm text-zinc-300">
                      <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-violet-400 flex-shrink-0" />
                      Stream processing engine
                    </li>
                    <li className="flex items-center gap-2 text-xs sm:text-sm text-zinc-300">
                      <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-violet-400 flex-shrink-0" />
                      Edge computing deployment
                    </li>
                    <li className="flex items-center gap-2 text-xs sm:text-sm text-zinc-300">
                      <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-violet-400 flex-shrink-0" />
                      Auto-scaling infrastructure
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/80 border-fuchsia-400/40 backdrop-blur-xl">
                <CardHeader className="p-4 sm:p-6">
                  <div className="rounded-lg bg-fuchsia-500/20 p-2 sm:p-3 w-fit border border-fuchsia-500/20 mb-4">
                    <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-fuchsia-400" />
                  </div>
                  <CardTitle className="text-lg sm:text-xl text-white">Security by Design</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  <p className="text-sm sm:text-base text-zinc-200 mb-4">
                    Built with security-first principles, our platform ensures data remains protected while
                    providing comprehensive threat visibility.
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-xs sm:text-sm text-zinc-300">
                      <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-fuchsia-400 flex-shrink-0" />
                      End-to-end encryption
                    </li>
                    <li className="flex items-center gap-2 text-xs sm:text-sm text-zinc-300">
                      <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-fuchsia-400 flex-shrink-0" />
                      Zero-trust architecture
                    </li>
                    <li className="flex items-center gap-2 text-xs sm:text-sm text-zinc-300">
                      <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-fuchsia-400 flex-shrink-0" />
                      SOC 2 Type II compliant
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Scroll Hint */}
            <div 
              className="mt-12 sm:mt-16 flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity duration-200"
              style={{
                animation: 'bounce 3s infinite'
              }}
              onClick={() => {
                document.getElementById('team')?.scrollIntoView({ 
                  behavior: 'smooth' 
                });
              }}
            >
              <p className="text-xs sm:text-sm text-zinc-400 mb-2 font-medium">Meet our team</p>
              <div className="w-5 h-5 sm:w-6 sm:h-6 border-r-2 border-b-2 border-purple-400 transform rotate-45 opacity-70"></div>
            </div>
          </section>

          {/* Team Section - Responsive */}
          <section id="team" className="py-12 sm:py-20">
            <div className="text-center mb-12 sm:mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Meet Our Team</h2>
              <p className="text-base sm:text-xl text-zinc-200 px-4 sm:px-0">
                Cybersecurity experts, AI researchers, and engineers working together to protect the digital world
              </p>
            </div>

            {/* Team Leads */}
            <div className="mb-8 sm:mb-12">
              <h3 className="text-xl sm:text-2xl font-bold text-purple-300 text-center mb-6 sm:mb-8">Team Leads</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto">
                <TeamMember
                  name="Alex Merck"
                  role="Project Lead"
                  bio="IT Consultant"
                  image="/team/alex-merck.jpeg"
                  social={{
                    linkedin: "#",
                    twitter: "#",
                    github: "#",
                  }}
                />
                <TeamMember
                  name="Vanessa Simmons"
                  role="Project Lead"
                  bio="Sr. IT Analyst"
                  image="/team/vanessa-simmons.jpg"
                  social={{
                    linkedin: "https://www.linkedin.com/in/vanessa-simmons-a969913/",
                    twitter: "#",
                    github: "#",
                  }}
                />
              </div>
            </div>

            {/* Developers */}
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-violet-300 text-center mb-6 sm:mb-8">Developers</h3>
              
              {/* First row - 3 developers - Responsive grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-6 sm:mb-8">
                <TeamMember
                  name="Andy Chen"
                  role="Developer"
                  bio="Computer Science | Electrical and Computer Engineering"
                  image="/team/andy-chen.png"
                  social={{
                    linkedin: "https://www.linkedin.com/in/andy-chen-0707aa327/",
                    twitter: "#",
                    github: "#",
                  }}
                />
                <TeamMember
                  name="Emmanuel Serrano Campa"
                  role="Developer"
                  bio="Computer Science | Electrical and Computer Engineering"
                  image="/team/emmanual-serrano.png"
                  social={{
                    linkedin: "https://www.linkedin.com/in/emmanuel-serrano-campa",
                    twitter: "#",
                    github: "#",
                  }}
                />
                <TeamMember
                  name="Ahmed Al-Ghannam"
                  role="Developer"
                  bio="Cybersecurity and Digital Forensics"
                  image="/team/ahmed-al-ghannam.png"
                  social={{
                    linkedin: "https://www.linkedin.com/in/ahmed-alghannam-ba1a632b7/",
                    twitter: "#",
                    github: "#",
                  }}
                />
              </div>
              
              {/* Second row - 2 developers centered */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto">
                <TeamMember
                  name="Fahad Al-Athel"
                  role="Developer"
                  bio="Computer Science"
                  image="/team/fahad-al-athel.png"
                  social={{
                    linkedin: "https://www.linkedin.com/in/fahad-alathel/",
                    twitter: "#",
                    github: "#",
                  }}
                />
                <TeamMember
                  name="Meshari Alsughayyir"
                  role="Developer"
                  bio="Computer Engineering"
                  image="/team/Meshari-alsughayyir.jpg"
                  social={{
                    linkedin: "https://www.linkedin.com/in/meshari-alsughayyir-37860b262/",
                    twitter: "#",
                    github: "#",
                  }}
                />
              </div>
            </div>

            {/* Scroll Hint */}
            <div 
              className="mt-12 sm:mt-16 flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity duration-200"
              style={{
                animation: 'bounce 3s infinite'
              }}
              onClick={() => {
                window.scrollTo({ 
                  top: 0, 
                  behavior: 'smooth' 
                });
              }}
            >
              <p className="text-xs sm:text-sm text-zinc-400 mb-2 font-medium">Back to top</p>
              <div className="w-5 h-5 sm:w-6 sm:h-6 border-l-2 border-t-2 border-purple-400 transform rotate-45 opacity-70"></div>
            </div>
          </section>


        </div>
      </main>

      {/* Footer - Responsive */}
      <footer className="border-t border-purple-500/20 bg-gray-950/90 backdrop-blur-xl py-8 sm:py-12 relative">
        <div className="mx-auto max-w-7xl px-3 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-gradient-to-r from-purple-500 to-violet-500 p-1.5 shadow-lg shadow-purple-500/25">
                <ShieldCheck className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                LEVANT AI
              </span>
            </div>
            <p className="text-sm text-zinc-400">© 2025 LEVANT AI. Built for cybersecurity professionals.</p>
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
            className="w-24 h-24 rounded-full mx-auto mb-4 border-2 border-purple-400/30 object-cover"
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
        </div>
      </CardContent>
    </Card>
  )
}


