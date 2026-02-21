"use client"

import { useId, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { Asset, Debt, Expense, Income } from "@/lib/types"
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Line } from "recharts"
import { StatsCard } from "@/components/dashboard/stats-card"
import { TrendingUp, ShieldCheck, PiggyBank, Flame } from "lucide-react"
import { cn, parseDateInput } from "@/lib/utils"

interface MetricsVisualizationProps {
  incomes: Income[]
  expenses: Expense[]
  debts: Debt[]
  assets: Asset[]
}

const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
})

const monthFormatter = new Intl.DateTimeFormat("es-CO", { month: "short" })

const formatMoney = (value: number) => currencyFormatter.format(Math.round(value))

const formatAxisValue = (value: number) => {
  if (Math.abs(value) >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`
  }
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`
  }
  return value.toString()
}

type InsightStatus = "positive" | "neutral" | "warning"
type Timeframe = "12m" | "6m" | "3m" | "1m"

const timeframeConfig: Record<Timeframe, { label: string; description: string; months: number }> = {
  "12m": { label: "Último año", description: "último año", months: 12 },
  "6m": { label: "Últimos 6 meses", description: "últimos 6 meses", months: 6 },
  "3m": { label: "Últimos 3 meses", description: "últimos 3 meses", months: 3 },
  "1m": { label: "Último mes", description: "último mes", months: 1 },
}

const timeframeOrder: Timeframe[] = ["12m", "6m", "3m", "1m"]

