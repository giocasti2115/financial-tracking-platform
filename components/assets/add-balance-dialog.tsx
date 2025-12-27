"use client"

import type React from "react"

import { useState } from "react"
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
import { Plus, Minus } from "lucide-react"
import type { Asset } from "@/lib/types"

interface AddBalanceDialogProps {
  asset: Asset
  onSubmit: (payload: { assetId: string; current_balance: number }) => Promise<void>
}

export function AddBalanceDialog({ asset, onSubmit }: AddBalanceDialogProps) {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    transaction_type: "deposit" as "deposit" | "withdrawal",
    amount: "",
  })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.amount) {
      alert("Por favor ingresa un monto")
      return
    }

    const amount = Number.parseFloat(formData.amount)
    const newBalance =
      formData.transaction_type === "deposit" ? asset.current_balance + amount : asset.current_balance - amount

    if (newBalance < 0) {
      alert("El saldo no puede ser negativo")
      return
    }

    try {
      setSubmitting(true)
      await onSubmit({ assetId: asset.id, current_balance: newBalance })

      setFormData({
        transaction_type: "deposit",
        amount: "",
      })
      setOpen(false)
    } catch (error) {
      alert(error instanceof Error ? error.message : "Ocurrió un error al actualizar el saldo.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full bg-transparent">
          <Plus className="mr-2 h-4 w-4" />
          Actualizar Saldo
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Actualizar Saldo - {asset.account_name}</DialogTitle>
            <DialogDescription>Registra un depósito o retiro en esta cuenta</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Saldo Actual</Label>
              <div className="text-2xl font-bold text-emerald-600">
                ${asset.current_balance.toLocaleString("es-CO")}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="transaction_type">Tipo de Transacción *</Label>
              <Select
                value={formData.transaction_type}
                onValueChange={(value: any) => setFormData({ ...formData, transaction_type: value })}
              >
                <SelectTrigger id="transaction_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deposit">
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4 text-green-600" />
                      <span>Depósito (Agregar)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="withdrawal">
                    <div className="flex items-center gap-2">
                      <Minus className="h-4 w-4 text-red-600" />
                      <span>Retiro (Restar)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
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

            {formData.amount && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-1">Nuevo Saldo:</p>
                <p className="text-xl font-bold text-emerald-600">
                  $
                  {(formData.transaction_type === "deposit"
                    ? asset.current_balance + Number.parseFloat(formData.amount)
                    : asset.current_balance - Number.parseFloat(formData.amount)
                  ).toLocaleString("es-CO")}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={submitting}>
              {submitting ? "Actualizando..." : "Actualizar Saldo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
