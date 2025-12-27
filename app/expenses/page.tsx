"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { PageShell } from "@/components/dashboard/page-shell"
import { AddExpenseDialog } from "@/components/expenses/add-expense-dialog"
import { ExpenseTable } from "@/components/expenses/expense-table"
import { ExpenseFilters } from "@/components/expenses/expense-filters"
import type { Expense } from "@/lib/types"
import { Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CloneExpensesDialog } from "@/components/expenses/clone-expenses-dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export default function ExpensesPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: expensesData = [], isLoading: expensesLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: apiClient.getExpenses,
    enabled: !authLoading && Boolean(user),
  })
  const [filters, setFilters] = useState({
    year: new Date().getFullYear().toString(),
    semester: "all",
    month: new Date().getMonth() + 1 + "", // Default to current month
    period: "all",
    search: "",
  })

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  const expenses = expensesData || []

  const filteredExpenses = useMemo(() => {
    let filtered = [...expenses]

    if (filters.year !== "all") {
      filtered = filtered.filter((expense) => expense.year === Number.parseInt(filters.year))
    }

    if (filters.semester !== "all") {
      filtered = filtered.filter((expense) => expense.semester === Number.parseInt(filters.semester))
    }

    if (filters.month !== "all") {
      filtered = filtered.filter((expense) => {
        const expenseDate = new Date(expense.payment_date)
        return expenseDate.getMonth() + 1 === Number.parseInt(filters.month)
      })
    }

    if (filters.period !== "all") {
      filtered = filtered.filter((expense) => expense.payment_period === filters.period)
    }

    if (filters.search) {
      filtered = filtered.filter((expense) =>
        expense.description.toLowerCase().includes(filters.search.toLowerCase()),
      )
    }

    return filtered.sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
  }, [expenses, filters])

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["expenses"] }),
  })

  const handleAddExpense = async (newExpense: Omit<Expense, "id" | "created_at" | "updated_at">) => {
    await createExpenseMutation.mutateAsync({
      description: newExpense.description,
      amount: newExpense.amount,
      payment_date: newExpense.payment_date,
      payment_period: newExpense.payment_period,
      semester: newExpense.semester,
      year: newExpense.year,
      notes: newExpense.notes,
      is_paid: newExpense.is_paid,
      amount_paid: newExpense.amount_paid ?? 0,
    })
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
      },
    })
  }

  const handleTogglePayment = async (id: string) => {
    const expense = expenses.find((item) => item.id === id)
    if (!expense) return

    const nextIsPaid = !expense.is_paid
    await updateExpenseMutation.mutateAsync({
      id,
      data: {
        is_paid: nextIsPaid,
        paid_date: nextIsPaid ? new Date().toISOString() : null,
      },
    })
  }

  const handleCloneExpenses = async (clonedExpenses: Omit<Expense, "id" | "created_at" | "updated_at">[]) => {
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
        }),
      ),
    )

    alert(`${clonedExpenses.length} gastos clonados exitosamente`)
  }

  const handleRegisterPayment = async (expenseId: string, paymentAmount: number, notes?: string) => {
    await registerPaymentMutation.mutateAsync({
      id: expenseId,
      data: {
        amount: paymentAmount,
        notes,
      },
    })
  }

  if (authLoading || expensesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0)

  const overdueExpenses = filteredExpenses.filter((e) => {
    if (e.is_paid) return false
    const paymentDate = new Date(e.payment_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return paymentDate < today
  })

  const unpaidExpenses = filteredExpenses.filter((e) => !e.is_paid)

  return (
    <DashboardLayout>
      <PageShell className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Gestión de Gastos</h1>
            <p className="text-muted-foreground">Registra y controla tus gastos quincenales</p>
          </div>
          <div className="flex gap-2">
            {/* Clone button */}
            <CloneExpensesDialog expenses={expenses} onClone={handleCloneExpenses} />
            <AddExpenseDialog onAdd={handleAddExpense} />
          </div>
        </div>

        {/* Overdue alert */}
        {overdueExpenses.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Pagos Vencidos</AlertTitle>
            <AlertDescription>
              Tienes {overdueExpenses.length} pago(s) vencido(s) por un total de $
              {overdueExpenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString("es-CO")}
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
            <div className="mt-4 flex gap-4 text-sm">
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
          </CardContent>
        </Card>

        {/* Filters */}
        <ExpenseFilters filters={filters} onFilterChange={setFilters} />

        {/* Expenses Table */}
        <ExpenseTable
          expenses={filteredExpenses}
          onDelete={handleDeleteExpense}
          onEdit={handleEditExpense}
          onTogglePayment={handleTogglePayment}
          onRegisterPayment={handleRegisterPayment}
        />
      </PageShell>
    </DashboardLayout>
  )
}
