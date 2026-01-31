import { STORAGE_KEYS, storage } from "./storage"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
const NETWORK_ERROR_MESSAGE =
  "No pudimos conectar con el servidor. Verifica tu conexión e intenta nuevamente."

export interface AuthUser {
  id: string
  email: string
  name?: string
}

interface LoginResponse {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

interface RegisterPayload {
  name: string
  email: string
  password: string
}

interface ForgotPasswordResponse {
  temporaryPassword: string
  expiresAt: string
}

interface ResetPasswordPayload {
  email: string
  temporaryPassword: string
  newPassword: string
}

const safeFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  try {
    return await fetch(input, init)
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[auth] Error de red", error)
    }
    throw new Error(NETWORK_ERROR_MESSAGE)
  }
}

type ErrorIssue = {
  path?: (string | number)[]
  message: string
}

const translateValidationMessage = (message: string) => {
  if (/at least 8 character/i.test(message)) {
    return "La contraseña debe tener al menos 8 caracteres."
  }
  return message
}

const handleResponse = async <T>(response: Response): Promise<T> => {
  const payload = (await response.json().catch(() => null)) as (T & { message?: string; issues?: ErrorIssue[] }) | null

  if (!response.ok) {
    const issueMessage = payload?.issues?.[0]?.message
    const baseMessage = payload?.message || "Error autenticando"
    const finalMessage = issueMessage ? translateValidationMessage(issueMessage) : baseMessage
    throw new Error(finalMessage)
  }

  return (payload as T) ?? ({} as T)
}

export const currentUser = () => storage.get<AuthUser>(STORAGE_KEYS.USER)

export const auth = {
  getCurrentUser(): AuthUser | null {
    return currentUser()
  },

  setCurrentUser(user: AuthUser): void {
    storage.set(STORAGE_KEYS.USER, user)
  },

  getAccessToken(): string | null {
    return storage.get<string>(STORAGE_KEYS.ACCESS_TOKEN)
  },

  getRefreshToken(): string | null {
    return storage.get<string>(STORAGE_KEYS.REFRESH_TOKEN)
  },

  setSession(accessToken: string, refreshToken: string): void {
    storage.set(STORAGE_KEYS.ACCESS_TOKEN, accessToken)
    storage.set(STORAGE_KEYS.REFRESH_TOKEN, refreshToken)
  },

  clearSession(): void {
    storage.remove(STORAGE_KEYS.ACCESS_TOKEN)
    storage.remove(STORAGE_KEYS.REFRESH_TOKEN)
    storage.remove(STORAGE_KEYS.USER)
  },

  async login(email: string, password: string): Promise<AuthUser> {
    const response = await safeFetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })

    const data = await handleResponse<LoginResponse>(response)
    this.setSession(data.accessToken, data.refreshToken)
    this.setCurrentUser(data.user)
    return data.user
  },

  async register(payload: RegisterPayload): Promise<AuthUser> {
    const response = await safeFetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName: payload.name, email: payload.email, password: payload.password }),
    })

    const data = await handleResponse<LoginResponse>(response)
    this.setSession(data.accessToken, data.refreshToken)
    this.setCurrentUser(data.user)
    return data.user
  },

  async refreshAccessToken(): Promise<string | null> {
    const refreshToken = this.getRefreshToken()
    if (!refreshToken) return null

    const response = await safeFetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    })

    const data = await handleResponse<{ accessToken: string }>(response)
    storage.set(STORAGE_KEYS.ACCESS_TOKEN, data.accessToken)
    return data.accessToken
  },

  signOut(): void {
    this.clearSession()
    if (typeof window !== "undefined") {
      window.location.href = "/login"
    }
  },

  isAuthenticated(): boolean {
    return Boolean(this.getAccessToken())
  },

  async requestPasswordReset(email: string): Promise<ForgotPasswordResponse> {
    const response = await safeFetch(`${API_URL}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })

    return handleResponse<ForgotPasswordResponse>(response)
  },

  async resetPassword(payload: ResetPasswordPayload): Promise<void> {
    const response = await safeFetch(`${API_URL}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    await handleResponse<{ message: string }>(response)
  },
}
