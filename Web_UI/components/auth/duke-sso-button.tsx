"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { ShieldCheck } from 'lucide-react'

interface DukeSSOButtonProps {
  className?: string
  variant?: 'default' | 'outline'
}

export default function DukeSSOButton({ className, variant = 'default' }: DukeSSOButtonProps) {
  const handleDukeSSO = () => {
    // Redirect to Duke SSO
    window.location.href = '/api/auth/sso'
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