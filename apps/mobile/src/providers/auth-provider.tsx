import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import * as SecureStore from "expo-secure-store"
import { authApi, type AuthUser } from "@/lib/auth-api"

type AuthState = {
  user: AuthUser | null
  accessToken: string | null
  refreshToken: string | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (name: string, email: string, password: string) => Promise<void>
  refreshSession: () => Promise<string | null>
  signOut: () => Promise<void>
}

const STORAGE_KEYS = {
  accessToken: "aurea_access_token",
  refreshToken: "aurea_refresh_token",
  user: "aurea_user",
} as const

const AuthContext = createContext<AuthState | null>(null)

const persistSession = async (payload: { accessToken: string; refreshToken: string; user: AuthUser }) => {
  await Promise.all([
    SecureStore.setItemAsync(STORAGE_KEYS.accessToken, payload.accessToken),
    SecureStore.setItemAsync(STORAGE_KEYS.refreshToken, payload.refreshToken),
    SecureStore.setItemAsync(STORAGE_KEYS.user, JSON.stringify(payload.user)),
  ])
}

const clearSession = async () => {
  await Promise.all([
    SecureStore.deleteItemAsync(STORAGE_KEYS.accessToken),
    SecureStore.deleteItemAsync(STORAGE_KEYS.refreshToken),
    SecureStore.deleteItemAsync(STORAGE_KEYS.user),
  ])
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState<string | null>(null)

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const [storedAccessToken, storedRefreshToken, storedUser] = await Promise.all([
          SecureStore.getItemAsync(STORAGE_KEYS.accessToken),
          SecureStore.getItemAsync(STORAGE_KEYS.refreshToken),
          SecureStore.getItemAsync(STORAGE_KEYS.user),
        ])

        if (!storedAccessToken || !storedRefreshToken || !storedUser) {
          setLoading(false)
          return
        }

        setAccessToken(storedAccessToken)
        setRefreshToken(storedRefreshToken)
        setUser(JSON.parse(storedUser) as AuthUser)
      } finally {
        setLoading(false)
      }
    }

    bootstrap()
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const data = await authApi.login(email.trim().toLowerCase(), password)
    setUser(data.user)
    setAccessToken(data.accessToken)
    setRefreshToken(data.refreshToken)
    await persistSession(data)
  }, [])

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    const data = await authApi.register(name, email.trim().toLowerCase(), password)
    setUser(data.user)
    setAccessToken(data.accessToken)
    setRefreshToken(data.refreshToken)
    await persistSession(data)
  }, [])

  const refreshSession = useCallback(async () => {
    if (!refreshToken) {
      await clearSession()
      setUser(null)
      setAccessToken(null)
      setRefreshToken(null)
      return null
    }

    try {
      const data = await authApi.refresh(refreshToken)
      setAccessToken(data.accessToken)
      await SecureStore.setItemAsync(STORAGE_KEYS.accessToken, data.accessToken)
      return data.accessToken
    } catch {
      await clearSession()
      setUser(null)
      setAccessToken(null)
      setRefreshToken(null)
      return null
    }
  }, [refreshToken])

  const signOut = useCallback(async () => {
    setUser(null)
    setAccessToken(null)
    setRefreshToken(null)
    await clearSession()
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      user,
      accessToken,
      refreshToken,
      loading,
      signIn,
      signUp,
      refreshSession,
      signOut,
    }),
    [user, accessToken, refreshToken, loading, signIn, signUp, refreshSession, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider")
  }
  return context
}