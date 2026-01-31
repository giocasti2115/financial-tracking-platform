"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { auth } from "@/lib/auth"
import { Copy, Loader2 } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { cn } from "@/lib/utils"
import { AureaMark } from "@/components/ui/aurea-mark"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"

const getInitialLoginState = () => ({
  email: "",
  password: "",
})

const getInitialSignupState = () => ({
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
})

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState(getInitialLoginState)
  const [mode, setMode] = useState<"login" | "signup">("login")
  const [signupData, setSignupData] = useState(getInitialSignupState)
  const [signupLoading, setSignupLoading] = useState(false)
  const [forgotOpen, setForgotOpen] = useState(false)
  const [forgotStep, setForgotStep] = useState<"request" | "reset" | "success">("request")
  const [forgotEmail, setForgotEmail] = useState("")
  const [tempExpiresAt, setTempExpiresAt] = useState<string | null>(null)
  const [forgotError, setForgotError] = useState<string | null>(null)
  const [forgotLoading, setForgotLoading] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [copiedTemp, setCopiedTemp] = useState(false)
  const [resetFields, setResetFields] = useState({
    temporaryPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const router = useRouter()
  const { setUser } = useAuth()
  const { toast } = useToast()

  const isLoginMode = mode === "login"
  const heroGradient =
    "radial-gradient(circle at 18% 22%, rgba(247,210,140,0.35), transparent 42%), radial-gradient(circle at 82% 0%, rgba(255,255,255,0.12), transparent 50%), linear-gradient(135deg, #030915 0%, #07162c 55%, #0f2747 78%, #f2c77a 100%)"

  const handleModeChange = (nextMode: "login" | "signup") => {
    if (nextMode === mode) return

    if (mode === "signup") {
      setSignupData(getInitialSignupState())
    } else {
      setFormData(getInitialLoginState())
    }

    setMode(nextMode)
    setError(null)
    setLoading(false)
    setSignupLoading(false)
  }

  const resetForgotState = () => {
    setForgotStep("request")
    setTempExpiresAt(null)
    setForgotError(null)
    setForgotLoading(false)
    setResetLoading(false)
    setCopiedTemp(false)
    setResetFields({ temporaryPassword: "", newPassword: "", confirmPassword: "" })
  }

  const handleForgotDialogChange = (nextOpen: boolean) => {
    setForgotOpen(nextOpen)
    if (!nextOpen) {
      resetForgotState()
    }
  }

  const openForgotDialog = () => {
    resetForgotState()
    setForgotEmail((formData.email || signupData.email || "").trim())
    setForgotOpen(true)
  }

  const handleForgotRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setForgotError(null)

    const emailValue = forgotEmail.trim()
    if (!emailValue) {
      setForgotError("Ingresa el correo asociado a tu cuenta.")
      return
    }

    setForgotLoading(true)
    try {
      const result = await auth.requestPasswordReset(emailValue)
      setTempExpiresAt(result.expiresAt)
      setResetFields((prev) => ({ ...prev, temporaryPassword: result.temporaryPassword }))
      setForgotStep("reset")
      toast({
        title: "Clave temporal generada",
        description: "Copia la clave y define una nueva contraseña.",
      })
    } catch (err) {
      setForgotError(err instanceof Error ? err.message : "No pudimos generar la clave temporal.")
    } finally {
      setForgotLoading(false)
    }
  }

  const handlePasswordReset = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setForgotError(null)

    if (!resetFields.temporaryPassword.trim()) {
      setForgotError("Ingresa la clave temporal enviada.")
      return
    }

    if (resetFields.newPassword.length < 8) {
      setForgotError("La nueva contraseña debe tener al menos 8 caracteres.")
      return
    }

    if (resetFields.newPassword !== resetFields.confirmPassword) {
      setForgotError("Las contraseñas no coinciden.")
      return
    }

    setResetLoading(true)
    try {
      await auth.resetPassword({
        email: forgotEmail.trim(),
        temporaryPassword: resetFields.temporaryPassword.trim(),
        newPassword: resetFields.newPassword,
      })
      setForgotStep("success")
      toast({
        title: "Contraseña actualizada",
        description: "Ya puedes iniciar sesión con tu nueva contraseña.",
      })
      setFormData((prev) => ({ ...prev, email: forgotEmail.trim(), password: "" }))
    } catch (err) {
      setForgotError(err instanceof Error ? err.message : "No pudimos actualizar la contraseña.")
    } finally {
      setResetLoading(false)
    }
  }

  const handleCopyTempPassword = async () => {
    const value = resetFields.temporaryPassword.trim()
    if (!value || typeof navigator === "undefined" || !navigator.clipboard) return
    try {
      await navigator.clipboard.writeText(value)
      setCopiedTemp(true)
      setTimeout(() => setCopiedTemp(false), 2000)
    } catch (err) {
      console.error("[forgot-password] copy error", err)
    }
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

                <button
                  type="button"
                  className="w-full text-sm font-semibold text-[var(--brand-navy-700)] underline-offset-4 hover:underline"
                  onClick={openForgotDialog}
                >
                  ¿Olvidaste tu contraseña?
                </button>

                <p className="text-xs text-center text-muted-foreground">
                  Si olvidaste tu contraseña, genera una clave temporal y cámbiala desde el enlace anterior.
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

          <Dialog open={forgotOpen} onOpenChange={handleForgotDialogChange}>
            <DialogContent className="sm:max-w-lg">
              {forgotStep === "request" && (
                <form className="space-y-4" onSubmit={handleForgotRequest}>
                  <DialogHeader>
                    <DialogTitle>¿Olvidaste tu contraseña?</DialogTitle>
                    <DialogDescription>
                      Genera una clave temporal ingresando el correo con el que te registraste.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-2">
                    <Label htmlFor="forgot-email">Correo registrado</Label>
                    <Input
                      id="forgot-email"
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(event) => setForgotEmail(event.target.value)}
                      placeholder="tu-correo@ejemplo.com"
                    />
                  </div>

                  {forgotError && <p className="text-sm text-red-600">{forgotError}</p>}

                  <DialogFooter className="flex flex-col gap-2 sm:flex-row">
                    <Button type="button" variant="outline" onClick={() => handleForgotDialogChange(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={forgotLoading}>
                      {forgotLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Generar clave temporal"}
                    </Button>
                  </DialogFooter>
                </form>
              )}

              {forgotStep === "reset" && (
                <form className="space-y-4" onSubmit={handlePasswordReset}>
                  <DialogHeader>
                    <DialogTitle>Clave temporal generada</DialogTitle>
                    <DialogDescription>
                      Copia la clave temporal y define tu nueva contraseña. Válida durante 60 minutos.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-2">
                    <Label htmlFor="temp-password">Clave temporal</Label>
                    <div className="flex gap-2">
                      <Input
                        id="temp-password"
                        value={resetFields.temporaryPassword}
                        onChange={(event) =>
                          setResetFields((prev) => ({ ...prev, temporaryPassword: event.target.value }))
                        }
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="shrink-0"
                        onClick={handleCopyTempPassword}
                        disabled={!resetFields.temporaryPassword}
                        title="Copiar clave temporal"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    {copiedTemp && <p className="text-xs text-emerald-700">¡Clave copiada al portapapeles!</p>}
                    {tempExpiresAt && (
                      <p className="text-xs text-muted-foreground">
                        Expira el {new Date(tempExpiresAt).toLocaleString("es-CO", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="new-password">Nueva contraseña</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={resetFields.newPassword}
                      onChange={(event) =>
                        setResetFields((prev) => ({ ...prev, newPassword: event.target.value }))
                      }
                      placeholder="••••••••"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="confirm-new-password">Confirmar contraseña</Label>
                    <Input
                      id="confirm-new-password"
                      type="password"
                      value={resetFields.confirmPassword}
                      onChange={(event) =>
                        setResetFields((prev) => ({ ...prev, confirmPassword: event.target.value }))
                      }
                      placeholder="••••••••"
                    />
                  </div>

                  {forgotError && <p className="text-sm text-red-600">{forgotError}</p>}

                  <DialogFooter className="flex flex-col gap-2 sm:flex-row">
                    <Button type="button" variant="outline" onClick={() => handleForgotDialogChange(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={resetLoading}>
                      {resetLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Actualizar contraseña"}
                    </Button>
                  </DialogFooter>
                </form>
              )}

              {forgotStep === "success" && (
                <div className="space-y-4">
                  <DialogHeader>
                    <DialogTitle>Contraseña actualizada</DialogTitle>
                    <DialogDescription>
                      Inicia sesión con tu nueva contraseña para continuar gestionando tus finanzas.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter className="flex flex-col gap-2 sm:flex-row">
                    <Button type="button" variant="outline" onClick={() => handleForgotDialogChange(false)}>
                      Cerrar
                    </Button>
                    <Button
                      type="button"
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => {
                        handleForgotDialogChange(false)
                        setMode("login")
                      }}
                    >
                      Ir a iniciar sesión
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </DialogContent>
          </Dialog>

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
