"use client"

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
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import type { Expense } from "@/lib/types"
import { getFinancialYears } from "@/lib/utils"
import { Copy, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface CloneExpensesDialogProps {
  expenses: Expense[]
  onClone: (expenses: Omit<Expense, "id" | "created_at" | "updated_at">[]) => Promise<void> | void
}

export function CloneExpensesDialog({ expenses, onClone }: CloneExpensesDialogProps) {
  const [open, setOpen] = useState(false)
  const [sourceMonth, setSourceMonth] = useState<string | undefined>(undefined)
  const [sourceYear, setSourceYear] = useState<string | undefined>(undefined)
  const [pendingTargetMonth, setPendingTargetMonth] = useState<string | undefined>(undefined)
  const [pendingTargetYear, setPendingTargetYear] = useState<string | undefined>(undefined)
  const [isCloning, setIsCloning] = useState(false)
  const [sourceSemester, setSourceSemester] = useState<"all" | "1" | "2">("all")
  const [sourcePeriod, setSourcePeriod] = useState<"all" | Expense["payment_period"]>("all")
  const [targetSemester, setTargetSemester] = useState<"auto" | "1" | "2">("auto")
  const [targetPeriod, setTargetPeriod] = useState<"keep" | Expense["payment_period"]>("keep")
  const [targetPeriods, setTargetPeriods] = useState<Array<{ month: string; year: string }>>([])
  const { toast } = useToast()
  const years = getFinancialYears()
  const maxAvailableYear = years[years.length - 1]
  const isTargetSelectionReady = Boolean(pendingTargetMonth && pendingTargetYear)

  useEffect(() => {
    if (open && !pendingTargetYear && sourceYear) {
      setPendingTargetYear(sourceYear)
    }
  }, [open, pendingTargetYear, sourceYear])

  const handleSourceSemesterChange = (value: string) => setSourceSemester(value as "all" | "1" | "2")
  const handleSourcePeriodChange = (value: string) =>
    setSourcePeriod(value as "all" | Expense["payment_period"])
  const handleTargetSemesterChange = (value: string) => setTargetSemester(value as "auto" | "1" | "2")
  const handleTargetPeriodChange = (value: string) =>
    setTargetPeriod(value as "keep" | Expense["payment_period"])

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

  const getDayForPeriod = (year: number, month: number, period: Expense["payment_period"]) => {
    if (period === "primera_quincena") {
      return "15"
    }

    const daysInMonth = new Date(year, month, 0).getDate()
    const day = Math.min(30, daysInMonth)
    return String(day).padStart(2, "0")
  }

  const getMonthYearKey = (expense: Expense) => {
    const [year, month] = expense.payment_date.split("-")
    return `${year}-${month}`
  }

  const addTargetPeriod = () => {
    const targetMonthValue = pendingTargetMonth
    const targetYearValue = pendingTargetYear

    if (!targetMonthValue || !targetYearValue) {
      toast({
        variant: "destructive",
        title: "Periodo incompleto",
        description: "Selecciona mes y año antes de agregar un destino.",
      })
      return
    }

    const duplicate = targetPeriods.some(
      (period) => period.month === targetMonthValue && period.year === targetYearValue,
    )

    if (duplicate) {
      toast({
        variant: "destructive",
        title: "Periodo repetido",
        description: "Ese mes destino ya fue agregado.",
      })
      return
    }

    setTargetPeriods((prev) => [...prev, { month: targetMonthValue, year: targetYearValue }])

    const monthNumber = Number.parseInt(targetMonthValue, 10)
    const yearNumber = Number.parseInt(targetYearValue, 10)
    const nextMonthNumber = monthNumber === 12 ? 1 : monthNumber + 1
    const nextYearNumber = monthNumber === 12 ? yearNumber + 1 : yearNumber

    if (nextYearNumber > maxAvailableYear) {
      setPendingTargetMonth(undefined)
      setPendingTargetYear(maxAvailableYear.toString())
      return
    }

    setPendingTargetMonth(nextMonthNumber.toString())
    setPendingTargetYear(nextYearNumber.toString())
  }

  const removeTargetPeriod = (period: { month: string; year: string }) => {
    setTargetPeriods((prev) => prev.filter((item) => item.month !== period.month || item.year !== period.year))
  }

  const handleClone = async () => {
    if (!sourceMonth || !sourceYear || targetPeriods.length === 0) {
      toast({
        variant: "destructive",
        title: "Datos incompletos",
        description: "Selecciona el mes y año origen y agrega al menos un destino.",
      })
      return
    }

    const sourceMonthNumber = Number.parseInt(sourceMonth)
    const sourceYearNumber = Number.parseInt(sourceYear)

    const sourceExpenses = expenses.filter((expense) => {
      const [year, month] = expense.payment_date.split("-").map((value) => Number(value))
      const matchesMonth = month === sourceMonthNumber && year === sourceYearNumber
      const matchesSemester = sourceSemester === "all" || expense.semester === Number.parseInt(sourceSemester)
      const matchesPeriod = sourcePeriod === "all" || expense.payment_period === sourcePeriod
      return matchesMonth && matchesSemester && matchesPeriod
    })

    if (sourceExpenses.length === 0) {
      toast({
        variant: "destructive",
        title: "Sin datos",
        description: "No hay gastos en el mes seleccionado.",
      })
      return
    }

    const existingKeysByMonth = new Map<string, Set<string>>()
    expenses.forEach((expense) => {
      const monthKey = getMonthYearKey(expense)
      const bucket = existingKeysByMonth.get(monthKey) || new Set<string>()
      bucket.add(`${expense.description.toLowerCase()}-${expense.payment_period}-${expense.debt_id ?? "none"}`)
      existingKeysByMonth.set(monthKey, bucket)
    })

    let skipped = 0
    const clonedExpenses: Array<Omit<Expense, "id" | "created_at" | "updated_at">> = []

    targetPeriods.forEach((period) => {
      const targetMonthNumber = Number.parseInt(period.month)
      const targetYearNumber = Number.parseInt(period.year)
      const targetKey = `${targetYearNumber}-${String(targetMonthNumber).padStart(2, "0")}`
      const keyBucket = new Set(existingKeysByMonth.get(targetKey) ?? [])

      sourceExpenses.forEach((expense) => {
        const resolvedPeriod = targetPeriod === "keep" ? expense.payment_period : targetPeriod
        const cloneKey = `${expense.description.toLowerCase()}-${resolvedPeriod}-${expense.debt_id ?? "none"}`
        if (keyBucket.has(cloneKey)) {
          skipped += 1
          return
        }

        keyBucket.add(cloneKey)
        existingKeysByMonth.set(targetKey, keyBucket)

        const resolvedSemester =
          targetSemester === "auto" ? (targetMonthNumber <= 6 ? 1 : 2) : Number(targetSemester)
        const day = getDayForPeriod(targetYearNumber, targetMonthNumber, resolvedPeriod)

        clonedExpenses.push({
          user_id: expense.user_id,
          category_id: expense.category_id,
          description: expense.description,
          amount: expense.amount,
          payment_date: `${targetYearNumber}-${String(targetMonthNumber).padStart(2, "0")}-${day}`,
          payment_period: resolvedPeriod,
          semester: resolvedSemester,
          year: targetYearNumber,
          notes: expense.notes ?? undefined,
          is_paid: false,
          amount_paid: 0,
          debt_id: expense.debt_id,
        })
      })
    })

    if (clonedExpenses.length === 0) {
      toast({
        title: "Nada por clonar",
        description: skipped ? `Todos los ${skipped} gastos ya existen en el destino.` : undefined,
      })
      return
    }

    try {
      setIsCloning(true)
      await onClone(clonedExpenses)
      toast({
        title: "Clonación completada",
        description: skipped
          ? `${clonedExpenses.length} gastos clonados, ${skipped} evitados por duplicados.`
          : `${clonedExpenses.length} gastos clonados al nuevo periodo.`,
      })
      setOpen(false)
      setSourceMonth(undefined)
      setSourceYear(undefined)
      setPendingTargetMonth(undefined)
      setPendingTargetYear(undefined)
      setTargetPeriods([])
    } catch (error) {
      const message = error instanceof Error ? error.message : "No pudimos clonar los gastos."
      toast({
        variant: "destructive",
        title: "Error al clonar",
        description: message,
      })
    } finally {
      setIsCloning(false)
      setSourceSemester("all")
      setSourcePeriod("all")
      setTargetSemester("auto")
      setTargetPeriod("keep")
    }
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
                <Select value={sourceMonth ?? undefined} onValueChange={setSourceMonth}>
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
                <Select value={sourceYear ?? undefined} onValueChange={setSourceYear}>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="source-semester">Semestre</Label>
                <Select value={sourceSemester} onValueChange={handleSourceSemesterChange}>
                  <SelectTrigger id="source-semester">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="1">Primer semestre</SelectItem>
                    <SelectItem value="2">Segundo semestre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="source-period">Quincena</Label>
                <Select value={sourcePeriod} onValueChange={handleSourcePeriodChange}>
                  <SelectTrigger id="source-period">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="primera_quincena">Primera (15)</SelectItem>
                    <SelectItem value="segunda_quincena">Segunda (30)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-sm">Mes Destino</h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr,1fr,auto]">
              <div className="grid gap-2">
                <Label htmlFor="target-month">Mes</Label>
                <Select value={pendingTargetMonth ?? undefined} onValueChange={setPendingTargetMonth}>
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
                <Select value={pendingTargetYear ?? undefined} onValueChange={setPendingTargetYear}>
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

              <div className="flex items-end">
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={addTargetPeriod}
                  disabled={!isTargetSelectionReady}
                >
                  Agregar
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {targetPeriods.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aún no has agregado meses destino.</p>
              ) : (
                targetPeriods.map((period) => {
                  const monthLabel = months.find((month) => month.value === period.month)?.label ?? period.month
                  return (
                    <Badge key={`${period.year}-${period.month}`} variant="secondary" className="gap-2">
                      {monthLabel} {period.year}
                      <button
                        type="button"
                        className="rounded-full p-0.5 hover:bg-muted"
                        onClick={() => removeTargetPeriod(period)}
                        aria-label="Quitar periodo"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )
                })
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="target-semester">Semestre destino</Label>
                <Select value={targetSemester} onValueChange={handleTargetSemesterChange}>
                  <SelectTrigger id="target-semester">
                    <SelectValue placeholder="Automático" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Automático (según mes)</SelectItem>
                    <SelectItem value="1">Forzar primer semestre</SelectItem>
                    <SelectItem value="2">Forzar segundo semestre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="target-period">Quincena destino</Label>
                <Select value={targetPeriod} onValueChange={handleTargetPeriodChange}>
                  <SelectTrigger id="target-period">
                    <SelectValue placeholder="Conservar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="keep">Conservar del gasto original</SelectItem>
                    <SelectItem value="primera_quincena">Primera (15)</SelectItem>
                    <SelectItem value="segunda_quincena">Segunda (30)</SelectItem>
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
          <Button onClick={handleClone} className="bg-emerald-600 hover:bg-emerald-700" disabled={isCloning}>
            Clonar Gastos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
