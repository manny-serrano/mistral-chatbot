"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ShieldCheck, Mail, ArrowLeft, CheckCircle } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000))

    setIsLoading(false)
    setIsSubmitted(true)
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
              <Link href="/login" className="text-sm font-medium text-zinc-400 hover:text-purple-300 transition-colors">
                Sign In
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
                  {isSubmitted ? (
                    <CheckCircle className="h-8 w-8 text-white" />
                  ) : (
                    <Mail className="h-8 w-8 text-white" />
                  )}
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-white">
                {isSubmitted ? "Check your email" : "Forgot your password?"}
              </CardTitle>
              <CardDescription className="text-zinc-300">
                {isSubmitted
                  ? "We've sent a password reset link to your email address."
                  : "Enter your email address and we'll send you a link to reset your password."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!isSubmitted ? (
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

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white shadow-lg shadow-purple-500/25"
                  >
                    {isLoading ? "Sending..." : "Send Reset Link"}
                  </Button>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
                    <p className="text-sm text-green-300">
                      If an account with that email exists, we've sent you a password reset link. Please check your
                      inbox and spam folder.
                    </p>
                  </div>
                  <Button
                    onClick={() => setIsSubmitted(false)}
                    variant="outline"
                    className="w-full border-purple-400/40 text-zinc-200 hover:bg-purple-900/40 bg-transparent"
                  >
                    Send Another Email
                  </Button>
                </div>
              )}

              <div className="text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-sm text-purple-300 hover:text-purple-200 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Sign In
                </Link>
              </div>

              {!isSubmitted && (
                <div className="text-center">
                  <p className="text-sm text-zinc-400">
                    Don't have an account?{" "}
                    <Link href="/signup" className="text-purple-300 hover:text-purple-200 transition-colors">
                      Sign up
                    </Link>
                  </p>
                </div>
              )}
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
