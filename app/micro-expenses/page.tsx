"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
import { es } from "date-fns/locale"

import { useAuth } from "@/components/auth-provider"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { PageShell } from "@/components/dashboard/page-shell"
import { MicroExpenseForm } from "@/components/micro-expenses/micro-expense-form"
import { MicroExpenseList } from "@/components/micro-expenses/micro-expense-list"
import { MicroExpenseSummary } from "@/components/micro-expenses/micro-expense-summary"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Info, Loader2 } from "lucide-react"

import { apiClient, type NewMicroExpensePayload } from "@/lib/api-client"
import type { MicroExpense, MicroExpenseSummary as SummaryType } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

const currentMonthValue = format(new Date(), "yyyy-MM")

export default function MicroExpensesPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user, loading: authLoading } = useAuth()
  const [selectedMonth, setSelectedMonth] = useState(currentMonthValue)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [authLoading, router, user])

  const monthLabel = useMemo(() => {
    return format(new Date(`${selectedMonth}-01T00:00:00`), "MMMM yyyy", { locale: es })
  }, [selectedMonth])

  const defaultDate = useMemo(() => {
    const today = new Date()
    const todayMonth = format(today, "yyyy-MM")
    if (selectedMonth === todayMonth) {
      return format(today, "yyyy-MM-dd")
    }
    return `${selectedMonth}-01`
  }, [selectedMonth])

  const invalidateMonthQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["micro-expenses", selectedMonth] })
    queryClient.invalidateQueries({ queryKey: ["micro-expense-summary", selectedMonth] })
  }

  const enabled = !authLoading && Boolean(user)

  const {
    data: expenses = [],
    isPending: expensesPending,
    isFetching: expensesFetching,
  } = useQuery<MicroExpense[]>({
    queryKey: ["micro-expenses", selectedMonth],
    queryFn: () => apiClient.getMicroExpenses(selectedMonth),
    enabled,
  })

  const {
    data: summary,
    isPending: summaryPending,
    isFetching: summaryFetching,
  } = useQuery<SummaryType>({
    queryKey: ["micro-expense-summary", selectedMonth],
    queryFn: () => apiClient.getMicroExpenseSummary(selectedMonth),
    enabled,
  })

  const createExpenseMutation = useMutation({
    mutationFn: (payload: NewMicroExpensePayload) => apiClient.createMicroExpense(payload),
    onSuccess: () => {
      invalidateMonthQueries()
      toast({ title: "Gasto registrado", description: "Se agregó un nuevo gasto hormiga." })
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "No pudimos registrar el gasto."
      toast({ title: "Error", description: message })
    },
  })

  const deleteExpenseMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteMicroExpense(id),
    onSuccess: () => {
      invalidateMonthQueries()
      toast({ title: "Gasto eliminado", description: "Se eliminó el registro seleccionado." })
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "No pudimos eliminar el gasto."
      toast({ title: "Error", description: message })
    },
  })

  const handleCreateExpense = async (payload: NewMicroExpensePayload) => {
    await createExpenseMutation.mutateAsync(payload)
  }

  const handleDeleteExpense = async (expense: MicroExpense) => {
    setDeletingId(expense.id)
    try {
      await deleteExpenseMutation.mutateAsync(expense.id)
    } finally {
      setDeletingId(null)
    }
  }

  const handleMonthChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.value) return
    setSelectedMonth(event.target.value)
  }

  const isBootstrapping = authLoading || (!authLoading && !user)
  const summaryLoading = summaryPending && !summary

  if (isBootstrapping) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  return (
    <DashboardLayout>
      <PageShell className="space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">Gastos Hormiga</h1>
              <Tooltip>
                <TooltipTrigger
                  type="button"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="¿Qué es este módulo?"
                >
                  <Info className="h-4 w-4" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  Registra los pequeños gastos diarios y analiza su impacto mensual en tu liquidez.
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-muted-foreground">
              Registra consumos diarios pequeños y visualiza el impacto mensual de tus antojos.
            </p>
          </div>
          <Card className="max-w-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Mes analizado</CardTitle>
              <CardDescription>Selecciona el periodo para filtrar el historial</CardDescription>
            </CardHeader>
            <CardContent>
              <Input type="month" value={selectedMonth} onChange={handleMonthChange} className="max-w-[220px]" />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 items-start lg:grid-cols-[2fr,3fr]">
          <div className="space-y-6">
            <MicroExpenseSummary summary={summary} monthLabel={monthLabel} isLoading={summaryLoading || summaryFetching} />
            <Card>
              <CardHeader>
                <CardTitle>Registrar gasto hormiga</CardTitle>
                <CardDescription>Incluye cada pequeño gasto para mantener el control diario.</CardDescription>
              </CardHeader>
              <CardContent>
                <MicroExpenseForm
                  onSubmit={handleCreateExpense}
                  isSubmitting={createExpenseMutation.isPending}
                  defaultDate={defaultDate}
                  disabled={expensesPending && !expenses.length}
                />
              </CardContent>
            </Card>
          </div>

          <MicroExpenseList
            expenses={expenses}
            onDelete={handleDeleteExpense}
            deletingId={deletingId}
            isDisabled={deleteExpenseMutation.isPending || expensesFetching}
            className="lg:h-[640px]"
          />
        </div>
      </PageShell>
    </DashboardLayout>
  )
}
