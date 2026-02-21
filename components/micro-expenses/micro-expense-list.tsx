"use client"

import { Fragment, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { MicroExpense } from "@/lib/types"
import { Trash2 } from "lucide-react"
import { cn, parseDateInput } from "@/lib/utils"

interface MicroExpenseListProps {
  expenses: MicroExpense[]
  onDelete: (expense: MicroExpense) => Promise<void>
  deletingId?: string | null
  isDisabled?: boolean
  className?: string
}

const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
})

const dateFormatter = new Intl.DateTimeFormat("es-CO", {
  weekday: "long",
  day: "2-digit",
  month: "long",
})

export function MicroExpenseList({ expenses, onDelete, deletingId, isDisabled, className }: MicroExpenseListProps) {
  const grouped = useMemo(() => {
    const groups = new Map<string, MicroExpense[]>()
    expenses.forEach((expense) => {
      const existing = groups.get(expense.occurred_on) ?? []
      existing.push(expense)
      groups.set(expense.occurred_on, existing)
    })
    return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [expenses])

  if (expenses.length === 0) {
    return (
      <Card className={cn("flex h-full flex-col", className)}>
        <CardHeader>
          <CardTitle>Historial del mes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Registra tus gastos hormiga para ver el detalle diario.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("h-full overflow-hidden", className)}>
      <CardHeader>
        <CardTitle>Historial del mes</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[420px] sm:h-[500px] lg:h-[580px] xl:h-[640px]">
          <div className="divide-y pb-6">
            {grouped.map(([date, items]) => {
              const parsedDate = parseDateInput(date)
              return (
                <Fragment key={date}>
                  <div className="bg-muted/40 px-4 py-2 text-sm font-medium capitalize">
                    {parsedDate ? dateFormatter.format(parsedDate) : date}
                  </div>
                  <ul className="space-y-3 px-4 py-2">
                    {items.map((expense) => (
                      <li
                        key={expense.id}
                        className="flex items-center justify-between rounded-xl border px-4 py-3 shadow-sm"
                      >
                        <div>
                          <p className="font-medium text-foreground">{expense.description}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            {expense.category && <Badge variant="secondary">{expense.category}</Badge>}
                            <span>{currencyFormatter.format(expense.amount)}</span>
                            {expense.notes && <span className="max-w-[220px] truncate">{expense.notes}</span>}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "text-red-500 hover:text-red-400",
                            isDisabled && "pointer-events-none opacity-50"
                          )}
                          onClick={() => onDelete(expense)}
                          disabled={isDisabled || deletingId === expense.id}
                        >
                          <Trash2 className={cn("h-4 w-4", deletingId === expense.id && "animate-pulse")} />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </Fragment>
              )
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
