"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { Debt } from "@/lib/types"
import { calculations } from "@/lib/calculations"

interface DebtSummaryProps {
  debts: Debt[]
}

export function DebtSummary({ debts }: DebtSummaryProps) {
  const activeDebts = debts.filter((d) => d.status === "active")
  const totalDebt = calculations.calculateTotalDebts(debts)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumen de Deudas</CardTitle>
        <CardDescription>{activeDebts.length} deudas activas</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Adeudado</span>
            <span className="text-2xl font-bold text-red-600">${totalDebt.toLocaleString("es-CO")}</span>
          </div>
        </div>

        {activeDebts.length > 0 && (
          <div className="space-y-3 pt-2">
            {activeDebts.slice(0, 5).map((debt) => {
              const progress = ((debt.original_amount - debt.current_balance) / debt.original_amount) * 100
              const monthsLeft = calculations.calculateMonthsUntilPaidOff(debt)

              return (
                <div key={debt.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{debt.entity_name}</p>
                      <p className="text-xs text-muted-foreground">
                        ${debt.current_balance.toLocaleString("es-CO")} de $
                        {debt.original_amount.toLocaleString("es-CO")}
                      </p>
                    </div>
                    {monthsLeft && (
                      <div className="text-right">
                        <p className="text-xs font-medium">{monthsLeft} meses</p>
                        <p className="text-xs text-muted-foreground">restantes</p>
                      </div>
                    )}
                  </div>
                  <Progress value={progress} className="h-1.5" />
                </div>
              )
            })}
          </div>
        )}

        {activeDebts.length === 0 && (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground">No tienes deudas activas</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
