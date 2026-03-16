"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { PageShell } from "@/components/dashboard/page-shell"
import { DebtProjectionTable } from "@/components/projections/debt-projection-table"
import { MonthlyProjectionChart } from "@/components/projections/monthly-projection-chart"
import { ExpenseReport } from "@/components/projections/expense-report"
import { CreditSimulator } from "@/components/projections/credit-simulator"
import { projections } from "@/lib/projections"
import type { Debt, Expense, Income } from "@/lib/types"
import { Calendar, Info, Loader2, TrendingUp } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { clampFinancialYear, getFinancialYears } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export default function ProjectionsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [projectionMonths, setProjectionMonths] = useState(12)
  const [reportYear, setReportYear] = useState(clampFinancialYear(new Date().getFullYear()))
  const [reportSemester, setReportSemester] = useState<number | undefined>(undefined)

  const { data: debts = [], isLoading: debtsLoading } = useQuery<Debt[]>({
    queryKey: ["debts"],
    queryFn: apiClient.getDebts,
    enabled: !authLoading && Boolean(user),
  })

  const { data: expenses = [], isLoading: expensesLoading } = useQuery<Expense[]>({
    queryKey: ["expenses"],
    queryFn: apiClient.getExpenses,
    enabled: !authLoading && Boolean(user),
  })

  const { data: incomes = [], isLoading: incomesLoading } = useQuery<Income[]>({
    queryKey: ["incomes"],
    queryFn: apiClient.getIncomes,
    enabled: !authLoading && Boolean(user),
  })

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  const debtProjections = useMemo(
    () => projections.generateDebtProjections(debts, projectionMonths),
    [debts, projectionMonths]
  )

  const monthlyProjections = useMemo(
    () => projections.generateMonthlyProjections(incomes, expenses, debts, projectionMonths),
    [incomes, expenses, debts, projectionMonths]
  )

  const debtFreeDate = useMemo(() => projections.calculateDebtFreeDate(debts), [debts])

  const expenseReport = useMemo(
    () => projections.generateExpenseReport(expenses, reportYear, reportSemester),
    [expenses, reportYear, reportSemester]
  )

  const isLoading = authLoading || debtsLoading || expensesLoading || incomesLoading

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  const years = getFinancialYears()

  return (
    <DashboardLayout>
      <PageShell className="space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Proyecciones y Reportes</h1>
            <Tooltip>
              <TooltipTrigger
                type="button"
                className="text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Descripción del módulo de proyecciones"
              >
                <Info className="h-4 w-4" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                Simula tus pagos futuros, analiza el comportamiento mensual y detecta tendencias de gasto.
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="text-muted-foreground">Visualiza proyecciones de pago y análisis financiero</p>
        </div>

        {/* Debt Free Date Card */}
        {debtFreeDate && (
          <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Fecha Proyectada Libre de Deudas
              </CardTitle>
              <CardDescription>Basado en tus pagos mensuales actuales</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-700">
                {debtFreeDate.toLocaleDateString("es-CO", { year: "numeric", month: "long" })}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Aproximadamente {Math.ceil((debtFreeDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30))} meses
                restantes
              </p>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="debt-projections" className="space-y-4">
          <TabsList>
            <TabsTrigger value="debt-projections">Proyección de Deudas</TabsTrigger>
            <TabsTrigger value="monthly-projections">Proyección Mensual</TabsTrigger>
            <TabsTrigger value="expense-report">Reporte de Gastos</TabsTrigger>
            <TabsTrigger value="credit-simulator">Simulador de Crédito</TabsTrigger>
          </TabsList>

          <TabsContent value="debt-projections" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Proyección de Pagos de Deudas</CardTitle>
                    <CardDescription>Calendario de pagos proyectados para los próximos meses</CardDescription>
                  </div>
                  <div className="w-32">
                    <Select
                      value={projectionMonths.toString()}
                      onValueChange={(value) => setProjectionMonths(Number.parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="6">6 meses</SelectItem>
                        <SelectItem value="12">12 meses</SelectItem>
                        <SelectItem value="24">24 meses</SelectItem>
                        <SelectItem value="36">36 meses</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <DebtProjectionTable projections={debtProjections} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monthly-projections" className="space-y-4">
            <div className="flex items-center justify-end gap-2">
              <Label htmlFor="projection-months">Meses a proyectar:</Label>
              <Select
                value={projectionMonths.toString()}
                onValueChange={(value) => setProjectionMonths(Number.parseInt(value))}
              >
                <SelectTrigger id="projection-months" className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">6 meses</SelectItem>
                  <SelectItem value="12">12 meses</SelectItem>
                  <SelectItem value="24">24 meses</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <MonthlyProjectionChart projections={monthlyProjections} />

            <Card>
              <CardHeader>
                <CardTitle>Detalle de Proyecciones Mensuales</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {monthlyProjections.slice(0, 6).map((proj) => (
                    <div key={`${proj.year}-${proj.month}`} className="p-4 border rounded-lg space-y-2">
                      <h4 className="font-semibold">
                        {new Date(proj.year, proj.month - 1).toLocaleDateString("es-CO", {
                          year: "numeric",
                          month: "long",
                        })}
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Ingresos</p>
                          <p className="font-semibold text-emerald-600">${proj.total_income.toLocaleString("es-CO")}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Gastos</p>
                          <p className="font-semibold text-orange-600">
                            ${proj.total_expenses.toLocaleString("es-CO")}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Intereses</p>
                          <p className="font-semibold text-rose-600">
                            ${proj.total_debt_interest.toLocaleString("es-CO")}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Abono capital</p>
                          <p className="font-semibold text-violet-600">
                            ${proj.total_debt_principal.toLocaleString("es-CO")}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Pagos Deudas</p>
                          <p className="font-semibold text-red-600">
                            ${proj.total_debt_payments.toLocaleString("es-CO")}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Disponible</p>
                          <p className={`font-semibold ${proj.available >= 0 ? "text-blue-600" : "text-red-600"}`}>
                            ${proj.available.toLocaleString("es-CO")}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="expense-report" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Análisis de Gastos
                    </CardTitle>
                    <CardDescription>Distribución y promedios por categoría</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={reportYear.toString()}
                      onValueChange={(value) => setReportYear(Number.parseInt(value))}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {years.map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={reportSemester?.toString() || "all"}
                      onValueChange={(value) => setReportSemester(value === "all" ? undefined : Number.parseInt(value))}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Año Completo</SelectItem>
                        <SelectItem value="1">1er Semestre</SelectItem>
                        <SelectItem value="2">2do Semestre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <ExpenseReport report={expenseReport} />
          </TabsContent>

          <TabsContent value="credit-simulator" className="space-y-4">
            <CreditSimulator />
          </TabsContent>
        </Tabs>
      </PageShell>
    </DashboardLayout>
  )
}
