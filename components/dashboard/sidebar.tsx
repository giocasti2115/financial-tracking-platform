"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth-provider"
import {
  LayoutDashboard,
  Receipt,
  CreditCard,
  PiggyBank,
  TrendingUp,
  LogOut,
  User,
  Menu,
  X,
  ChevronLeft,
  Coffee,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { AureaMark } from "@/components/ui/aurea-mark"

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const { user, signOut } = useAuth()
  const pathname = usePathname()
  const sidebarBackground =
    "radial-gradient(circle at 15% 18%, rgba(217,164,65,0.25), transparent 42%), radial-gradient(circle at 80% 0%, rgba(6,38,63,0.35), transparent 55%), linear-gradient(180deg, #02070f 0%, #041724 55%, #082b47 100%)"

  const menuItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/income", label: "Ingresos", icon: TrendingUp },
    { href: "/expenses", label: "Gastos", icon: Receipt },
    { href: "/micro-expenses", label: "Gastos Hormiga", icon: Coffee },
    { href: "/debts", label: "Deudas", icon: CreditCard },
    { href: "/assets", label: "Activos", icon: PiggyBank },
    { href: "/projections", label: "Proyecciones", icon: TrendingUp },
  ]

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsMobileOpen(false)} />
      )}

      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 text-[var(--brand-ivory)] bg-[var(--brand-navy-900)]/80 shadow-sm lg:hidden"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Sidebar */}
      <aside
        style={{ backgroundImage: sidebarBackground }}
        className={cn(
          "fixed left-0 top-0 z-40 h-screen text-[var(--brand-ivory)] border-r border-white/10 shadow-[0_25px_50px_rgba(2,6,23,0.65)] transition-all duration-300",
          "backdrop-blur-xl",
          isCollapsed ? "w-16" : "w-64",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-white/10">
            {!isCollapsed && (
              <Link href="/dashboard" className="flex items-center gap-3">
                <AureaMark
                  className="h-16 w-auto drop-shadow-[0_30px_55px_rgba(2,8,21,0.5)]"
                  width={512}
                  height={512}
                  zoom={1.15}
                />
                <div className="flex flex-col leading-tight">
                  <span className="font-semibold text-base tracking-tight text-white">Aurea Finanzas</span>
                  {/*<span className="text-xs text-white/80">Haz de cada quincena tu mejor inversión</span>*/}
                </div>
              </Link>
            )}
            {isCollapsed && (
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mx-auto">
                <AureaMark className="h-9 w-auto" width={512} height={512} zoom={1.1} />
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:flex text-[var(--brand-ivory)]"
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              <ChevronLeft className={cn("h-4 w-4 transition-transform", isCollapsed && "rotate-180")} />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={cn(
                    "relative flex items-center gap-3 py-2 rounded-2xl border transition-all font-medium",
                    isCollapsed ? "px-2" : "pl-6 pr-3",
                    isActive
                      ? "bg-white/8 border-[#d9a441]/40 text-white shadow-[0_18px_30px_rgba(0,0,0,0.35)]"
                      : "text-white/70 border-transparent hover:bg-white/5",
                    isCollapsed && "justify-center",
                  )}
                >
                  {!isCollapsed && isActive && (
                    <span className="absolute left-3 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full bg-[#d9a441]" />
                  )}
                  <Icon
                    className={cn("h-5 w-5 flex-shrink-0", isActive ? "text-[#d9a441]" : "text-white/70")}
                  />
                  {!isCollapsed && <span>{item.label}</span>}
                </Link>
              )
            })}
          </nav>

          {/* User Section */}
          <div className="p-4 border-t border-white/10">
            {!isCollapsed ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 px-3 py-2">
                  <div className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center shadow-inner shadow-black/30">
                    <User className="h-4 w-4 text-[var(--brand-gold-400)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user?.name || "Usuario"}</p>
                    <p className="text-xs text-[rgba(255,255,255,0.6)] truncate">{user?.email}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-red-200 hover:text-red-100 hover:bg-red-500/10"
                  onClick={signOut}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Cerrar Sesión
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="w-full text-red-200 hover:text-red-100 hover:bg-red-500/10"
                onClick={signOut}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
