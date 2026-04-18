"use client"

import { useState, useMemo, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import type { Expense } from "@/lib/types"
import { Copy, Pencil } from "lucide-react"

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

export type PropagateAction =
  | { type: "update"; targets: Expense[]; changes: Pick<Expense, "description" | "amount" | "payment_period" | "debt_id"> }
  | { type: "clone"; months: Array<{ month: number; year: number }> }

interface PropagateExpenseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "edit" | "add"
  savedExpense: Expense | null
  allExpenses: Expense[]
  onPropagate: (action: PropagateAction) => Promise<void>
  isLoading?: boolean
}

export function PropagateExpenseDialog({
  open,
  onOpenChange,
  mode,
  savedExpense,
  allExpenses,
  onPropagate,
  isLoading,
}: PropagateExpenseDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  // Future expenses with same description (for edit mode)
  const editTargets = useMemo(() => {
    if (!savedExpense || mode !== "edit") return []
    const savedDate = new Date(savedExpense.payment_date)
    const savedStamp = savedDate.getFullYear() * 12 + savedDate.getMonth()

    return allExpenses
      .filter((e) => {
        if (e.id === savedExpense.id) return false
        if (e.description.trim().toLowerCase() !== savedExpense.description.trim().toLowerCase()) return false
        const d = new Date(e.payment_date)
        return d.getFullYear() * 12 + d.getMonth() > savedStamp
      })
      .sort((a, b) => a.payment_date.localeCompare(b.payment_date))
  }, [savedExpense, allExpenses, mode])

  // Remaining months without this expense (for add mode)
  const cloneTargets = useMemo(() => {
    if (!savedExpense || mode !== "add") return []
    const savedDate = new Date(savedExpense.payment_date)
    const savedMonth = savedDate.getMonth() + 1
    const savedYear = savedDate.getFullYear()

    const existingMonths = new Set(
      allExpenses
        .filter(
          (e) =>
            e.description.trim().toLowerCase() === savedExpense.description.trim().toLowerCase() &&
            e.year === savedYear,
        )
        .map((e) => new Date(e.payment_date).getMonth() + 1),
    )

    const targets: Array<{ month: number; year: number; key: string; label: string }> = []
    for (let m = savedMonth + 1; m <= 12; m++) {
      if (!existingMonths.has(m)) {
        targets.push({ month: m, year: savedYear, key: `${savedYear}-${m}`, label: `${MONTH_NAMES[m - 1]} ${savedYear}` })
      }
    }
    return targets
  }, [savedExpense, allExpenses, mode])

  // Pre-select all when dialog opens
  useEffect(() => {
    if (!open) return
    if (mode === "edit") {
      setSelected(new Set(editTargets.map((e) => e.id)))
    } else {
      setSelected(new Set(cloneTargets.map((t) => t.key)))
    }
  }, [open, mode, editTargets, cloneTargets])

  const items = mode === "edit" ? editTargets : cloneTargets
  const isEmpty = items.length === 0

  const allKeys = mode === "edit" ? editTargets.map((e) => e.id) : cloneTargets.map((t) => t.key)
  const allSelected = allKeys.length > 0 && allKeys.every((k) => selected.has(k))

  const toggleAll = (checked: boolean) => setSelected(checked ? new Set(allKeys) : new Set())

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })

  const handlePropagate = async () => {
    if (!savedExpense) return
    setLoading(true)
    try {
      if (mode === "edit") {
        const targets = editTargets.filter((e) => selected.has(e.id))
        await onPropagate({
          type: "update",
          targets,
          changes: {
            description: savedExpense.description,
            amount: savedExpense.amount,
            payment_period: savedExpense.payment_period,
            debt_id: savedExpense.debt_id,
          },
        })
      } else {
        const months = cloneTargets
          .filter((t) => selected.has(t.key))
          .map(({ month, year }) => ({ month, year }))
        await onPropagate({ type: "clone", months })
      }
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  if (!savedExpense) return null

  const busy = loading || isLoading

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === "edit" ? <Pencil className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {mode === "edit" ? "¿Actualizar meses siguientes?" : "¿Clonar a meses siguientes?"}
          </DialogTitle>
          <DialogDescription>
            {mode === "edit"
              ? `Encontramos "${savedExpense.description}" en meses posteriores. Puedes aplicar los mismos cambios de monto y quincena.`
              : `¿Deseas clonar "${savedExpense.description}" en los meses restantes del año?`}
          </DialogDescription>
        </DialogHeader>

        {isEmpty ? (
          <p className="text-sm text-muted-foreground py-2">
            {mode === "edit"
              ? "No hay gastos con este nombre en meses futuros."
              : "Ya existe este gasto en todos los meses restantes del año."}
          </p>
        ) : (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 pb-2 border-b">
              <Checkbox
                id="select-all-propagate"
                checked={allSelected}
                onCheckedChange={(checked) => toggleAll(Boolean(checked))}
              />
              <Label htmlFor="select-all-propagate" className="text-sm font-medium cursor-pointer">
                Seleccionar todos ({items.length})
              </Label>
            </div>

            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {mode === "edit"
                ? editTargets.map((expense) => {
                    const d = new Date(expense.payment_date)
                    const label = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`
                    return (
                      <div key={expense.id} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`prop-${expense.id}`}
                            checked={selected.has(expense.id)}
                            onCheckedChange={() => toggle(expense.id)}
                          />
                          <Label htmlFor={`prop-${expense.id}`} className="text-sm font-normal cursor-pointer">
                            {label}
                          </Label>
                        </div>
                        <Badge variant="outline" className="text-xs tabular-nums">
                          ${expense.amount.toLocaleString("es-CO")}
                        </Badge>
                      </div>
                    )
                  })
                : cloneTargets.map((t) => (
                    <div key={t.key} className="flex items-center gap-2">
                      <Checkbox
                        id={`prop-${t.key}`}
                        checked={selected.has(t.key)}
                        onCheckedChange={() => toggle(t.key)}
                      />
                      <Label htmlFor={`prop-${t.key}`} className="text-sm font-normal cursor-pointer">
                        {t.label}
                      </Label>
                    </div>
                  ))}
            </div>
          </div>
        )}

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Solo este mes
          </Button>
          {!isEmpty && (
            <Button
              onClick={handlePropagate}
              disabled={selected.size === 0 || busy}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {busy
                ? "Aplicando..."
                : `Aplicar a ${selected.size} mes${selected.size !== 1 ? "es" : ""}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
