"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ShieldCheck, Eye, EyeOff, Mail, Lock, User, Building, Github, Chrome, CheckCircle } from "lucide-react"

export default function SignUpPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    company: "",
    jobTitle: "",
    companySize: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false,
    subscribeToUpdates: true,
  })

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle signup logic here
    console.log("Signup attempt:", formData)
    // Redirect to dashboard on successful signup
    window.location.href = "/dashboard"
  }

  const passwordStrength = (password: string) => {
    let strength = 0
    if (password.length >= 8) strength++
    if (/[A-Z]/.test(password)) strength++
    if (/[a-z]/.test(password)) strength++
    if (/[0-9]/.test(password)) strength++
    if (/[^A-Za-z0-9]/.test(password)) strength++
    return strength
  }

  const getPasswordStrengthColor = (strength: number) => {
    if (strength < 2) return "bg-red-500"
    if (strength < 4) return "bg-yellow-500"
    return "bg-green-500"
  }

  const getPasswordStrengthText = (strength: number) => {
    if (strength < 2) return "Weak"
    if (strength < 4) return "Medium"
    return "Strong"
  }

  const strength = passwordStrength(formData.password)

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

        <div className="relative w-full max-w-2xl px-6">
          <Card className="bg-gray-900/80 border-purple-400/40 backdrop-blur-xl shadow-2xl shadow-purple-500/20">
            <CardHeader className="space-y-1 text-center">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-gradient-to-r from-purple-500 to-violet-500 p-3 shadow-lg shadow-purple-500/25">
                  <ShieldCheck className="h-8 w-8 text-white" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-white">Create your account</CardTitle>
              <CardDescription className="text-zinc-300">
                Join thousands of security professionals using LEVANT AI to protect their networks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Personal Information */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-white">
                      First Name
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
                      <Input
                        id="firstName"
                        type="text"
                        placeholder="John"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange("firstName", e.target.value)}
                        className="pl-10 bg-gray-800/50 border-purple-400/30 text-white placeholder:text-zinc-400 focus:border-purple-400"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-white">
                      Last Name
                    </Label>
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Doe"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange("lastName", e.target.value)}
                      className="bg-gray-800/50 border-purple-400/30 text-white placeholder:text-zinc-400 focus:border-purple-400"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="john.doe@company.com"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      className="pl-10 bg-gray-800/50 border-purple-400/30 text-white placeholder:text-zinc-400 focus:border-purple-400"
                      required
                    />
                  </div>
                </div>

                {/* Company Information */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company" className="text-white">
                      Company
                    </Label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
                      <Input
                        id="company"
                        type="text"
                        placeholder="Acme Corp"
                        value={formData.company}
                        onChange={(e) => handleInputChange("company", e.target.value)}
                        className="pl-10 bg-gray-800/50 border-purple-400/30 text-white placeholder:text-zinc-400 focus:border-purple-400"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="jobTitle" className="text-white">
                      Job Title
                    </Label>
                    <Input
                      id="jobTitle"
                      type="text"
                      placeholder="Security Analyst"
                      value={formData.jobTitle}
                      onChange={(e) => handleInputChange("jobTitle", e.target.value)}
                      className="bg-gray-800/50 border-purple-400/30 text-white placeholder:text-zinc-400 focus:border-purple-400"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companySize" className="text-white">
                    Company Size
                  </Label>
                  <Select
                    value={formData.companySize}
                    onValueChange={(value) => handleInputChange("companySize", value)}
                  >
                    <SelectTrigger className="bg-gray-800/50 border-purple-400/30 text-white">
                      <SelectValue placeholder="Select company size" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-purple-400/30">
                      <SelectItem value="1-10">1-10 employees</SelectItem>
                      <SelectItem value="11-50">11-50 employees</SelectItem>
                      <SelectItem value="51-200">51-200 employees</SelectItem>
                      <SelectItem value="201-1000">201-1000 employees</SelectItem>
                      <SelectItem value="1000+">1000+ employees</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-white">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a strong password"
                      value={formData.password}
                      onChange={(e) => handleInputChange("password", e.target.value)}
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
                  {formData.password && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${getPasswordStrengthColor(strength)}`}
                            style={{ width: `${(strength / 5) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-zinc-400">{getPasswordStrengthText(strength)}</span>
                      </div>
                      <div className="text-xs text-zinc-400 space-y-1">
                        <div className="flex items-center gap-2">
                          <CheckCircle
                            className={`h-3 w-3 ${formData.password.length >= 8 ? "text-green-400" : "text-zinc-600"}`}
                          />
                          <span>At least 8 characters</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle
                            className={`h-3 w-3 ${/[A-Z]/.test(formData.password) ? "text-green-400" : "text-zinc-600"}`}
                          />
                          <span>One uppercase letter</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle
                            className={`h-3 w-3 ${/[0-9]/.test(formData.password) ? "text-green-400" : "text-zinc-600"}`}
                          />
                          <span>One number</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-white">
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                      className="pl-10 pr-10 bg-gray-800/50 border-purple-400/30 text-white placeholder:text-zinc-400 focus:border-purple-400"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                    <p className="text-xs text-red-400">Passwords do not match</p>
                  )}
                </div>

                {/* Terms and Updates */}
                <div className="space-y-3">
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="terms"
                      checked={formData.agreeToTerms}
                      onCheckedChange={(checked) => handleInputChange("agreeToTerms", checked as boolean)}
                      className="border-purple-400/30 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600 mt-0.5"
                      required
                    />
                    <Label htmlFor="terms" className="text-sm text-zinc-300 leading-relaxed">
                      I agree to the{" "}
                      <Link href="/terms" className="text-purple-300 hover:text-purple-200 transition-colors">
                        Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link href="/privacy" className="text-purple-300 hover:text-purple-200 transition-colors">
                        Privacy Policy
                      </Link>
                    </Label>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="updates"
                      checked={formData.subscribeToUpdates}
                      onCheckedChange={(checked) => handleInputChange("subscribeToUpdates", checked as boolean)}
                      className="border-purple-400/30 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600 mt-0.5"
                    />
                    <Label htmlFor="updates" className="text-sm text-zinc-300 leading-relaxed">
                      Send me product updates and security insights (optional)
                    </Label>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={
                    !formData.agreeToTerms ||
                    formData.password !== formData.confirmPassword ||
                    passwordStrength(formData.password) < 3
                  }
                  className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white shadow-lg shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Account
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
                  Already have an account?{" "}
                  <Link href="/login" className="text-purple-300 hover:text-purple-200 transition-colors">
                    Sign in
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
