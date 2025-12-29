"use client"

import type React from "react"
import { useEffect, useState } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import type { UpdateDebtPayload } from "@/lib/api-client"
import type { Debt } from "@/lib/types"
import { Loader2, Pencil } from "lucide-react"

const formatNumberField = (value: number | null | undefined) =>
  value === null || value === undefined ? "" : value.toString()

const buildInitialState = (debt: Debt) => ({
  debt_type: debt.debt_type || "Credito",
  entity_name: debt.entity_name,
  original_amount: debt.original_amount.toString(),
  current_balance: debt.current_balance.toString(),
  monthly_payment: formatNumberField(debt.monthly_payment),
  payment_day: formatNumberField(debt.payment_day),
  start_date: debt.start_date ? debt.start_date.slice(0, 10) : "",
  end_date: debt.end_date ? debt.end_date.slice(0, 10) : "",
  interest_rate: formatNumberField(debt.interest_rate),
  notes: debt.notes ?? "",
})

interface EditDebtDialogProps {
  debt: Debt
  onSubmit: (payload: UpdateDebtPayload) => Promise<void>
  isUpdating?: boolean
}

export function EditDebtDialog({ debt, onSubmit, isUpdating }: EditDebtDialogProps) {
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState(() => buildInitialState(debt))

  useEffect(() => {
    if (open) {
      setFormData(buildInitialState(debt))
    }
  }, [open, debt])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!formData.entity_name || !formData.original_amount || !formData.current_balance) {
      alert("Por favor completa todos los campos requeridos")
      return
    }

    try {
      setSubmitting(true)
      await onSubmit({
        debt_type: formData.debt_type,
        entity_name: formData.entity_name,
        original_amount: Number.parseFloat(formData.original_amount),
        current_balance: Number.parseFloat(formData.current_balance),
        monthly_payment: formData.monthly_payment ? Number.parseFloat(formData.monthly_payment) : undefined,
        payment_day: formData.payment_day ? Number.parseInt(formData.payment_day, 10) : undefined,
        start_date: formData.start_date || undefined,
        end_date: formData.end_date || undefined,
        interest_rate: formData.interest_rate ? Number.parseFloat(formData.interest_rate) : undefined,
        notes: formData.notes || undefined,
      })
      setOpen(false)
    } catch (error) {
      alert(error instanceof Error ? error.message : "Ocurrió un error al actualizar la deuda.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-emerald-700 hover:bg-emerald-50"
          aria-label="Editar deuda"
          disabled={isUpdating}
        >
          {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Editar Deuda</DialogTitle>
            <DialogDescription>Actualiza los datos de esta obligación</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="debt_type">Tipo de Deuda *</Label>
                <Select
                  value={formData.debt_type}
                  onValueChange={(value) => setFormData({ ...formData, debt_type: value })}
                >
                  <SelectTrigger id="debt_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Credito">Crédito</SelectItem>
                    <SelectItem value="Prestamo">Préstamo</SelectItem>
                    <SelectItem value="Tarjeta">Tarjeta de Crédito</SelectItem>
                    <SelectItem value="Hipoteca">Hipoteca</SelectItem>
                    <SelectItem value="Otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="entity_name">Entidad *</Label>
                <Input
                  id="entity_name"
                  value={formData.entity_name}
                  onChange={(e) => setFormData({ ...formData, entity_name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="original_amount">Monto Original *</Label>
                <Input
                  id="original_amount"
                  type="number"
                  step="0.01"
                  value={formData.original_amount}
                  onChange={(e) => setFormData({ ...formData, original_amount: e.target.value })}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="current_balance">Saldo Actual *</Label>
                <Input
                  id="current_balance"
                  type="number"
                  step="0.01"
                  value={formData.current_balance}
                  onChange={(e) => setFormData({ ...formData, current_balance: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="monthly_payment">Pago Mensual</Label>
                <Input
                  id="monthly_payment"
                  type="number"
                  step="0.01"
                  value={formData.monthly_payment}
                  onChange={(e) => setFormData({ ...formData, monthly_payment: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="payment_day">Día de Pago</Label>
                <Input
                  id="payment_day"
                  type="number"
                  min="1"
                  max="31"
                  value={formData.payment_day}
                  onChange={(e) => setFormData({ ...formData, payment_day: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="start_date">Fecha de Inicio</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="end_date">Fecha de Finalización</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="interest_rate">Tasa de Interés (%)</Label>
              <Input
                id="interest_rate"
                type="number"
                step="0.01"
                value={formData.interest_rate}
                onChange={(e) => setFormData({ ...formData, interest_rate: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar Cambios"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
