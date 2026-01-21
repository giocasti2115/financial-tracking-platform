"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import type { MicroExpenseSummary } from "@/lib/types"
import { Badge } from "@/components/ui/badge"

interface MicroExpenseSummaryProps {
  summary?: MicroExpenseSummary
  monthLabel: string
  isLoading: boolean
}

const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
})

export function MicroExpenseSummary({ summary, monthLabel, isLoading }: MicroExpenseSummaryProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Resumen de Gastos Hormiga</CardTitle>
          <CardDescription>{monthLabel}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    )
  }

  if (!summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Resumen de Gastos Hormiga</CardTitle>
          <CardDescription>{monthLabel}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Aún no registras gastos hormiga este mes.</p>
        </CardContent>
      </Card>
    )
  }

  const average = summary.count > 0 ? summary.total / summary.count : 0
  const topCategories = summary.categories.slice(0, 5)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumen de Gastos Hormiga</CardTitle>
        <CardDescription>{monthLabel}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">Total del mes</p>
            <p className="text-3xl font-semibold text-emerald-700">{currencyFormatter.format(summary.total)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Cantidad de gastos</p>
            <p className="text-3xl font-semibold">{summary.count}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Ticket promedio</p>
            <p className="text-3xl font-semibold">{currencyFormatter.format(average || 0)}</p>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="font-medium">Categorías más frecuentes</p>
            <Badge variant="secondary">Top {topCategories.length}</Badge>
          </div>
          {topCategories.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin categorías registradas todavía.</p>
          ) : (
            <div className="space-y-3">
              {topCategories.map((category) => (
                <div key={category.category}>
                  <div className="flex items-center justify-between text-sm">
                    <span>{category.category}</span>
                    <span className="font-medium">{currencyFormatter.format(category.total)}</span>
                  </div>
                  <Progress value={category.percentage * 100} className="h-2" />
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
