import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sessionError, setSessionError] = useState(null)

  const fetchProfile = async (userId) => {
    try {
      // Add timeout to prevent hanging
      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      const timeoutPromise = new Promise((resolve) => 
        setTimeout(() => resolve({ data: null, error: { message: 'Profile fetch timeout' } }), 3000)
      )
      
      const { data, error } = await Promise.race([profilePromise, timeoutPromise])
      
      if (error) {
        console.error('Profile fetch error:', error)
        // Return null profile but don't block - user can still use app
        setProfile(null)
        return null
      }
      
      setProfile(data)
      return data
    } catch (e) {
      console.error('Profile fetch exception:', e)
      setProfile(null)
      return null
    }
  }

  // Monitor session health
  useEffect(() => {
    let healthCheckInterval = null
    
    const checkSessionHealth = async () => {
      // Skip health check if we're on the auth callback page
      if (window.location.pathname === '/auth/callback') {
        return
      }
      
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Session health check failed:', error)
          setSessionError(error.message)
          return
        }
        
        if (!session && user) {
          // Session lost but user state exists - force re-auth
          console.warn('Session lost, clearing user state')
          setUser(null)
          setProfile(null)
          setSessionError('Session expired. Please sign in again.')
        } else if (session && !user) {
          // Session exists but user state is missing - restore it
          console.log('Restoring user state from session')
          setUser(session.user)
          await fetchProfile(session.user.id)
        }
        
        setSessionError(null)
      } catch (e) {
        console.error('Session health check exception:', e)
      }
    }
    
    // Check session health every 60 seconds, but not during auth callback
    if (user && window.location.pathname !== '/auth/callback') {
      healthCheckInterval = setInterval(checkSessionHealth, 60000)
    }
    
    return () => {
      if (healthCheckInterval) clearInterval(healthCheckInterval)
    }
  }, [user])

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        fetchProfile(u.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        const p = await fetchProfile(u.id)
        setProfile(p)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithGoogle = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/auth/callback',
          scopes: [
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.compose',
            'https://www.googleapis.com/auth/calendar.readonly',
            'https://www.googleapis.com/auth/calendar.events',
            'https://www.googleapis.com/auth/drive.readonly',
            'https://www.googleapis.com/auth/drive.file',
          ].join(' '),
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          skipBrowserRedirect: false,
        }
      })
      if (error) {
        console.error('Login error:', error.message)
        setLoading(false)
      }
    } catch (e) {
      console.error('Sign in failed:', e)
      setLoading(false)
    }
  }

  const signOut = async () => {
    setLoading(true)
    try {
      // Clear local state first
      setUser(null)
      setProfile(null)
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut({ scope: 'local' })
      if (error) {
        console.warn("Supabase sign out error:", error)
      }
      
      // Only clear Supabase-related storage, not everything
      const keysToRemove = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('sb-')) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key))
      
      // Force redirect to login
      window.location.href = '/login'
    } catch (e) {
      console.error("Error during sign out:", e)
      // Force redirect even on error
      window.location.href = '/login'
    }
  }

  const refreshProfile = async () => {
    if (user) {
      const p = await fetchProfile(user.id)
      setProfile(p)
    }
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, sessionError, signInWithGoogle, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
