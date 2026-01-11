"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { QuincenalSummary } from "@/lib/types"

interface QuincenalOverviewProps {
  summary: QuincenalSummary
}

export function QuincenalOverview({ summary }: QuincenalOverviewProps) {
  const usagePercentage = summary.total_income > 0 ? (summary.paid_expenses / summary.total_income) * 100 : 0

  const monthNames = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ]

  const periodName = summary.period === "primera_quincena" ? "Primera Quincena" : "Segunda Quincena"

  return (
    <Card className="rounded-2xl border-[#f0e2cf] bg-[#fff7ec] shadow-sm">
      <CardHeader>
        <CardTitle>Resumen Quincenal</CardTitle>
        <CardDescription>
          {periodName} - {monthNames[summary.month - 1]} {summary.year}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-sm text-[#6d5d4d]">Ingresos</span>
            <span className="font-semibold text-[#0f253b]">
              ${summary.total_income.toLocaleString("es-CO")}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-sm text-[#6d5d4d]">Gastos Pagados</span>
            <span className="font-semibold text-[#7a1f2d]">
              -${summary.paid_expenses.toLocaleString("es-CO")}
            </span>
          </div>
          {summary.pending_expenses > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-sm text-[#6d5d4d]">Gastos Pendientes</span>
              <span className="font-medium text-[#b2761c]">
                ${summary.pending_expenses.toLocaleString("es-CO")}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm pt-2 border-t border-[#f0e2cf]">
            <span className="font-medium">Disponible</span>
            <span className={`font-bold text-lg ${summary.available >= 0 ? "text-[#2f6b3c]" : "text-[#7a1f2d]"}`}>
              ${summary.available.toLocaleString("es-CO")}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-[#6d5d4d]">
            <span>Uso del presupuesto</span>
            <span>{usagePercentage.toFixed(1)}%</span>
          </div>
          <Progress
            value={Math.min(usagePercentage, 100)}
            className="h-2 bg-[rgba(4,23,36,0.08)]"
            indicatorClassName="bg-[#d9a441]"
          />
        </div>

        {summary.expenses.length > 0 && (
          <div className="space-y-2 pt-2">
            <h4 className="text-sm font-medium">Principales Gastos</h4>
            <div className="space-y-1">
              {summary.expenses
                .sort((a, b) => b.amount - a.amount)
                .slice(0, 5)
                .map((expense) => {
                  const amountPaid = expense.amount_paid || 0
                  const isPaid = amountPaid >= expense.amount
                  const isPartial = amountPaid > 0 && amountPaid < expense.amount

                  return (
                    <div key={expense.id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 truncate flex-1">
                        <span className="text-muted-foreground truncate">{expense.description}</span>
                        {isPaid && <span className="text-[#2f6b3c] text-[10px]">✓ Pagado</span>}
                        {isPartial && (
                          <span className="text-[#b2761c] text-[10px]">
                            Parcial: ${amountPaid.toLocaleString("es-CO")}
                          </span>
                        )}
                      </div>
                      <span className="font-medium ml-2">${expense.amount.toLocaleString("es-CO")}</span>
                    </div>
                  )
                })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
