"use client"

import type React from "react"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { ShieldCheck, Eye, EyeOff, Mail, Lock, Github, Chrome } from "lucide-react"
import DukeSSOButton from "@/components/auth/duke-sso-button"

function LoginForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [redirectPath, setRedirectPath] = useState("/dashboard")
  
  const searchParams = useSearchParams()

  useEffect(() => {
    // Get the redirect parameter from URL if present
    const redirect = searchParams.get('redirect')
    if (redirect) {
      setRedirectPath(redirect)
    }
  }, [searchParams])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle login logic here
    console.log("Login attempt:", { email, password, rememberMe })
    // Redirect to the intended page after successful login
    window.location.href = redirectPath
  }

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
      <header className="border-b border-purple-500/20 bg-gray-950/80 backdrop-blur-xl relative z-10">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="rounded-md bg-gradient-to-r from-purple-500 to-violet-500 p-1.5 shadow-lg shadow-purple-500/25">
                <ShieldCheck className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                LEVANT AI
              </h1>
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/" className="text-sm font-medium text-zinc-400 hover:text-purple-300 transition-colors">
                Home
              </Link>
              <Link href="/about" className="text-sm font-medium text-zinc-400 hover:text-purple-300 transition-colors">
                About
              </Link>
              <Link
                href="/signup"
                className="text-sm font-medium text-zinc-400 hover:text-purple-300 transition-colors"
              >
                Sign Up
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative flex items-center justify-center min-h-[calc(100vh-80px)] py-12">
        {/* Enhanced background for better contrast */}
        <div className="absolute inset-0 bg-gradient-to-r from-gray-950/90 via-purple-950/50 to-gray-950/90" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/40 via-transparent to-transparent" />

        <div className="relative w-full max-w-md px-6">
          <Card className="bg-gray-900/80 border-purple-400/40 backdrop-blur-xl shadow-2xl shadow-purple-500/20">
            <CardHeader className="space-y-1 text-center">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-gradient-to-r from-purple-500 to-violet-500 p-3 shadow-lg shadow-purple-500/25">
                  <ShieldCheck className="h-8 w-8 text-white" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-white">Welcome back</CardTitle>
              <CardDescription className="text-zinc-300">
                Sign in to your LEVANT AI account to continue protecting your network
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Duke SSO Section */}
              <div className="space-y-4">
                <DukeSSOButton 
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-500/25"
                  redirectPath={redirectPath}
                />
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full bg-purple-500/20" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-gray-900 px-2 text-zinc-400">Or use local account</span>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 bg-gray-800/50 border-purple-400/30 text-white placeholder:text-zinc-400 focus:border-purple-400"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-white">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 bg-gray-800/50 border-purple-400/30 text-white placeholder:text-zinc-400 focus:border-purple-400"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                      className="border-purple-400/30 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                    />
                    <Label htmlFor="remember" className="text-sm text-zinc-300">
                      Remember me
                    </Label>
                  </div>
                  <Link
                    href="/forgot-password"
                    className="text-sm text-purple-300 hover:text-purple-200 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white shadow-lg shadow-purple-500/25"
                >
                  Sign In
                </Button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full bg-purple-500/20" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-gray-900 px-2 text-zinc-400">Or continue with</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="border-purple-400/40 text-zinc-200 hover:bg-purple-900/40 bg-transparent"
                >
                  <Github className="mr-2 h-4 w-4" />
                  GitHub
                </Button>
                <Button
                  variant="outline"
                  className="border-purple-400/40 text-zinc-200 hover:bg-purple-900/40 bg-transparent"
                >
                  <Chrome className="mr-2 h-4 w-4" />
                  Google
                </Button>
              </div>

              <div className="text-center">
                <p className="text-sm text-zinc-400">
                  Don't have an account?{" "}
                  <Link href="/signup" className="text-purple-300 hover:text-purple-200 transition-colors">
                    Sign up
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-purple-500/20 bg-gray-950/90 backdrop-blur-xl py-8 relative">
        <div className="mx-auto max-w-7xl px-6">
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

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950/40 to-gray-900 text-zinc-100 flex items-center justify-center">
        <div className="text-center">
          <div className="rounded-full bg-gradient-to-r from-purple-500 to-violet-500 p-3 shadow-lg shadow-purple-500/25 mx-auto mb-4 w-fit">
            <ShieldCheck className="h-8 w-8 text-white" />
          </div>
          <p className="text-zinc-300">Loading...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
