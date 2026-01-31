"use client"

import { useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { QuincenalOverview } from "@/components/dashboard/quincenal-overview"
import { DebtSummary } from "@/components/dashboard/debt-summary"
import { MetricsVisualization } from "@/components/dashboard/metrics-visualization"
import { PageShell } from "@/components/dashboard/page-shell"
import { calculations } from "@/lib/calculations"
import type { QuincenalSummary } from "@/lib/types"
import { Info, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const {
    data: expenses = [],
    isLoading: expensesLoading,
  } = useQuery({
    queryKey: ["expenses"],
    queryFn: apiClient.getExpenses,
    enabled: !authLoading && Boolean(user),
  })

  const {
    data: incomes = [],
    isLoading: incomesLoading,
  } = useQuery({
    queryKey: ["incomes"],
    queryFn: apiClient.getIncomes,
    enabled: !authLoading && Boolean(user),
  })

  const {
    data: debts = [],
    isLoading: debtsLoading,
  } = useQuery({
    queryKey: ["debts"],
    queryFn: apiClient.getDebts,
    enabled: !authLoading && Boolean(user),
  })

  const {
    data: assets = [],
    isLoading: assetsLoading,
  } = useQuery({
    queryKey: ["assets"],
    queryFn: apiClient.getAssets,
    enabled: !authLoading && Boolean(user),
  })

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
      return
    }
  }, [user, authLoading, router])

  const quincenalSummary = useMemo<QuincenalSummary | null>(() => {
    if (!user) {
      return null
    }

    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1
    const currentDay = now.getDate()
    const period = currentDay <= 28 ? "primera_quincena" : "segunda_quincena"

    return calculations.getQuincenalSummary(incomes, expenses, currentYear, currentMonth, period)
  }, [user, incomes, expenses])

  const isLoading = authLoading || expensesLoading || incomesLoading || debtsLoading || assetsLoading

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-gold-600)]" />
      </div>
    )
  }

  const totalDebts = calculations.calculateTotalDebts(debts)
  const totalAssets = calculations.calculateTotalAssets(assets)
  const patrimony = calculations.calculatePatrimony(assets, debts)
  const activeDebtCount = debts.filter((d) => d.status === "active").length

  const summaryCards = [
    {
      key: "assets",
      title: "Total Activos",
      description: "Cuentas e inversiones",
      value: totalAssets,
      background: "bg-[#fff7ec]",
      border: "border-[#f0e2cf]",
      textColor: "text-[#1f2a37]",
      shadow: "shadow-[0_20px_35px_rgba(4,23,36,0.08)]",
      footnote: `${assets.length} cuentas registradas`,
    },
    {
      key: "debts",
      title: "Total Pasivos",
      description: "Deudas vigentes",
      value: totalDebts,
      background: "bg-[#fbeff2]",
      border: "border-[#f3d4db]",
      textColor: "text-[#7a1f2d]",
      shadow: "shadow-[0_20px_35px_rgba(122,31,45,0.1)]",
      footnote: `${activeDebtCount} deudas activas`,
    },
    {
      key: "patrimony",
      title: "Patrimonio",
      description: "Activos - Pasivos",
      value: patrimony,
      background: patrimony >= 0 ? "bg-[#f4f8f1]" : "bg-[#fbeff2]",
      border: patrimony >= 0 ? "border-[#dfe8d5]" : "border-[#f3d4db]",
      textColor: patrimony >= 0 ? "text-[#2f5130]" : "text-[#7a1f2d]",
      shadow: "shadow-[0_20px_35px_rgba(4,23,36,0.08)]",
      footnote: patrimony >= 0 ? "Saldo positivo" : "Patrimonio negativo",
    },
  ]

  return (
    <DashboardLayout>
      <PageShell className="space-y-8">
        {/* Welcome Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Bienvenido, {user?.name || "Usuario"}</h1>
            <Tooltip>
              <TooltipTrigger
                type="button"
                className="text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Descripción del tablero general"
              >
                <Info className="h-4 w-4" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                Revisa de un vistazo tus activos, pasivos y flujo neto para el periodo actual.
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="text-muted-foreground">Aquí está tu resumen financiero actualizado</p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          {summaryCards.map((card) => (
            <Card
              key={card.key}
              className={`${card.background} ${card.border} ${card.shadow} border rounded-2xl backdrop-blur-sm`}
            >
              <CardHeader>
                <CardTitle>{card.title}</CardTitle>
                <CardDescription>{card.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className={`text-4xl font-bold ${card.textColor}`}>
                  ${card.value.toLocaleString("es-CO")}
                </div>
                <p className="text-sm text-[#7b6d60] mt-2">{card.footnote}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <MetricsVisualization incomes={incomes} expenses={expenses} debts={debts} assets={assets} />

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {quincenalSummary && <QuincenalOverview summary={quincenalSummary} />}
          <DebtSummary debts={debts} />
        </div>

        {/* Assets Overview */}
        <Card className="rounded-2xl border-[#f0e2cf] bg-[#fffaf4] shadow-sm">
          <CardHeader>
            <CardTitle>Activos</CardTitle>
            <CardDescription>Tus cuentas de ahorro e inversiones</CardDescription>
          </CardHeader>
          <CardContent>
            {assets.length > 0 ? (
              <div className="space-y-3">
                {assets.map((asset) => (
                  <div
                    key={asset.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-[#f0e2cf] bg-white/70"
                  >
                    <div>
                      <p className="font-medium">{asset.account_name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{asset.account_type}</p>
                    </div>
                    <p className="text-lg font-semibold text-[#d9a441]">
                      ${asset.current_balance.toLocaleString("es-CO")}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No tienes activos registrados</p>
              </div>
            )}
          </CardContent>
        </Card>
      </PageShell>
    </DashboardLayout>
  )
}
