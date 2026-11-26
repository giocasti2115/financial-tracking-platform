"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AureaMark } from "@/components/ui/aurea-mark"
import { auth } from "@/lib/auth"

const readTokenFromHash = () => {
  if (typeof window === "undefined") return ""
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash
  const params = new URLSearchParams(hash)
  return params.get("token")?.trim() ?? ""
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const [token, setToken] = useState("")
  const [ready, setReady] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    setToken(readTokenFromHash())
    setReady(true)
  }, [])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!token) {
      setError("El enlace no es válido o expiró. Solicita uno nuevo desde el inicio de sesión.")
      return
    }

    if (newPassword.length < 8) {
      setError("La nueva contraseña debe tener al menos 8 caracteres.")
      return
    }

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.")
      return
    }

    setLoading(true)
    try {
      await auth.resetPassword({ token, newPassword })
      window.history.replaceState(null, "", "/reset-password")
      setToken("")
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos actualizar la contraseña.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#fff8f0] flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md p-6 sm:p-8 space-y-6 border-[#f0e2cf]">
        <div className="flex items-center gap-3">
          <AureaMark className="h-12 w-auto" width={512} height={512} />
          <div>
            <p className="font-semibold text-[var(--brand-navy-900)]">Áurea Finanzas</p>
            <p className="text-sm text-muted-foreground">Nueva contraseña</p>
          </div>
        </div>

        {!ready ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--brand-gold-600)]" />
          </div>
        ) : done ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Tu contraseña quedó actualizada. Las sesiones anteriores se cerraron. Entra de nuevo con la contraseña nueva.
            </p>
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => router.push("/login")}>
              Ir a iniciar sesión
            </Button>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <p className="text-sm text-muted-foreground">
              Elige una contraseña de al menos 8 caracteres. Este enlace solo funciona una vez.
            </p>

            {!token && (
              <p className="text-sm text-red-600">
                Este enlace no incluye un código válido. Solicita otro desde el inicio de sesión.
              </p>
            )}

            <div className="grid gap-2">
              <Label htmlFor="new-password">Nueva contraseña</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="••••••••"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="confirm-password">Confirmar contraseña</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="••••••••"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={loading || !token}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Guardar contraseña"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              <Link href="/login" className="underline">
                Volver al inicio de sesión
              </Link>
            </p>
          </form>
        )}
      </Card>
    </div>
  )
}
