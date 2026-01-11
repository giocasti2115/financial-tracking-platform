"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/components/auth-provider"
import { LogOut, User, Settings } from "lucide-react"
import Link from "next/link"
import { AureaMark } from "@/components/ui/aurea-mark"

export function NavHeader() {
  const { user, signOut } = useAuth()

  return (
    <header className="border-b border-[rgba(17,47,69,0.1)] bg-white/85 backdrop-blur-xl supports-[backdrop-filter]:bg-white/70">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-3">
            <AureaMark
              className="h-16 w-auto drop-shadow-[0_18px_30px_rgba(3,15,28,0.35)]"
              priority
              width={512}
              height={512}
              zoom={1.25}
            />
            <div className="flex flex-col leading-tight">
              <span className="font-semibold text-lg tracking-tight text-[var(--brand-navy-900)]">Aurea Finanzas</span>
              <span className="text-xs text-[var(--brand-navy-300)]">Haz de cada quincena tu mejor inversión</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link href="/dashboard" className="text-sm font-medium text-[var(--brand-navy-500)] hover:text-[var(--brand-gold-600)] transition-colors">
              Dashboard
            </Link>
            <Link href="/expenses" className="text-sm font-medium text-[var(--brand-navy-500)] hover:text-[var(--brand-gold-600)] transition-colors">
              Gastos
            </Link>
            <Link href="/debts" className="text-sm font-medium text-[var(--brand-navy-500)] hover:text-[var(--brand-gold-600)] transition-colors">
              Deudas
            </Link>
            <Link href="/assets" className="text-sm font-medium text-[var(--brand-navy-500)] hover:text-[var(--brand-gold-600)] transition-colors">
              Activos
            </Link>
            <Link href="/projections" className="text-sm font-medium text-[var(--brand-navy-500)] hover:text-[var(--brand-gold-600)] transition-colors">
              Proyecciones
            </Link>
          </nav>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <User className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{user?.name || "Usuario"}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              Configuración
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar Sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
