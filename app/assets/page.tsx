"use client"

import type React from "react"
import { AddBalanceDialog } from "@/components/assets/add-balance-dialog"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { PageShell } from "@/components/dashboard/page-shell"
import type { Asset } from "@/lib/types"
import { Info, Loader2, Plus, Trash2 } from "lucide-react"
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export default function AssetsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    account_name: "",
    account_type: "savings" as "savings" | "checking" | "investment",
    current_balance: "",
    notes: "",
  })
  const [deletingAssetId, setDeletingAssetId] = useState<string | null>(null)

  const { data: assets = [], isLoading: assetsLoading } = useQuery<Asset[]>({
    queryKey: ["assets"],
    queryFn: apiClient.getAssets,
    enabled: !authLoading && Boolean(user),
  })

  const createAssetMutation = useMutation({
    mutationFn: apiClient.createAsset,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["assets"] }),
  })

  const deleteAssetMutation = useMutation({
    mutationFn: apiClient.deleteAsset,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["assets"] }),
  })

  const updateAssetMutation = useMutation({
    mutationFn: ({ assetId, current_balance }: { assetId: string; current_balance: number }) =>
      apiClient.updateAsset(assetId, { current_balance }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["assets"] }),
  })

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.account_name || !formData.current_balance) {
      alert("Por favor completa todos los campos requeridos")
      return
    }

    try {
      await createAssetMutation.mutateAsync({
        account_name: formData.account_name,
        account_type: formData.account_type,
        current_balance: Number.parseFloat(formData.current_balance),
      })

      setFormData({
        account_name: "",
        account_type: "savings",
        current_balance: "",
        notes: "",
      })
      setOpen(false)
    } catch (error) {
      alert(error instanceof Error ? error.message : "Ocurrió un error al guardar el activo.")
    }
  }

  const handleDeleteAsset = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este activo?")) {
      return
    }

    try {
      setDeletingAssetId(id)
      await deleteAssetMutation.mutateAsync(id)
    } catch (error) {
      alert(error instanceof Error ? error.message : "Ocurrió un error al eliminar el activo.")
    } finally {
      setDeletingAssetId(null)
    }
  }

  const handleUpdateAsset = async ({ assetId, current_balance }: { assetId: string; current_balance: number }) => {
    try {
      await updateAssetMutation.mutateAsync({ assetId, current_balance })
    } catch (error) {
      alert(error instanceof Error ? error.message : "Ocurrió un error al actualizar el saldo.")
    }
  }

  const isLoading = authLoading || assetsLoading

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  const totalAssets = useMemo(() => assets.reduce((sum, a) => sum + a.current_balance, 0), [assets])

  return (
    <DashboardLayout>
      <PageShell className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">Gestión de Activos</h1>
              <Tooltip>
                <TooltipTrigger
                  type="button"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="Descripción del módulo de activos"
                >
                  <Info className="h-4 w-4" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  Lleva control de tus cuentas de ahorro, inversiones y actualiza saldos al instante.
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-muted-foreground">Administra tus cuentas de ahorro e inversiones</p>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="mr-2 h-4 w-4" />
                Agregar Activo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleAddAsset}>
                <DialogHeader>
                  <DialogTitle>Agregar Nuevo Activo</DialogTitle>
                  <DialogDescription>Registra una nueva cuenta de ahorro o inversión</DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="account_name">Nombre de la Cuenta *</Label>
                    <Input
                      id="account_name"
                      placeholder="Ej: Ahorro, Nombre Banco, CDT"
                      value={formData.account_name}
                      onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="account_type">Tipo de Cuenta *</Label>
                    <Select
                      value={formData.account_type}
                      onValueChange={(value: any) => setFormData({ ...formData, account_type: value })}
                    >
                      <SelectTrigger id="account_type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="savings">Ahorro</SelectItem>
                        <SelectItem value="checking">Corriente</SelectItem>
                        <SelectItem value="investment">Inversión</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="current_balance">Saldo Actual *</Label>
                    <Input
                      id="current_balance"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.current_balance}
                      onChange={(e) => setFormData({ ...formData, current_balance: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    disabled={createAssetMutation.isPending}
                  >
                    {createAssetMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      "Guardar Activo"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary */}
        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
          <CardHeader>
            <CardTitle>Total de Activos</CardTitle>
            <CardDescription>Suma de todas tus cuentas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-emerald-700">${totalAssets.toLocaleString("es-CO")}</div>
          </CardContent>
        </Card>

        {/* Assets Grid */}
        {assets.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {assets.map((asset) => (
              <Card key={asset.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{asset.account_name}</CardTitle>
                      <CardDescription className="capitalize">{asset.account_type}</CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDeleteAsset(asset.id)}
                      disabled={deletingAssetId === asset.id}
                    >
                      {deletingAssetId === asset.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-3xl font-bold text-emerald-600">
                      ${asset.current_balance.toLocaleString("es-CO")}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Última actualización: {new Date(asset.last_updated).toLocaleDateString("es-CO")}
                    </p>
                    <AddBalanceDialog asset={asset} onSubmit={handleUpdateAsset} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">No tienes activos registrados</p>
              <p className="text-sm text-muted-foreground mt-1">Agrega tu primera cuenta para comenzar</p>
            </CardContent>
          </Card>
        )}
      </PageShell>
    </DashboardLayout>
  )
}
