"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { auth, type AuthUser } from "@/lib/auth"
import { STORAGE_KEYS } from "@/lib/storage"
import { useRouter } from "next/navigation"

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  signOut: () => void
  setUser: (user: AuthUser | null) => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: () => {},
  setUser: () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const currentUser = auth.getCurrentUser()
    setUser(currentUser)
    setLoading(false)

    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEYS.USER) {
        setUser(event.newValue ? JSON.parse(event.newValue) : null)
      }
    }

    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [])

  const handleSignOut = () => {
    auth.signOut()
    setUser(null)
    router.push("/login")
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut: handleSignOut, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}
