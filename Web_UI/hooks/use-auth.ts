"use client"

import { useState, useEffect, useCallback } from 'react'

interface User {
  eppn: string // eduPersonPrincipalName
  affiliation: string // eduPersonScopedAffiliation
  displayName: string
  givenName: string
  surname: string
  mail: string
  dukeID: string
}

interface AuthState {
  isAuthenticated: boolean
  user: User | null
  loading: boolean
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    loading: true
  })

  const checkAuthStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/session')
      
      if (response.ok) {
        const data = await response.json()
        setAuthState({
          isAuthenticated: data.authenticated,
          user: data.user || null,
          loading: false
        })
      } else {
        setAuthState({
          isAuthenticated: false,
          user: null,
          loading: false
        })
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      setAuthState({
        isAuthenticated: false,
        user: null,
        loading: false
      })
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/session', { method: 'DELETE' })
      setAuthState({
        isAuthenticated: false,
        user: null,
        loading: false
      })
      // Redirect to login
      window.location.href = '/login'
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }, [])

  const loginWithDuke = useCallback(() => {
    window.location.href = '/api/auth/sso'
  }, [])

  useEffect(() => {
    checkAuthStatus()
  }, [checkAuthStatus])

  return {
    ...authState,
    logout,
    loginWithDuke,
    checkAuthStatus
  }
} 