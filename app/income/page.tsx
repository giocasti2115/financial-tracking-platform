"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { PageShell } from "@/components/dashboard/page-shell"
import type { AccountBalanceSnapshot, Asset, Expense, Income } from "@/lib/types"
import { DollarSign, Info, Loader2, Plus, Trash2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { clampFinancialYear, getFinancialYears, parseDateInput } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { AccountBalanceTracker } from "@/components/income/account-balance-tracker"

type QuincenaValue = "primera" | "segunda"

const QUINCENA_OPTIONS: { value: QuincenaValue; label: string }[] = [
  { value: "primera", label: "Primera quincena (15)" },
  { value: "segunda", label: "Segunda quincena (30)" },
]

const getQuincenaLabel = (value: QuincenaValue) => (value === "primera" ? "Primera quincena" : "Segunda quincena")

const detectQuincenaFromDate = (input: string | null | undefined): QuincenaValue => {
  const parsed = parseDateInput(input)
  if (!parsed) {
    return "primera"
  }
  return parsed.getDate() <= 15 ? "primera" : "segunda"
}

export default function IncomePage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const queryClient = useQueryClient()
  const defaultYear = clampFinancialYear(new Date().getFullYear()).toString()
  const defaultMonth = (new Date().getMonth() + 1).toString()
  const defaultQuincena: QuincenaValue = new Date().getDate() <= 15 ? "primera" : "segunda"
  const months = [
    { value: "1", label: "Enero" },
    { value: "2", label: "Febrero" },
    { value: "3", label: "Marzo" },
    { value: "4", label: "Abril" },
    { value: "5", label: "Mayo" },
    { value: "6", label: "Junio" },
    { value: "7", label: "Julio" },
    { value: "8", label: "Agosto" },
    { value: "9", label: "Septiembre" },
    { value: "10", label: "Octubre" },
    { value: "11", label: "Noviembre" },
    { value: "12", label: "Diciembre" },
  ]
  const [open, setOpen] = useState(false)
  const [filters, setFilters] = useState({
    year: defaultYear,
    month: defaultMonth,
    quincena: defaultQuincena,
  })
  const [formData, setFormData] = useState({
    person_name: "",
    amount: "",
    payment_date: "15",
    year: defaultYear,
    month: defaultMonth,
  })
  const [deletingIncomeId, setDeletingIncomeId] = useState<string | null>(null)

  const { data: incomes = [], isLoading: incomesLoading } = useQuery<Income[]>({
    queryKey: ["incomes"],
    queryFn: apiClient.getIncomes,
    enabled: !authLoading && Boolean(user),
  })
  const { data: expenses = [], isLoading: expensesLoading } = useQuery<Expense[]>({
    queryKey: ["expenses"],
    queryFn: apiClient.getExpenses,
    enabled: !authLoading && Boolean(user),
  })
  const { data: assets = [], isLoading: assetsLoading } = useQuery<Asset[]>({
    queryKey: ["assets"],
    queryFn: apiClient.getAssets,
    enabled: !authLoading && Boolean(user),
  })
  const snapshotMonth = filters.year !== "all" && filters.month !== "all" ? `${filters.year}-${filters.month.padStart(2, "0")}` : undefined
  const { data: accountSnapshots = [], isLoading: snapshotsLoading } = useQuery<AccountBalanceSnapshot[]>({
    queryKey: ["account-balance-snapshots", snapshotMonth ?? "all"],
    queryFn: () => apiClient.getAccountBalanceSnapshots(snapshotMonth),
    enabled: !authLoading && Boolean(user),
  })

  const createIncomeMutation = useMutation({
    mutationFn: apiClient.createIncome,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["incomes"] }),
  })

  const deleteIncomeMutation = useMutation({
    mutationFn: apiClient.deleteIncome,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["incomes"] }),
  })

  const createSnapshotMutation = useMutation({
    mutationFn: apiClient.createAccountBalanceSnapshot,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["account-balance-snapshots"] }),
  })

  const updateSnapshotMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof apiClient.createAccountBalanceSnapshot>[0] }) =>
      apiClient.updateAccountBalanceSnapshot(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["account-balance-snapshots"] }),
  })

  const deleteSnapshotMutation = useMutation({
    mutationFn: apiClient.deleteAccountBalanceSnapshot,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["account-balance-snapshots"] }),
  })

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  const handleAddIncome = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!formData.person_name || !formData.amount) {
      alert("Por favor completa todos los campos requeridos")
      return
    }

    try {
      await createIncomeMutation.mutateAsync({
        person_name: formData.person_name,
        amount: Number.parseFloat(formData.amount),
        payment_date: Number.parseInt(formData.payment_date, 10),
        month: Number.parseInt(formData.month, 10),
        year: Number.parseInt(formData.year, 10),
      })

      setFormData({
        person_name: "",
        amount: "",
        payment_date: "15",
        year: defaultYear,
        month: defaultMonth,
      })
      setOpen(false)
    } catch (error) {
      alert(error instanceof Error ? error.message : "Ocurrió un error al guardar el ingreso.")
    }
  }

  const handleDeleteIncome = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este ingreso?")) {
      return
    }

    try {
      setDeletingIncomeId(id)
      await deleteIncomeMutation.mutateAsync(id)
    } catch (error) {
      alert(error instanceof Error ? error.message : "Ocurrió un error al eliminar el ingreso.")
    } finally {
      setDeletingIncomeId(null)
    }
  }

  if (authLoading || incomesLoading || expensesLoading || assetsLoading || snapshotsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  const selectedYearNumber = filters.year !== "all" ? Number(filters.year) : undefined
  const selectedMonthNumber = filters.month !== "all" ? Number(filters.month) : undefined
  const quincenaLabel = getQuincenaLabel(filters.quincena)

  const monthFilteredIncomes = incomes.filter((income) => {
    if (selectedYearNumber && income.year !== selectedYearNumber) return false
    if (selectedMonthNumber && income.month !== selectedMonthNumber) return false
    return true
  })

  const filteredIncomes = monthFilteredIncomes.filter((income) =>
    filters.quincena === "primera" ? income.payment_date === 15 : income.payment_date === 30,
  )

  const totalIncome = monthFilteredIncomes.reduce((sum, i) => sum + i.amount, 0)
  const firstQuincenaTotal = monthFilteredIncomes
    .filter((i) => i.payment_date === 15)
    .reduce((sum, i) => sum + i.amount, 0)
  const secondQuincenaTotal = monthFilteredIncomes
    .filter((i) => i.payment_date === 30)
    .reduce((sum, i) => sum + i.amount, 0)

  const selectedPeriodLabel =
    selectedYearNumber && selectedMonthNumber
      ? `${quincenaLabel} de ${months[selectedMonthNumber - 1].label} ${filters.year}`
      : "Periodo actual"
  const canAddSnapshots = Boolean(selectedYearNumber && selectedMonthNumber)
  const defaultRecordDate = canAddSnapshots
    ? `${filters.year}-${filters.month.padStart(2, "0")}-${filters.quincena === "primera" ? "05" : "20"}`
    : undefined

  const pendingAmount = canAddSnapshots
    ? expenses
        .filter((expense) => {
          if (selectedYearNumber && expense.year !== selectedYearNumber) return false
          if (selectedMonthNumber) {
            const expenseDate = parseDateInput(expense.payment_date)
            const expenseMonth = expenseDate ? expenseDate.getMonth() + 1 : undefined
            if (expenseMonth !== selectedMonthNumber) return false
          }
          return filters.quincena === "primera"
            ? expense.payment_period === "primera_quincena"
            : expense.payment_period === "segunda_quincena"
        })
        .reduce((sum, expense) => {
          const remaining = Math.max(expense.amount - (expense.amount_paid ?? 0), 0)
          return sum + remaining
        }, 0)
    : 0

  const periodSnapshots = canAddSnapshots
    ? accountSnapshots.filter((snapshot) => {
        if (selectedYearNumber && snapshot.year !== selectedYearNumber) return false
        if (selectedMonthNumber && snapshot.month !== selectedMonthNumber) return false
        return detectQuincenaFromDate(snapshot.recorded_on) === filters.quincena
      })
    : []

  const handleCreateSnapshot = async (payload: {
    label: string
    amount: number
    recorded_on: string
    account_id?: string | null
    notes?: string
  }) => {
    try {
      await createSnapshotMutation.mutateAsync(payload)
    } catch (error) {
      alert(error instanceof Error ? error.message : "Ocurrió un error al guardar el saldo.")
    }
  }

  const handleUpdateSnapshot = async (
    snapshotId: string,
    payload: {
      label: string
      amount: number
      recorded_on: string
      account_id?: string | null
      notes?: string
    },
  ) => {
    try {
      await updateSnapshotMutation.mutateAsync({ id: snapshotId, payload })
    } catch (error) {
      alert(error instanceof Error ? error.message : "Ocurrió un error al actualizar el saldo.")
    }
  }

  const handleDeleteSnapshot = async (snapshotId: string) => {
    if (!confirm("¿Deseas eliminar este registro de saldo?")) return
    try {
      await deleteSnapshotMutation.mutateAsync(snapshotId)
    } catch (error) {
      alert(error instanceof Error ? error.message : "Ocurrió un error al eliminar el saldo.")
    }
  }

  const years = getFinancialYears()

  return (
    <DashboardLayout>
      <PageShell className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Gestión de Ingresos</h1>
              <Tooltip>
                <TooltipTrigger
                  type="button"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="Descripción del módulo de ingresos"
                >
                  <Info className="h-4 w-4" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  Suma tus ingresos por quincena y mantén claro cuánto entra en cada periodo.
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-muted-foreground">Registra tus ingresos por quincena</p>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="mr-2 h-4 w-4" />
                Agregar Ingreso
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleAddIncome}>
                <DialogHeader>
                  <DialogTitle>Agregar Nuevo Ingreso</DialogTitle>
                  <DialogDescription>Registra un ingreso quincenal</DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="person_name">Persona *</Label>
                    <Input
                      id="person_name"
                      placeholder="Ej: Salario, Arriendos, Mesada, Pensión"
                      value={formData.person_name}
                      onChange={(e) => setFormData({ ...formData, person_name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="amount">Monto *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="payment_date">Fecha de Pago *</Label>
                    <Select
                      value={formData.payment_date}
                      onValueChange={(value) => setFormData({ ...formData, payment_date: value })}
                    >
                      <SelectTrigger id="payment_date">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 (Primera Quincena)</SelectItem>
                        <SelectItem value="30">30 (Segunda Quincena)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="year">Año *</Label>
                      <Select
                        value={formData.year}
                        onValueChange={(value) => setFormData({ ...formData, year: value })}
                      >
                        <SelectTrigger id="year">
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
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="month">Mes *</Label>
                      <Select
                        value={formData.month}
                        onValueChange={(value) => setFormData({ ...formData, month: value })}
                      >
                        <SelectTrigger id="month">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {months.map((month) => (
                            <SelectItem key={month.value} value={month.value}>
                              {month.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto">
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700"
                    disabled={createIncomeMutation.isPending}
                  >
                    {createIncomeMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      "Guardar Ingreso"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="year-filter">Año</Label>
                <Select value={filters.year} onValueChange={(value) => setFilters({ ...filters, year: value })}>
                  <SelectTrigger id="year-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="month-filter">Mes</Label>
                <Select value={filters.month} onValueChange={(value) => setFilters({ ...filters, month: value })}>
                  <SelectTrigger id="month-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {months.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="quincena-filter">Quincena</Label>
                <Select
                  value={filters.quincena}
                  onValueChange={(value) => setFilters({ ...filters, quincena: value as QuincenaValue })}
                >
                  <SelectTrigger id="quincena-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {QUINCENA_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Total Ingresos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-700">${totalIncome.toLocaleString("es-CO")}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Primera Quincena (15)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700">${firstQuincenaTotal.toLocaleString("es-CO")}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Segunda Quincena (30)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-700">${secondQuincenaTotal.toLocaleString("es-CO")}</div>
            </CardContent>
          </Card>
        </div>

        <AccountBalanceTracker
          snapshots={periodSnapshots}
          assets={assets}
          selectedPeriodLabel={selectedPeriodLabel}
          quincenaLabel={quincenaLabel}
          pendingAmount={pendingAmount}
          defaultRecordDate={defaultRecordDate}
          onCreate={handleCreateSnapshot}
          onUpdate={handleUpdateSnapshot}
          onDelete={handleDeleteSnapshot}
          isSubmitting={createSnapshotMutation.isPending}
          isUpdating={updateSnapshotMutation.isPending}
          isDeleting={deleteSnapshotMutation.isPending}
          canAdd={canAddSnapshots}
        />

        {/* Income List */}
        <Card>
          <CardHeader>
            <CardTitle>Ingresos Registrados</CardTitle>
            <CardDescription>
              {filteredIncomes.length} ingreso{filteredIncomes.length !== 1 ? "s" : ""} encontrado
              {filteredIncomes.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredIncomes.length > 0 ? (
              <div className="space-y-3">
                {filteredIncomes.map((income) => (
                  <div
                    key={income.id}
                    className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                        <DollarSign className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{income.person_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {months[income.month - 1].label} {income.year} - Día {income.payment_date}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <div className="text-left sm:text-right">
                        <p className="text-lg font-bold text-emerald-600">${income.amount.toLocaleString("es-CO")}</p>
                        <p className="text-xs text-muted-foreground">
                          {income.payment_date === 15 ? "Primera Quincena" : "Segunda Quincena"}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDeleteIncome(income.id)}
                        disabled={deletingIncomeId === income.id}
                      >
                        {deletingIncomeId === income.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No hay ingresos registrados para este período</p>
                <p className="text-sm text-muted-foreground mt-1">Agrega tu primer ingreso para comenzar</p>
              </div>
            )}
          </CardContent>
        </Card>
      </PageShell>
    </DashboardLayout>
  )
}
