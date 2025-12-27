"use client"

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
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Expense } from "@/lib/types"
import { Copy } from "lucide-react"

interface CloneExpensesDialogProps {
  expenses: Expense[]
  onClone: (expenses: Omit<Expense, "id" | "created_at" | "updated_at">[]) => void
}

export function CloneExpensesDialog({ expenses, onClone }: CloneExpensesDialogProps) {
  const [open, setOpen] = useState(false)
  const [sourceMonth, setSourceMonth] = useState("")
  const [sourceYear, setSourceYear] = useState("")
  const [targetMonth, setTargetMonth] = useState("")
  const [targetYear, setTargetYear] = useState("")

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)
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

  const handleClone = () => {
    if (!sourceMonth || !sourceYear || !targetMonth || !targetYear) {
      alert("Por favor selecciona el mes origen y destino")
      return
    }

    // Filter expenses from source month
    const sourceExpenses = expenses.filter((e) => {
      const expenseDate = new Date(e.payment_date)
      return (
        expenseDate.getMonth() + 1 === Number.parseInt(sourceMonth) &&
        expenseDate.getFullYear() === Number.parseInt(sourceYear)
      )
    })

    if (sourceExpenses.length === 0) {
      alert("No hay gastos en el mes seleccionado")
      return
    }

    // Clone expenses to target month
    const clonedExpenses = sourceExpenses.map((expense) => {
      const newDate = new Date(
        Number.parseInt(targetYear),
        Number.parseInt(targetMonth) - 1,
        expense.payment_period === "primera_quincena" ? 15 : 30,
      )

      const targetSemester = Number.parseInt(targetMonth) <= 6 ? 1 : 2

      return {
        user_id: expense.user_id,
        category_id: expense.category_id,
        description: expense.description,
        amount: expense.amount,
        payment_date: newDate.toISOString().split("T")[0],
        payment_period: expense.payment_period,
        semester: targetSemester,
        year: Number.parseInt(targetYear),
        notes: expense.notes,
        is_paid: false,
      }
    })

    onClone(clonedExpenses)
    setOpen(false)
    setSourceMonth("")
    setSourceYear("")
    setTargetMonth("")
    setTargetYear("")
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-emerald-600 text-emerald-600 hover:bg-emerald-50 bg-transparent">
          <Copy className="mr-2 h-4 w-4" />
          Clonar Gastos
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Clonar Gastos de un Mes</DialogTitle>
          <DialogDescription>Copia todos los gastos de un mes a otro mes automáticamente</DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Mes Origen</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="source-month">Mes</Label>
                <Select value={sourceMonth} onValueChange={setSourceMonth}>
                  <SelectTrigger id="source-month">
                    <SelectValue placeholder="Seleccionar" />
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

              <div className="grid gap-2">
                <Label htmlFor="source-year">Año</Label>
                <Select value={sourceYear} onValueChange={setSourceYear}>
                  <SelectTrigger id="source-year">
                    <SelectValue placeholder="Seleccionar" />
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
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-sm">Mes Destino</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="target-month">Mes</Label>
                <Select value={targetMonth} onValueChange={setTargetMonth}>
                  <SelectTrigger id="target-month">
                    <SelectValue placeholder="Seleccionar" />
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

              <div className="grid gap-2">
                <Label htmlFor="target-year">Año</Label>
                <Select value={targetYear} onValueChange={setTargetYear}>
                  <SelectTrigger id="target-year">
                    <SelectValue placeholder="Seleccionar" />
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
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleClone} className="bg-emerald-600 hover:bg-emerald-700">
            Clonar Gastos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
