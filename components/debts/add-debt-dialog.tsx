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
import { Textarea } from "@/components/ui/textarea"
import { Plus, Loader2 } from "lucide-react"
import type { NewDebtPayload } from "@/lib/api-client"

interface AddDebtDialogProps {
  onSubmit: (debt: NewDebtPayload) => Promise<void>
}

export function AddDebtDialog({ onSubmit }: AddDebtDialogProps) {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    debt_type: "Credito",
    entity_name: "",
    original_amount: "",
    current_balance: "",
    monthly_payment: "",
    payment_day: "",
    start_date: "",
    end_date: "",
    interest_rate: "",
    notes: "",
  })

  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

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
        status: "active",
        notes: formData.notes || undefined,
      })

      setFormData({
        debt_type: "Credito",
        entity_name: "",
        original_amount: "",
        current_balance: "",
        monthly_payment: "",
        payment_day: "",
        start_date: "",
        end_date: "",
        interest_rate: "",
        notes: "",
      })
      setOpen(false)
    } catch (error) {
      alert(error instanceof Error ? error.message : "Ocurrió un error al guardar la deuda.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="mr-2 h-4 w-4" />
          Agregar Deuda
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Agregar Nueva Deuda</DialogTitle>
            <DialogDescription>Registra una nueva deuda o pasivo en tu sistema financiero</DialogDescription>
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
                  placeholder="Ej: Universidad Carol, Itau"
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
                  placeholder="0.00"
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
                  placeholder="0.00"
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
                  placeholder="0.00"
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
                  placeholder="Ej: 15"
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
                placeholder="Ej: 2.5"
                value={formData.interest_rate}
                onChange={(e) => setFormData({ ...formData, interest_rate: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                placeholder="Notas adicionales (opcional)"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar Deuda"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
