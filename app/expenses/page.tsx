"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { PageShell } from "@/components/dashboard/page-shell"
import { AddExpenseDialog } from "@/components/expenses/add-expense-dialog"
import { ExpenseTable } from "@/components/expenses/expense-table"
import { ExpenseFilters } from "@/components/expenses/expense-filters"
import type { Asset, Debt, Expense } from "@/lib/types"
import { AlertCircle, Info, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CloneExpensesDialog } from "@/components/expenses/clone-expenses-dialog"
import { PropagateExpenseDialog, type PropagateAction } from "@/components/expenses/propagate-expense-dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { clampFinancialYear, parseDateInput } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { Progress } from "@/components/ui/progress"

export default function ExpensesPage() {
  const { toast } = useToast()
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const queryClient = useQueryClient()
  const filterTemplate = useMemo(
    () => ({
      year: clampFinancialYear(new Date().getFullYear()).toString(),
      semester: "all",
      month: (new Date().getMonth() + 1).toString(),
      period: "all",
      search: "",
    }),
    [],
  )
  const [filters, setFilters] = useState(filterTemplate)
  const [propagateContext, setPropagateContext] = useState<{ mode: "edit" | "add"; expense: Expense } | null>(null)
  const { data: expensesData = [], isLoading: expensesLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: apiClient.getExpenses,
    enabled: !authLoading && Boolean(user),
  })
  const { data: debtsData = [], isLoading: debtsLoading } = useQuery({
    queryKey: ["debts"],
    queryFn: apiClient.getDebts,
    enabled: !authLoading && Boolean(user),
  })
  const { data: assetsData = [], isLoading: assetsLoading } = useQuery({
    queryKey: ["assets"],
    queryFn: apiClient.getAssets,
    enabled: !authLoading && Boolean(user),
  })

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  const handleResetFilters = () => setFilters({ ...filterTemplate })

  const hasActiveFilters = useMemo(() => {
    return (
      filters.year !== filterTemplate.year ||
      filters.semester !== filterTemplate.semester ||
      filters.month !== filterTemplate.month ||
      filters.period !== filterTemplate.period ||
      filters.search.trim().length > 0
    )
  }, [filters, filterTemplate])

  const expenses = expensesData || []
  const debts = debtsData || []
  const assets = assetsData || []
  const debtMap = useMemo(() => new Map(debts.map((debt) => [debt.id, debt])), [debts])

  const filteredExpenses = useMemo(() => {
    let filtered = [...expenses]

    if (filters.year !== "all") {
      filtered = filtered.filter((expense) => expense.year === Number.parseInt(filters.year))
    }

    if (filters.semester !== "all") {
      filtered = filtered.filter((expense) => expense.semester === Number.parseInt(filters.semester))
    }

    if (filters.month !== "all") {
      const selectedMonth = Number.parseInt(filters.month)
      filtered = filtered.filter((expense) => {
        const [, month] = expense.payment_date.split("-")
        return Number.parseInt(month) === selectedMonth
      })
    }

    if (filters.period !== "all") {
      filtered = filtered.filter((expense) => expense.payment_period === filters.period)
    }

    const searchTerm = filters.search.trim().toLowerCase()
    if (searchTerm) {
      filtered = filtered.filter((expense) => {
        const notesMatch = expense.notes?.toLowerCase().includes(searchTerm)
        const debtName = expense.debt_id ? debtMap.get(expense.debt_id)?.entity_name.toLowerCase() ?? "" : ""
        return (
          expense.description.toLowerCase().includes(searchTerm) ||
          Boolean(notesMatch) ||
          debtName.includes(searchTerm)
        )
      })
    }

    return filtered.sort((a, b) => b.payment_date.localeCompare(a.payment_date))
  }, [expenses, filters, debtMap])

  const createExpenseMutation = useMutation({
    mutationFn: apiClient.createExpense,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["expenses"] }),
  })

  const updateExpenseMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof apiClient.updateExpense>[1] }) =>
      apiClient.updateExpense(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["expenses"] }),
  })

  const deleteExpenseMutation = useMutation({
    mutationFn: apiClient.deleteExpense,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["expenses"] }),
  })

  const registerPaymentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof apiClient.registerExpensePayment>[1] }) =>
      apiClient.registerExpensePayment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] })
      queryClient.invalidateQueries({ queryKey: ["debts"] })
      queryClient.invalidateQueries({ queryKey: ["assets"] })
      toast({
        title: "Pago registrado",
        description: "Actualizamos el gasto y su deuda vinculada.",
      })
    },
    onError: (error: Error) =>
      toast({
        variant: "destructive",
        title: "No pudimos registrar el pago",
        description: error.message,
      }),
  })

  const handleAddExpense = async (newExpense: Omit<Expense, "id" | "created_at" | "updated_at">) => {
    const createdExpense = await createExpenseMutation.mutateAsync({
      description: newExpense.description,
      amount: newExpense.amount,
      payment_date: newExpense.payment_date,
      payment_period: newExpense.payment_period,
      semester: newExpense.semester,
      year: newExpense.year,
      notes: newExpense.notes,
      is_paid: newExpense.is_paid,
      amount_paid: newExpense.amount_paid ?? 0,
      debt_id: newExpense.debt_id ?? null,
      asset_id: newExpense.asset_id ?? null,
    })

    setPropagateContext({ mode: "add", expense: createdExpense as Expense })
  }

  const handleDeleteExpense = async (id: string) => {
    await deleteExpenseMutation.mutateAsync(id)
  }

  const handleEditExpense = async (updatedExpense: Expense) => {
    await updateExpenseMutation.mutateAsync({
      id: updatedExpense.id,
      data: {
        description: updatedExpense.description,
        amount: updatedExpense.amount,
        payment_date: updatedExpense.payment_date,
        payment_period: updatedExpense.payment_period,
        semester: updatedExpense.semester,
        year: updatedExpense.year,
        notes: updatedExpense.notes,
        debt_id: updatedExpense.debt_id ?? null,
      },
    })

    setPropagateContext({ mode: "edit", expense: updatedExpense })
  }

  const handleCloneExpenses = async (clonedExpenses: Omit<Expense, "id" | "created_at" | "updated_at">[]) => {
    try {
      await Promise.all(
        clonedExpenses.map((expense) =>
          createExpenseMutation.mutateAsync({
            description: expense.description,
            amount: expense.amount,
            payment_date: expense.payment_date,
            payment_period: expense.payment_period,
            semester: expense.semester,
            year: expense.year,
            notes: expense.notes,
            debt_id: expense.debt_id ?? null,
            asset_id: expense.asset_id ?? null,
            is_paid: false,
            amount_paid: 0,
          }),
        ),
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : "No pudimos clonar los gastos."
      toast({
        variant: "destructive",
        title: "Error al clonar",
        description: message,
      })
      throw error
    }
  }

  const handleRegisterPayment = async (
    expenseId: string,
    paymentAmount: number,
    notes?: string,
    assetId?: string,
  ) => {
    await registerPaymentMutation.mutateAsync({
      id: expenseId,
      data: {
        amount: paymentAmount,
        notes,
        asset_id: assetId,
      },
    })
  }

  const buildPaymentDateForMonth = (baseDate: string, month: number, year: number) => {
    const base = parseDateInput(baseDate)
    const safeBase = base ?? new Date(`${year}-${String(month).padStart(2, "0")}-01`)
    const day = safeBase.getDate()
    const lastDay = new Date(year, month, 0).getDate()
    const clampedDay = Math.min(day, lastDay)
    return `${year}-${String(month).padStart(2, "0")}-${String(clampedDay).padStart(2, "0")}`
  }

  const handlePropagate = async (action: PropagateAction) => {
    if (!propagateContext) return

    try {
      if (action.type === "update") {
        await Promise.all(
          action.targets.map((target) =>
            apiClient.updateExpense(target.id, {
              description: action.changes.description,
              amount: action.changes.amount,
              payment_period: action.changes.payment_period,
              debt_id: action.changes.debt_id ?? null,
            }),
          ),
        )

        toast({
          title: "Cambios propagados",
          description: `Actualizamos ${action.targets.length} gasto(s) en meses siguientes.`,
        })
      }

      if (action.type === "clone") {
        const base = propagateContext.expense
        await Promise.all(
          action.months.map(({ month, year }) =>
            apiClient.createExpense({
              description: base.description,
              amount: base.amount,
              payment_date: buildPaymentDateForMonth(base.payment_date, month, year),
              payment_period: base.payment_period,
              semester: month <= 6 ? 1 : 2,
              year,
              notes: base.notes,
              is_paid: false,
              amount_paid: 0,
              debt_id: base.debt_id ?? null,
              asset_id: base.asset_id ?? null,
            }),
          ),
        )

        toast({
          title: "Gastos clonados",
          description: `Creamos ${action.months.length} gasto(s) en meses siguientes.`,
        })
      }

      await queryClient.invalidateQueries({ queryKey: ["expenses"] })
    } catch (error) {
      const message = error instanceof Error ? error.message : "No pudimos propagar los cambios."
      toast({
        variant: "destructive",
        title: "Error al propagar",
        description: message,
      })
      throw error
    } finally {
      setPropagateContext(null)
    }
  }

  if (authLoading || expensesLoading || debtsLoading || assetsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0)
  const totalPaidAmount = filteredExpenses.reduce(
    (sum, expense) => sum + Math.min(expense.amount_paid ?? 0, expense.amount),
    0,
  )
  const totalPendingAmount = Math.max(totalExpenses - totalPaidAmount, 0)
  const paidPercentage = totalExpenses > 0 ? (totalPaidAmount / totalExpenses) * 100 : 0
  const pendingPercentage = totalExpenses > 0 ? (totalPendingAmount / totalExpenses) * 100 : 0

  const pendingByPeriod = [
    {
      label: "Primera quincena",
      amount: filteredExpenses
        .filter((expense) => expense.payment_period === "primera_quincena")
        .reduce((sum, expense) => sum + Math.max(expense.amount - (expense.amount_paid ?? 0), 0), 0),
      count: filteredExpenses.filter((expense) => expense.payment_period === "primera_quincena" && !expense.is_paid).length,
    },
    {
      label: "Segunda quincena",
      amount: filteredExpenses
        .filter((expense) => expense.payment_period === "segunda_quincena")
        .reduce((sum, expense) => sum + Math.max(expense.amount - (expense.amount_paid ?? 0), 0), 0),
      count: filteredExpenses.filter((expense) => expense.payment_period === "segunda_quincena" && !expense.is_paid).length,
    },
  ]

  const overdueExpenses = filteredExpenses.filter((e) => {
    if (e.is_paid) return false
    const paymentDate = parseDateInput(e.payment_date)
    if (!paymentDate) return false
    paymentDate.setHours(0, 0, 0, 0)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return paymentDate.getTime() < today.getTime()
  })

  const unpaidExpenses = filteredExpenses.filter((e) => !e.is_paid)

  return (
    <DashboardLayout>
      <PageShell className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Gestión de Gastos</h1>
              <Tooltip>
                <TooltipTrigger
                  type="button"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="Descripción del módulo de gastos"
                >
                  <Info className="h-4 w-4" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  Controla tus gastos quincenales, duplica meses y registra pagos a tiempo.
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-muted-foreground">Registra y controla tus gastos quincenales</p>
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            {/* Clone button */}
            <CloneExpensesDialog expenses={expenses} onClone={handleCloneExpenses} />
            <AddExpenseDialog onAdd={handleAddExpense} debts={debts} assets={assets} />
          </div>
        </div>

        {/* Overdue alert */}
        {overdueExpenses.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Pagos Vencidos</AlertTitle>
            <AlertDescription>
              Tienes {overdueExpenses.length} pago(s) vencido(s) por un total de $
              {overdueExpenses
                .reduce((sum, e) => sum + Math.max(e.amount - (e.amount_paid ?? 0), 0), 0)
                .toLocaleString("es-CO")}
            </AlertDescription>
          </Alert>
        )}

        {/* Summary Card */}
        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
          <CardHeader>
            <CardTitle>Resumen de Gastos</CardTitle>
            <CardDescription>Total de gastos filtrados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-emerald-700">${totalExpenses.toLocaleString("es-CO")}</span>
              <span className="text-muted-foreground">({filteredExpenses.length} gastos)</span>
            </div>
            {/* Payment status summary */}
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-yellow-400" />
                <span className="text-muted-foreground">
                  Pagados: {filteredExpenses.filter((e) => e.is_paid).length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-gray-300" />
                <span className="text-muted-foreground">Pendientes: {unpaidExpenses.length}</span>
              </div>
              {overdueExpenses.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <span className="text-red-600 font-medium">Vencidos: {overdueExpenses.length}</span>
                </div>
              )}
            </div>
            <div className="mt-6 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div>
                  <p className="text-muted-foreground">Pagado</p>
                  <p className="text-lg font-semibold text-emerald-700">
                    ${totalPaidAmount.toLocaleString("es-CO")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground">Pendiente</p>
                  <p className="text-lg font-semibold text-amber-700">
                    ${totalPendingAmount.toLocaleString("es-CO")}
                  </p>
                </div>
              </div>
              <Progress value={paidPercentage} className="h-3 bg-emerald-100" indicatorClassName="bg-emerald-500" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{paidPercentage.toFixed(1)}% cubierto</span>
                <span>{pendingPercentage.toFixed(1)}% pendiente</span>
              </div>
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {pendingByPeriod.map((item) => (
                <div key={item.label} className="rounded-xl border border-white/60 bg-white/70 p-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">{item.label}</p>
                      <p className="text-lg font-semibold text-slate-800">
                        ${item.amount.toLocaleString("es-CO")}
                      </p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p>{item.count} gastos pendientes</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <ExpenseFilters
          filters={filters}
          onFilterChange={setFilters}
          onReset={handleResetFilters}
          isDirty={hasActiveFilters}
        />

        {/* Expenses Table */}
        <ExpenseTable
          expenses={filteredExpenses}
          debts={debts}
          assets={assets}
          onDelete={handleDeleteExpense}
          onEdit={handleEditExpense}
          onRegisterPayment={handleRegisterPayment}
        />

        <PropagateExpenseDialog
          open={Boolean(propagateContext)}
          onOpenChange={(open) => {
            if (!open) {
              setPropagateContext(null)
            }
          }}
          mode={propagateContext?.mode ?? "edit"}
          savedExpense={propagateContext?.expense ?? null}
          allExpenses={expenses}
          onPropagate={handlePropagate}
          isLoading={
            createExpenseMutation.isPending || updateExpenseMutation.isPending || deleteExpenseMutation.isPending
          }
        />
      </PageShell>
    </DashboardLayout>
  )
}
