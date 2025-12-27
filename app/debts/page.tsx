"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { PageShell } from "@/components/dashboard/page-shell"
import { AddDebtDialog } from "@/components/debts/add-debt-dialog"
import { DebtCard } from "@/components/debts/debt-card"
import { calculations } from "@/lib/calculations"
import type { Asset, Debt } from "@/lib/types"
import { Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

type DebtPaymentForm = {
  debtId: string
  amount: number
  payment_date: string
  notes?: string
}

export default function DebtsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: assets = [], isLoading: assetsLoading } = useQuery<Asset[]>({
    queryKey: ["assets"],
    queryFn: apiClient.getAssets,
    enabled: !authLoading && Boolean(user),
  })
  const [deletingDebtId, setDeletingDebtId] = useState<string | null>(null)

  const { data: debts = [], isLoading: debtsLoading } = useQuery<Debt[]>({
    queryKey: ["debts"],
    queryFn: apiClient.getDebts,
    enabled: !authLoading && Boolean(user),
  })

  const createDebtMutation = useMutation({
    mutationFn: apiClient.createDebt,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["debts"] }),
  })

  const deleteDebtMutation = useMutation({
    mutationFn: apiClient.deleteDebt,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["debts"] }),
  })

  const addDebtPaymentMutation = useMutation({
    mutationFn: ({ debtId, amount, payment_date, notes }: DebtPaymentForm) =>
      apiClient.addDebtPayment(debtId, { amount, payment_date, notes }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["debts"] }),
  })

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  const handleAddDebt = async (payload: Parameters<typeof apiClient.createDebt>[0]) => {
    try {
      await createDebtMutation.mutateAsync(payload)
    } catch (error) {
      alert(error instanceof Error ? error.message : "Ocurrió un error al guardar la deuda.")
    }
  }

  const handleDeleteDebt = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta deuda?")) {
      return
    }

    try {
      setDeletingDebtId(id)
      await deleteDebtMutation.mutateAsync(id)
    } catch (error) {
      alert(error instanceof Error ? error.message : "Ocurrió un error al eliminar la deuda.")
    } finally {
      setDeletingDebtId(null)
    }
  }

  const handleRegisterPayment = async ({ debtId, amount, payment_date, notes }: DebtPaymentForm) => {
    try {
      await addDebtPaymentMutation.mutateAsync({ debtId, amount, payment_date, notes })
    } catch (error) {
      alert(error instanceof Error ? error.message : "Ocurrió un error al registrar el pago.")
    }
  }

  const isLoading = authLoading || debtsLoading || assetsLoading

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  const activeDebts = debts.filter((d) => d.status === "active")
  const paidDebts = debts.filter((d) => d.status === "paid")
  const totalDebts = calculations.calculateTotalDebts(debts)
  const totalAssets = calculations.calculateTotalAssets(assets)
  const patrimony = calculations.calculatePatrimony(assets, debts)

  return (
    <DashboardLayout>
      <PageShell className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Gestión de Deudas</h1>
            <p className="text-muted-foreground">Controla tus pasivos y calcula tu patrimonio</p>
          </div>
          <AddDebtDialog onSubmit={handleAddDebt} />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-red-200 bg-red-50/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Pasivos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">${totalDebts.toLocaleString("es-CO")}</div>
              <p className="text-xs text-muted-foreground mt-1">{activeDebts.length} deudas activas</p>
            </CardContent>
          </Card>

          <Card className="border-emerald-200 bg-emerald-50/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Activos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-600">${totalAssets.toLocaleString("es-CO")}</div>
              <p className="text-xs text-muted-foreground mt-1">{assets.length} cuentas</p>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Patrimonio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${patrimony >= 0 ? "text-blue-600" : "text-red-600"}`}>
                ${patrimony.toLocaleString("es-CO")}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Activos - Pasivos</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="active" className="space-y-4">
          <TabsList>
            <TabsTrigger value="active">Activas ({activeDebts.length})</TabsTrigger>
            <TabsTrigger value="paid">Pagadas ({paidDebts.length})</TabsTrigger>
            <TabsTrigger value="all">Todas ({debts.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {activeDebts.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activeDebts.map((debt) => (
                  <DebtCard
                    key={debt.id}
                    debt={debt}
                    onRegisterPayment={handleRegisterPayment}
                    onDelete={handleDeleteDebt}
                    isDeleting={deletingDebtId === debt.id}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <p className="text-muted-foreground">No tienes deudas activas</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Agrega una deuda para comenzar a hacer seguimiento
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="paid" className="space-y-4">
            {paidDebts.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {paidDebts.map((debt) => (
                  <DebtCard
                    key={debt.id}
                    debt={debt}
                    onRegisterPayment={handleRegisterPayment}
                    onDelete={handleDeleteDebt}
                    isDeleting={deletingDebtId === debt.id}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <p className="text-muted-foreground">No tienes deudas pagadas registradas</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="all" className="space-y-4">
            {debts.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {debts.map((debt) => (
                  <DebtCard
                    key={debt.id}
                    debt={debt}
                    onRegisterPayment={handleRegisterPayment}
                    onDelete={handleDeleteDebt}
                    isDeleting={deletingDebtId === debt.id}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <p className="text-muted-foreground">No tienes deudas registradas</p>
                  <p className="text-sm text-muted-foreground mt-1">Agrega tu primera deuda para comenzar</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </PageShell>
    </DashboardLayout>
  )
}
