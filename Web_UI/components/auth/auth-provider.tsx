"use client"

import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'

interface User {
  eppn: string
  affiliation: string
  displayName: string
  givenName: string
  surname: string
  mail: string
  dukeID: string
}

interface AuthContextType {
  isAuthenticated: boolean
  user: User | null
  loading: boolean
  logout: () => Promise<void>
  loginWithDuke: () => void
  checkAuthStatus: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isMounted, setIsMounted] = useState(false)
  const auth = useAuth()

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Prevent hydration mismatch by not rendering auth context on server
  if (!isMounted) {
    return <>{children}</>
  }

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
} 