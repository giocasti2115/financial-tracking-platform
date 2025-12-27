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
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { Expense } from "@/lib/types"
import { DollarSign } from "lucide-react"

interface RegisterPaymentDialogProps {
  expense: Expense | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onRegisterPayment: (expenseId: string, paymentAmount: number, notes?: string) => void
}

export function RegisterPaymentDialog({ expense, open, onOpenChange, onRegisterPayment }: RegisterPaymentDialogProps) {
  const [paymentAmount, setPaymentAmount] = useState("")
  const [notes, setNotes] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!expense || !paymentAmount) {
      alert("Por favor ingresa el monto del pago")
      return
    }

    const amount = Number.parseFloat(paymentAmount)
    const remaining = expense.amount - expense.amount_paid

    if (amount <= 0) {
      alert("El monto debe ser mayor a 0")
      return
    }

    if (amount > remaining) {
      alert(`El monto no puede ser mayor al saldo pendiente ($${remaining.toLocaleString("es-CO")})`)
      return
    }

    onRegisterPayment(expense.id, amount, notes || undefined)
    setPaymentAmount("")
    setNotes("")
    onOpenChange(false)
  }

  if (!expense) return null

  const remaining = expense.amount - expense.amount_paid
  const percentPaid = (expense.amount_paid / expense.amount) * 100

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
            <DialogDescription>Registra un pago total o parcial para este gasto</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Expense Info */}
            <div className="space-y-2 p-4 rounded-lg bg-muted/50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Gasto:</span>
                <span className="text-sm">{expense.description}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Monto Total:</span>
                <span className="text-sm font-semibold">${expense.amount.toLocaleString("es-CO")}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Pagado:</span>
                <span className="text-sm text-emerald-600">${expense.amount_paid.toLocaleString("es-CO")}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-sm font-medium">Saldo Pendiente:</span>
                <span className="text-base font-bold text-red-600">${remaining.toLocaleString("es-CO")}</span>
              </div>
              {expense.amount_paid > 0 && (
                <div className="pt-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Progreso de pago</span>
                    <span>{percentPaid.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all"
                      style={{ width: `${Math.min(percentPaid, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Payment Amount */}
            <div className="grid gap-2">
              <Label htmlFor="payment-amount">Monto del Pago *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="payment-amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
              <div className="flex gap-2 mt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPaymentAmount((remaining / 2).toFixed(2))}
                >
                  50%
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPaymentAmount(remaining.toFixed(2))}
                >
                  Pago Total
                </Button>
              </div>
            </div>

            {/* Notes */}
            <div className="grid gap-2">
              <Label htmlFor="payment-notes">Notas</Label>
              <Textarea
                id="payment-notes"
                placeholder="Notas sobre el pago (opcional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
              Registrar Pago
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
