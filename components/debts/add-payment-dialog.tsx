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
import { Textarea } from "@/components/ui/textarea"
import { DollarSign, Loader2 } from "lucide-react"

interface AddPaymentDialogProps {
  debtId: string
  currentBalance: number
  onSubmit: (payment: { debtId: string; amount: number; payment_date: string; notes?: string }) => Promise<void>
}

export function AddPaymentDialog({ debtId, currentBalance, onSubmit }: AddPaymentDialogProps) {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    amount: "",
    payment_date: new Date().toISOString().split("T")[0],
    notes: "",
  })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.amount || !formData.payment_date) {
      alert("Por favor completa todos los campos requeridos")
      return
    }

    const paymentAmount = Number.parseFloat(formData.amount)
    if (paymentAmount <= 0) {
      alert("El monto del pago debe ser mayor a 0")
      return
    }

    if (paymentAmount > currentBalance) {
      alert("El monto del pago no puede ser mayor al saldo actual")
      return
    }

    try {
      setSubmitting(true)
      await onSubmit({
        debtId,
        amount: paymentAmount,
        payment_date: formData.payment_date,
        notes: formData.notes || undefined,
      })

      setFormData({
        amount: "",
        payment_date: new Date().toISOString().split("T")[0],
        notes: "",
      })
      setOpen(false)
    } catch (error) {
      alert(error instanceof Error ? error.message : "Ocurrió un error al registrar el pago.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2 bg-transparent">
          <DollarSign className="h-4 w-4" />
          Registrar Pago
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Registrar Pago de Deuda</DialogTitle>
            <DialogDescription>
              Saldo actual: <span className="font-semibold">${currentBalance.toLocaleString("es-CO")}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="amount">Monto del Pago *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
              {formData.amount && (
                <p className="text-xs text-muted-foreground">
                  Nuevo saldo: ${(currentBalance - Number.parseFloat(formData.amount)).toLocaleString("es-CO")}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="payment_date">Fecha de Pago *</Label>
              <Input
                id="payment_date"
                type="date"
                value={formData.payment_date}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                required
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
                "Registrar Pago"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
