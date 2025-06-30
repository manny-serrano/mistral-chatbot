"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ShieldCheck,
  MessageSquare,
  Network,
  Brain,
  Database,
  GitBranch,
  Zap,
  Users,
  TrendingUp,
  ArrowRight,
  CheckCircle,
} from "lucide-react"

export default function HomePage() {
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
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-gradient-to-r from-purple-500 to-violet-500 p-1.5 shadow-lg shadow-purple-500/25">
                <ShieldCheck className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                CyberSense AI
              </h1>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <a href="#how-it-works" className="text-sm font-medium text-zinc-400 hover:text-purple-300 transition-colors">
                How It Works
              </a>
              <a href="#features" className="text-sm font-medium text-zinc-400 hover:text-purple-300 transition-colors">
                Features
              </a>
              <a
                href="#technology"
                className="text-sm font-medium text-zinc-400 hover:text-purple-300 transition-colors"
              >
                Technology
              </a>
              <Link href="/about" className="text-sm font-medium text-zinc-400 hover:text-purple-300 transition-colors">
                About
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

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32">
        {/* Enhanced background for better contrast */}
        <div className="absolute inset-0 bg-gradient-to-r from-gray-950/90 via-purple-950/50 to-gray-950/90" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/40 via-transparent to-transparent" />

        <div className="relative mx-auto max-w-7xl px-6">
          <div className="text-center">
            <Badge
              variant="outline"
              className="mb-6 border-purple-400/30 bg-purple-500/10 text-purple-300 backdrop-blur-sm"
            >
              Powered by AI & MISTRAL Research Dataset
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl text-white">
              Intelligent{" "}
              <span className="bg-gradient-to-r from-purple-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                Cybersecurity
              </span>{" "}
              Assistant
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-xl leading-8 text-zinc-200">
              Analyze and investigate network traffic through natural language conversations. Powered by AI to detect
              threats, trace communication paths, and suggest mitigation steps.
            </p>
            <div className="mt-10 flex items-center justify-center">
              <Link href="/login">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white shadow-xl shadow-purple-500/25 border border-purple-400/20"
                >
                  Start Analysis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            {/* Scroll Hint */}
            <div 
              className="mt-16 flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity duration-200"
              style={{
                animation: 'bounce 3s infinite'
              }}
              onClick={() => {
                document.getElementById('how-it-works')?.scrollIntoView({ 
                  behavior: 'smooth' 
                });
              }}
            >
              <p className="text-sm text-zinc-400 mb-2 font-medium">Scroll to explore</p>
              <div className="w-6 h-6 border-r-2 border-b-2 border-purple-400 transform rotate-45 opacity-70"></div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 lg:py-32 relative">
        {/* Enhanced background for better contrast */}
        <div className="absolute inset-0 bg-gradient-to-r from-gray-950/90 via-purple-950/50 to-gray-950/90" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/40 via-transparent to-transparent" />

        <div className="relative mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold tracking-tight sm:text-5xl text-white mb-4">
              How It Works
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-xl text-zinc-200">
              Get started with network security analysis in three simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
            {/* Step 1 */}
            <div className="text-center group">
              <div className="flex items-center justify-center mb-6">
                <div className="relative">
                  <div className="rounded-full bg-gradient-to-br from-purple-500/20 to-purple-600/10 p-8 group-hover:from-purple-500/30 group-hover:to-purple-600/20 transition-all duration-300 backdrop-blur-sm border border-purple-500/20 group-hover:border-purple-400/40">
                    <ShieldCheck className="h-10 w-10 text-purple-400" />
                  </div>
                  <div className="absolute -top-2 -right-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                    1
                  </div>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Log In with DukeNetID</h3>
              <p className="text-base text-zinc-200 leading-relaxed">
                Securely authenticate using your Duke University credentials through our integrated SSO (Single Sign-On) system for seamless and secure access.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center group">
              <div className="flex items-center justify-center mb-6">
                <div className="relative">
                  <div className="rounded-full bg-gradient-to-br from-violet-500/20 to-violet-600/10 p-8 group-hover:from-violet-500/30 group-hover:to-violet-600/20 transition-all duration-300 backdrop-blur-sm border border-violet-500/20 group-hover:border-violet-400/40">
                    <MessageSquare className="h-10 w-10 text-violet-400" />
                  </div>
                  <div className="absolute -top-2 -right-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                    2
                  </div>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Ask Natural Questions</h3>
              <p className="text-base text-zinc-200 leading-relaxed">
                Simply type your questions in plain English. "Show me suspicious traffic from the last hour" or "Which IPs are communicating with known threat actors?"
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center group">
              <div className="flex items-center justify-center mb-6">
                <div className="relative">
                  <div className="rounded-full bg-gradient-to-br from-fuchsia-500/20 to-fuchsia-600/10 p-8 group-hover:from-fuchsia-500/30 group-hover:to-fuchsia-600/20 transition-all duration-300 backdrop-blur-sm border border-fuchsia-500/20 group-hover:border-fuchsia-400/40">
                    <Brain className="h-10 w-10 text-fuchsia-400" />
                  </div>
                  <div className="absolute -top-2 -right-2 bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                    3
                  </div>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Get AI Insights</h3>
              <p className="text-base text-zinc-200 leading-relaxed">
                Receive detailed analysis, visual network graphs, threat assessments, and actionable recommendations powered by advanced AI models.
              </p>
            </div>
          </div>

          {/* Connection lines for desktop */}
          <div className="hidden lg:block absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-5xl">
            <div className="relative">
              <div className="absolute top-0 left-1/6 right-1/6 h-px bg-gradient-to-r from-purple-500/50 via-violet-500/50 to-fuchsia-500/50"></div>
              <div className="absolute top-0 left-1/3 w-2 h-2 bg-violet-500 rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
              <div className="absolute top-0 right-1/3 w-2 h-2 bg-fuchsia-500 rounded-full transform translate-x-1/2 -translate-y-1/2"></div>
            </div>
          </div>

          {/* Scroll Hint */}
          <div 
            className="mt-16 flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity duration-200"
            style={{
              animation: 'bounce 3s infinite'
            }}
            onClick={() => {
              document.getElementById('features')?.scrollIntoView({ 
                behavior: 'smooth' 
              });
            }}
          >
            <p className="text-sm text-zinc-400 mb-2 font-medium">See our features</p>
            <div className="w-6 h-6 border-r-2 border-b-2 border-purple-400 transform rotate-45 opacity-70"></div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 lg:py-32 relative">
        {/* Enhanced background for better contrast */}
        <div className="absolute inset-0 bg-gradient-to-r from-gray-950/90 via-purple-950/50 to-gray-950/90" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/40 via-transparent to-transparent" />

        <div className="relative mx-auto max-w-7xl px-6">
          <div className="text-center">
            <h2 className="text-4xl font-bold tracking-tight sm:text-5xl text-white mb-4">
              Advanced Threat Detection & Analysis
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-xl text-zinc-200">
              Comprehensive cybersecurity tools powered by AI to keep your network secure
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 lg:grid-cols-3">
            <Card className="bg-gray-900/80 border-purple-400/40 hover:bg-gray-900/90 transition-all duration-300 backdrop-blur-xl hover:border-purple-400/60 hover:shadow-xl hover:shadow-purple-500/20">
              <CardHeader>
                <div className="rounded-lg bg-purple-500/10 p-2 w-fit border border-purple-500/20">
                  <MessageSquare className="h-8 w-8 text-purple-400" />
                </div>
                <CardTitle className="text-xl text-white">Natural Language Queries</CardTitle>
                <CardDescription className="text-base text-zinc-200">
                  Ask questions about network traffic in plain English. No complex queries required.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-base text-zinc-200">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-purple-400" />
                    Identify suspicious IP addresses
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-purple-400" />
                    Trace communication paths
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-purple-400" />
                    Detect potential threats
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/80 border-violet-400/40 hover:bg-gray-900/90 transition-all duration-300 backdrop-blur-xl hover:border-violet-400/60 hover:shadow-xl hover:shadow-violet-500/20">
              <CardHeader>
                <div className="rounded-lg bg-violet-500/10 p-2 w-fit border border-violet-500/20">
                  <Network className="h-8 w-8 text-violet-400" />
                </div>
                <CardTitle className="text-xl text-white">Network Visualization</CardTitle>
                <CardDescription className="text-base text-zinc-200">
                  Interactive network graphs showing IP relationships and traffic patterns.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-base text-zinc-200">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-violet-400" />
                    Real-time traffic visualization
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-violet-400" />
                    Interactive node exploration
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-violet-400" />
                    Threat pattern recognition
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/80 border-fuchsia-400/40 hover:bg-gray-900/90 transition-all duration-300 backdrop-blur-xl hover:border-fuchsia-400/60 hover:shadow-xl hover:shadow-fuchsia-500/20">
              <CardHeader>
                <div className="rounded-lg bg-fuchsia-500/10 p-2 w-fit border border-fuchsia-500/20">
                  <Brain className="h-8 w-8 text-fuchsia-400" />
                </div>
                <CardTitle className="text-xl text-white">AI-Powered Analysis</CardTitle>
                <CardDescription className="text-base text-zinc-200">
                  Advanced AI models analyze traffic patterns against known malicious signatures.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-base text-zinc-200">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-fuchsia-400" />
                    Honeypot data comparison
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-fuchsia-400" />
                    Automated threat scoring
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-fuchsia-400" />
                    Mitigation recommendations
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Scroll Hint */}
          <div 
            className="mt-16 flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity duration-200"
            style={{
              animation: 'bounce 3s infinite'
            }}
            onClick={() => {
              document.getElementById('technology')?.scrollIntoView({ 
                behavior: 'smooth' 
              });
            }}
          >
            <p className="text-sm text-zinc-400 mb-2 font-medium">View technology</p>
            <div className="w-6 h-6 border-r-2 border-b-2 border-purple-400 transform rotate-45 opacity-70"></div>
          </div>
        </div>
      </section>

      {/* Technology Stack */}
      <section id="technology" className="py-20 lg:py-32 relative">
        {/* Enhanced background for better contrast */}
        <div className="absolute inset-0 bg-gradient-to-r from-gray-950/90 via-purple-950/50 to-gray-950/90" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/40 via-transparent to-transparent" />

        <div className="relative mx-auto max-w-7xl px-6">
          <div className="text-center">
            <h2 className="text-4xl font-bold tracking-tight sm:text-5xl text-white mb-4">
              Powered by Advanced Technology
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-xl text-zinc-200">
              Built with cutting-edge tools for maximum performance and reliability
            </p>
          </div>

          <div className="mt-16 grid grid-cols-2 gap-8 lg:grid-cols-4">
            <div className="flex flex-col items-center text-center group">
              <div className="rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 p-4 mb-4 group-hover:from-purple-500/30 group-hover:to-purple-600/20 transition-all duration-300 backdrop-blur-sm border border-purple-500/20 group-hover:border-purple-400/40">
                <GitBranch className="h-8 w-8 text-purple-400" />
              </div>
              <h3 className="font-semibold text-white text-lg">LangChain</h3>
              <p className="text-base text-zinc-200 mt-2">Smart agent orchestration</p>
            </div>

            <div className="flex flex-col items-center text-center group">
              <div className="rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-600/10 p-4 mb-4 group-hover:from-violet-500/30 group-hover:to-violet-600/20 transition-all duration-300 backdrop-blur-sm border border-violet-500/20 group-hover:border-violet-400/40">
                <Database className="h-8 w-8 text-violet-400" />
              </div>
              <h3 className="font-semibold text-white text-lg">Milvus Vector DB</h3>
              <p className="text-base text-zinc-200 mt-2">Similarity search</p>
            </div>

            <div className="flex flex-col items-center text-center group">
              <div className="rounded-xl bg-gradient-to-br from-fuchsia-500/20 to-fuchsia-600/10 p-4 mb-4 group-hover:from-fuchsia-500/30 group-hover:to-fuchsia-600/20 transition-all duration-300 backdrop-blur-sm border border-fuchsia-500/20 group-hover:border-fuchsia-400/40">
                <Network className="h-8 w-8 text-fuchsia-400" />
              </div>
              <h3 className="font-semibold text-white text-lg">Neo4j Graph DB</h3>
              <p className="text-base text-zinc-200 mt-2">Relationship mapping</p>
            </div>

            <div className="flex flex-col items-center text-center group">
              <div className="rounded-xl bg-gradient-to-br from-indigo-500/20 to-indigo-600/10 p-4 mb-4 group-hover:from-indigo-500/30 group-hover:to-indigo-600/20 transition-all duration-300 backdrop-blur-sm border border-indigo-500/20 group-hover:border-indigo-400/40">
                <Brain className="h-8 w-8 text-indigo-400" />
              </div>
              <h3 className="font-semibold text-white text-lg">DukeGPT</h3>
              <p className="text-base text-zinc-200 mt-2">Powered by Duke's AI Suite</p>
            </div>
          </div>

          {/* Scroll Hint */}
          <div 
            className="mt-16 flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity duration-200"
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
            <p className="text-sm text-zinc-400 mb-2 font-medium">Back to top</p>
            <div className="w-6 h-6 border-l-2 border-t-2 border-purple-400 transform rotate-45 opacity-70"></div>
          </div>
        </div>
      </section>





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