export function MetricsVisualization({ incomes, expenses, debts, assets }: MetricsVisualizationProps) {
  const incomeGradientId = useId()
  const expenseGradientId = useId()
  const [timeframe, setTimeframe] = useState<Timeframe>("6m")

  const { monthlySeries, stats, insights } = useMemo(() => {
    const now = new Date()
    const monthsToShow = timeframeConfig[timeframe].months
    const months = Array.from({ length: monthsToShow }).map((_, index) => {
      const target = new Date(now.getFullYear(), now.getMonth() - (monthsToShow - 1 - index), 1)
      return target
    })

    const monthlySeries = months.map((date) => {
      const year = date.getFullYear()
      const month = date.getMonth() + 1

      const totalIncome = incomes
        .filter((income) => income.year === year && income.month === month)
        .reduce((sum, income) => sum + income.amount, 0)

      const totalExpenses = expenses
        .filter((expense) => {
          if (expense.year !== year) return false
          const paymentDate = parseDateInput(expense.payment_date)
          if (!paymentDate) return false
          return paymentDate.getMonth() + 1 === month
        })
        .reduce((sum, expense) => sum + expense.amount, 0)

      return {
        label: `${monthFormatter.format(date)} ${String(year).slice(-2)}`,
        income: totalIncome,
        expenses: totalExpenses,
        net: totalIncome - totalExpenses,
      }
    })

    const totalAssets = assets.reduce((sum, asset) => sum + asset.current_balance, 0)
    const totalDebts = debts.filter((debt) => debt.status === "active").reduce((sum, debt) => sum + debt.current_balance, 0)
    const totalObligations = expenses.reduce((sum, expense) => sum + expense.amount, 0)
    const totalPaid = expenses.reduce((sum, expense) => sum + (expense.amount_paid || 0), 0)

    const current = monthlySeries[monthlySeries.length - 1] || { income: 0, expenses: 0, net: 0, label: "" }
    const previous = monthlySeries[monthlySeries.length - 2] || current

    const netDelta = current.net - previous.net
    const netDeltaPct = previous.net !== 0 ? (netDelta / Math.abs(previous.net)) * 100 : 0

    const burnRate = current.income > 0 ? current.expenses / current.income : current.expenses > 0 ? Infinity : 0
    const savingsRate = current.income > 0 ? current.net / current.income : 0
    const debtCoverage = totalDebts > 0 ? totalAssets / totalDebts : Infinity
    const liquidityRunway = current.expenses > 0 ? totalAssets / current.expenses : Infinity
    const collectionRate = totalObligations > 0 ? totalPaid / totalObligations : 1

    const stats = [
      {
        title: "Flujo Neto",
        value: formatMoney(current.net),
        description: `${current.label || "Este mes"}`,
        icon: TrendingUp,
        trend: { value: Number(netDeltaPct.toFixed(1)), isPositive: netDelta >= 0 },
      },
      {
        title: "Cobertura de Pasivos",
        value: totalDebts > 0 ? `${debtCoverage.toFixed(1)}x` : "Sin deudas",
        description: totalDebts > 0 ? "Activos / Pasivos activos" : "No registras deudas activas",
        icon: ShieldCheck,
      },
      {
        title: "Runway de Liquidez",
        value: liquidityRunway === Infinity ? "∞" : `${liquidityRunway.toFixed(1)} meses`,
        description: "Meses cubiertos al ritmo actual",
        icon: PiggyBank,
      },
    ]

    const insights = [
      {
        label: "Tasa de ahorro",
        value: `${(savingsRate * 100).toFixed(1)}%`,
        description: "Proporción de ingreso que conservas",
        status: savingsRate >= 0.2 ? "positive" : savingsRate >= 0 ? "neutral" : "warning",
      },
      {
        label: "Burn rate",
        value: burnRate === Infinity ? "Sin ingresos" : `${(burnRate * 100).toFixed(0)}% del ingreso`,
        description: burnRate > 1 ? "Tus gastos superan los ingresos" : "Gasto controlado",
        status: burnRate > 1 ? "warning" : burnRate > 0.8 ? "neutral" : "positive",
      },
      {
        label: "Cobro de gastos",
        value: `${(collectionRate * 100).toFixed(1)}%`,
        description: "Porcentaje pagado de lo planificado",
        status: collectionRate >= 0.85 ? "positive" : collectionRate >= 0.6 ? "neutral" : "warning",
      },
    ]

    return { monthlySeries, stats, insights }
  }, [assets, debts, expenses, incomes, timeframe])

  return (
    <Card className="rounded-2xl border border-border/60 bg-white/70 backdrop-blur">
      <CardHeader className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <CardTitle>Métricas en Tiempo Real</CardTitle>
          <CardDescription>Seguimiento del {timeframeConfig[timeframe].description}</CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-1 rounded-full border border-border/60 bg-muted/60 p-1 text-xs font-semibold">
          {timeframeOrder.map((option) => {
            const isActive = option === timeframe
            return (
              <button
                key={option}
                type="button"
                onClick={() => setTimeframe(option)}
                className={cn(
                  "rounded-full px-3 py-1 transition-colors",
                  isActive
                    ? "bg-background text-[var(--brand-navy-900)] shadow"
                    : "text-muted-foreground hover:text-foreground",
                )}
                aria-pressed={isActive}
              >
                {timeframeConfig[option].label}
              </button>
            )
          })}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tendencia mensual</p>
                  <p className="text-2xl font-semibold text-[var(--brand-navy-900)]">Ingresos vs Gastos</p>
                </div>
                <span className="text-xs uppercase tracking-wide text-muted-foreground">COP</span>
              </div>

              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlySeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id={incomeGradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0f4c75" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#0f4c75" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id={expenseGradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#d92b04" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#d92b04" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} dy={10} />
                    <YAxis tickFormatter={formatAxisValue} tickLine={false} axisLine={false} dx={-10} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload || payload.length === 0) return null
                        const point = payload.reduce<Record<string, number>>((acc, item) => {
                          acc[item.name ?? ""] = Number(item.value) || 0
                          return acc
                        }, {})
                        return (
                          <div className="rounded-lg border bg-white/95 p-3 shadow">
                            <p className="text-xs text-muted-foreground mb-1">{label}</p>
                            <p className="text-sm font-semibold text-[#0f4c75]">Ingresos: {formatMoney(point.income || 0)}</p>
                            <p className="text-sm font-semibold text-[#d92b04]">Gastos: {formatMoney(point.expenses || 0)}</p>
                            <p className="text-xs text-muted-foreground mt-1">Flujo neto: {formatMoney(point.net || 0)}</p>
                          </div>
                        )
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="income"
                      stroke="#0f4c75"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill={`url(#${incomeGradientId})`}
                      name="income"
                    />
                    <Area
                      type="monotone"
                      dataKey="expenses"
                      stroke="#d92b04"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill={`url(#${expenseGradientId})`}
                      name="expenses"
                    />
                    <Line type="monotone" dataKey="net" stroke="#1aa179" strokeWidth={2} dot={false} name="net" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-[#d92b04]" />
                <div>
                  <p className="text-sm font-semibold tracking-tight">Insights inmediatos</p>
                  <p className="text-xs text-muted-foreground">Acciones rápidas basadas en tu comportamiento</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {insights.map((insight) => (
                  <div
                    key={insight.label}
                    className="rounded-2xl border border-border/60 bg-white/70 p-3 shadow-sm"
                  >
                    <div className="flex items-center justify-between text-sm font-medium">
                      <span>{insight.label}</span>
                      <span
                        className={cn("text-xs font-semibold", {
                          "text-emerald-600": insight.status === "positive",
                          "text-amber-600": insight.status === "neutral",
                          "text-red-600": insight.status === "warning",
                        })}
                      >
                        {insight.value}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{insight.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {stats.map((stat) => (
                <StatsCard key={stat.title} {...stat} className="rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
