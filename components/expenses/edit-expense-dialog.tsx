"use client"

import type React from "react"
import { useState, useEffect } from "react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { Expense, PaymentPeriod } from "@/lib/types"

interface EditExpenseDialogProps {
  expense: Expense | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (expense: Expense) => void
}

export function EditExpenseDialog({ expense, open, onOpenChange, onSave }: EditExpenseDialogProps) {
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    payment_date: "",
    payment_period: "primera_quincena" as PaymentPeriod,
    semester: "1",
    year: new Date().getFullYear().toString(),
    notes: "",
  })

  useEffect(() => {
    if (expense) {
      setFormData({
        description: expense.description,
        amount: expense.amount.toString(),
        payment_date: expense.payment_date,
        payment_period: expense.payment_period,
        semester: expense.semester.toString(),
        year: expense.year.toString(),
        notes: expense.notes || "",
      })
    }
  }, [expense])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!expense || !formData.description || !formData.amount || !formData.payment_date) {
      alert("Por favor completa todos los campos requeridos")
      return
    }

    const updatedExpense: Expense = {
      ...expense,
      description: formData.description,
      amount: Number.parseFloat(formData.amount),
      payment_date: formData.payment_date,
      payment_period: formData.payment_period,
      semester: Number.parseInt(formData.semester),
      year: Number.parseInt(formData.year),
      notes: formData.notes || undefined,
      updated_at: new Date().toISOString(),
    }

    onSave(updatedExpense)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Editar Gasto</DialogTitle>
            <DialogDescription>Modifica la información del gasto</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Descripción *</Label>
              <Input
                id="edit-description"
                placeholder="Ej: Diezmo Gio, Parqueadero, Netflix"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-amount">Monto *</Label>
              <Input
                id="edit-amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-payment_period">Quincena *</Label>
                <Select
                  value={formData.payment_period}
                  onValueChange={(value) => setFormData({ ...formData, payment_period: value as PaymentPeriod })}
                >
                  <SelectTrigger id="edit-payment_period">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primera_quincena">Primera (15)</SelectItem>
                    <SelectItem value="segunda_quincena">Segunda (30)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-payment_date">Fecha de Pago *</Label>
                <Input
                  id="edit-payment_date"
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-semester">Semestre *</Label>
                <Select
                  value={formData.semester}
                  onValueChange={(value) => setFormData({ ...formData, semester: value })}
                >
                  <SelectTrigger id="edit-semester">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Primer Semestre</SelectItem>
                    <SelectItem value="2">Segundo Semestre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-year">Año *</Label>
                <Input
                  id="edit-year"
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-notes">Notas</Label>
              <Textarea
                id="edit-notes"
                placeholder="Notas adicionales (opcional)"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
              Guardar Cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
