"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { ShieldCheck } from 'lucide-react'

interface DukeSSOButtonProps {
  className?: string
  variant?: 'default' | 'outline'
  redirectPath?: string
}

export default function DukeSSOButton({ className, variant = 'default', redirectPath = '/dashboard' }: DukeSSOButtonProps) {
  const handleDukeSSO = () => {
    // Build SSO URL with redirect parameter
    const ssoUrl = new URL('/api/auth/sso', window.location.origin)
    if (redirectPath) {
      ssoUrl.searchParams.set('redirect', redirectPath)
    }
    window.location.href = ssoUrl.toString()
  }

  return (
    <Button 
      onClick={handleDukeSSO}
      variant={variant}
      className={`w-full ${className}`}
    >
      <ShieldCheck className="mr-2 h-4 w-4" />
      Sign in with Duke NetID
    </Button>
  )
} 