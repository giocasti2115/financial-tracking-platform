"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { auth } from "@/lib/auth"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { cn } from "@/lib/utils"
import { AureaMark } from "@/components/ui/aurea-mark"

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({ email: "", password: "" })
  const [mode, setMode] = useState<"login" | "signup">("login")
  const [signupData, setSignupData] = useState({ name: "", email: "", password: "", confirmPassword: "" })
  const [signupLoading, setSignupLoading] = useState(false)
  const router = useRouter()
  const { setUser } = useAuth()

  const isLoginMode = mode === "login"
  const heroGradient =
    "radial-gradient(circle at 18% 22%, rgba(247,210,140,0.35), transparent 42%), radial-gradient(circle at 82% 0%, rgba(255,255,255,0.12), transparent 50%), linear-gradient(135deg, #030915 0%, #07162c 55%, #0f2747 78%, #f2c77a 100%)"

  const handleModeChange = (nextMode: "login" | "signup") => {
    setMode(nextMode)
    setError(null)
  }
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const user = await auth.login(formData.email, formData.password)
      setUser(user)
      router.push("/dashboard")
    } catch (err) {
      console.error("[v0] Sign in error:", err)
      setError(err instanceof Error ? err.message : "Error al iniciar sesión.")
    } finally {
      setLoading(false)
    }
  }

  const handleSignup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSignupLoading(true)
    setError(null)

    if (signupData.password !== signupData.confirmPassword) {
      setError("Las contraseñas no coinciden")
      setSignupLoading(false)
      return
    }

    try {
      const user = await auth.register({
        name: signupData.name.trim(),
        email: signupData.email.trim(),
        password: signupData.password,
      })
      setUser(user)
      router.push("/dashboard")
    } catch (err) {
      console.error("[v0] Sign up error:", err)
      setError(err instanceof Error ? err.message : "No pudimos crear tu cuenta.")
    } finally {
      setSignupLoading(false)
    }
  }
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left Column - Branding */}
      <div
        className="relative hidden lg:flex flex-col justify-center p-16 text-white overflow-hidden bg-[#030915]"
        style={{ backgroundImage: heroGradient }}
      >
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_70%_80%,rgba(242,199,122,0.3),transparent_60%)]" />
        <div className="relative max-w-xl space-y-10">
          <div className="space-y-6">
            <div className="flex items-center gap-6">
              <div className="w-40">
                <AureaMark
                  className="h-28 w-auto drop-shadow-[0_38px_65px_rgba(0,0,0,0.45)]"
                  priority
                  width={512}
                  height={512}
                  zoom={1.3}
                />
              </div>
              <div>
                <p className="text-4xl font-semibold tracking-tight">Aurea Finanzas</p>
                <p className="text-base text-white/70">Haz de cada quincena tu mejor inversión</p>
              </div>
            </div>
            <p className="text-xs uppercase tracking-[0.45em] text-white/55">Gestión financiera personal</p>
          </div>

          <div className="space-y-6">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 text-[var(--brand-gold-300)] flex items-center justify-center flex-shrink-0 mt-1 shadow-lg">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg">Seguimiento Quincenal</h3>
                <p className="text-white/80 text-sm">Registra tus gastos e ingresos cada quincena con precisión</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 text-[var(--brand-gold-300)] flex items-center justify-center flex-shrink-0 mt-1 shadow-lg">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg">Gestión de Deudas</h3>
                <p className="text-white/80 text-sm">Controla tus deudas y visualiza proyecciones de pago</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 text-[var(--brand-gold-300)] flex items-center justify-center flex-shrink-0 mt-1 shadow-lg">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg">Patrimonio en Tiempo Real</h3>
                <p className="text-white/80 text-sm">Calcula automáticamente tu patrimonio: Activos - Pasivos</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column - Login Form */}
      <div className="flex flex-col justify-center items-center p-8 bg-[#fdf8f1]">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Title */}
          <div className="lg:hidden text-center space-y-2 mb-8">
            <div className="mx-auto w-32">
              <AureaMark
                className="mx-auto h-20 w-auto drop-shadow-[0_28px_45px_rgba(4,12,24,0.35)]"
                width={512}
                height={512}
                priority
                zoom={1.25}
              />
            </div>
            <h1 className="text-4xl font-semibold text-[var(--brand-navy-900)]">Aurea Finanzas</h1>
            <p className="text-[var(--brand-navy-500)]">Haz de cada quincena tu mejor inversión</p>
          </div>

          <Card className="p-8 space-y-6 shadow-xl border border-[rgba(17,47,69,0.08)] bg-white/90 backdrop-blur">
            <div className="space-y-2 text-center">
              <h2 className="text-3xl font-bold tracking-tight">Bienvenido</h2>
              <p className="text-muted-foreground">
                {isLoginMode
                  ? "Inicia sesión para retomar el control de tu quincena"
                  : "Crea tu cuenta y comienza a invertir mejor cada quincena"}
              </p>
            </div>

            <div className="bg-muted rounded-full p-1 grid grid-cols-2 text-sm font-medium">
              <button
                type="button"
                className={cn(
                  "py-2 rounded-full transition-colors",
                  isLoginMode ? "bg-background shadow" : "text-muted-foreground",
                )}
                onClick={() => handleModeChange("login")}
              >
                Iniciar sesión
              </button>
              <button
                type="button"
                className={cn(
                  "py-2 rounded-full transition-colors",
                  !isLoginMode ? "bg-background shadow" : "text-muted-foreground",
                )}
                onClick={() => handleModeChange("signup")}
              >
                Crear cuenta
              </button>
            </div>

            {isLoginMode ? (
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="grid gap-2">
                  <Label htmlFor="email">Correo electrónico</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
                    placeholder="tu-correo@ejemplo.com"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={formData.password}
                    onChange={(event) => setFormData((prev) => ({ ...prev, password: event.target.value }))}
                    placeholder="••••••••"
                  />
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <Button
                  type="submit"
                  disabled={loading}
                  size="lg"
                  className="w-full bg-[var(--brand-gold-500)] hover:bg-[var(--brand-gold-600)] text-[var(--brand-navy-900)] shadow-lg shadow-[rgba(214,163,71,0.35)]"
                >
                  {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Ingresar"}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  Si olvidaste tu contraseña, contacta al administrador para restablecerla.
                </p>
              </form>
            ) : (
              <form className="space-y-4" onSubmit={handleSignup}>
                <div className="grid gap-2">
                  <Label htmlFor="signup-name">Nombre completo</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    required
                    value={signupData.name}
                    onChange={(event) => setSignupData((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder="Tu nombre"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="signup-email">Correo electrónico</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={signupData.email}
                    onChange={(event) => setSignupData((prev) => ({ ...prev, email: event.target.value }))}
                    placeholder="tu-correo@ejemplo.com"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="signup-password">Contraseña</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      required
                      value={signupData.password}
                      onChange={(event) => setSignupData((prev) => ({ ...prev, password: event.target.value }))}
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="signup-confirm">Confirmar contraseña</Label>
                    <Input
                      id="signup-confirm"
                      type="password"
                      required
                      value={signupData.confirmPassword}
                      onChange={(event) =>
                        setSignupData((prev) => ({ ...prev, confirmPassword: event.target.value }))
                      }
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <Button
                  type="submit"
                  disabled={signupLoading}
                  size="lg"
                  className="w-full bg-[var(--brand-gold-500)] hover:bg-[var(--brand-gold-600)] text-[var(--brand-navy-900)] shadow-lg shadow-[rgba(214,163,71,0.35)]"
                >
                  {signupLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Crear cuenta"}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  Al crear una cuenta aceptas el tratamiento de datos descrito en nuestras políticas internas.
                </p>
              </form>
            )}
          </Card>

          <p className="text-center text-sm text-muted-foreground">
            {isLoginMode
              ? "¿Nuevo en Aurea Finanzas? Cambia a 'Crear cuenta' para comenzar."
              : "¿Ya tienes una cuenta? Cambia a 'Iniciar sesión' cuando quieras volver."}
          </p>
        </div>
      </div>
    </div>
  )
}
