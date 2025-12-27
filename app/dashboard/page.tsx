"use client"

import { useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { StatsCard } from "@/components/dashboard/stats-card"
import { QuincenalOverview } from "@/components/dashboard/quincenal-overview"
import { DebtSummary } from "@/components/dashboard/debt-summary"
import { PageShell } from "@/components/dashboard/page-shell"
import { calculations } from "@/lib/calculations"
import type { QuincenalSummary } from "@/lib/types"
import { Wallet, TrendingUp, CreditCard, PiggyBank, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  const totalIncome = calculations.calculateTotalIncome(incomes, new Date().getFullYear(), new Date().getMonth() + 1)
  const totalExpenses = calculations.calculateTotalExpenses(expenses, new Date().getFullYear())
  const totalDebts = calculations.calculateTotalDebts(debts)
  const totalAssets = calculations.calculateTotalAssets(assets)
  const patrimony = calculations.calculatePatrimony(assets, debts)

  return (
    <DashboardLayout>
      <PageShell className="space-y-8">
        {/* Welcome Section */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Bienvenido, {user?.name || "Usuario"}</h1>
          <p className="text-muted-foreground">Aquí está tu resumen financiero actualizado</p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
          <div className="min-w-0">
            <StatsCard
              title="Ingresos del Mes"
              value={`$${totalIncome.toLocaleString("es-CO")}`}
              description="Total de ingresos mensuales"
              icon={Wallet}
            />
          </div>
          <div className="min-w-0">
            <StatsCard
              title="Gastos Totales"
              value={`$${totalExpenses.toLocaleString("es-CO")}`}
              description="Gastos del año actual"
              icon={TrendingUp}
            />
          </div>
          <div className="min-w-0">
            <StatsCard
              title="Deudas Activas"
              value={`$${totalDebts.toLocaleString("es-CO")}`}
              description={`${debts.filter((d) => d.status === "active").length} deudas pendientes`}
              icon={CreditCard}
              className="border-red-200"
            />
          </div>
          <div className="min-w-0">
            <StatsCard
              title="Patrimonio"
              value={`$${patrimony.toLocaleString("es-CO")}`}
              description="Activos - Pasivos"
              icon={PiggyBank}
              className="border-emerald-200"
            />
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {quincenalSummary && <QuincenalOverview summary={quincenalSummary} />}
          <DebtSummary debts={debts} />
        </div>

        {/* Assets Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Activos</CardTitle>
            <CardDescription>Tus cuentas de ahorro e inversiones</CardDescription>
          </CardHeader>
          <CardContent>
            {assets.length > 0 ? (
              <div className="space-y-3">
                {assets.map((asset) => (
                  <div key={asset.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium">{asset.account_name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{asset.account_type}</p>
                    </div>
                    <p className="text-lg font-semibold text-emerald-600">
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
