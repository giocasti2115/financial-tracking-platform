"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

interface ExpenseReportProps {
  report: Array<{
    category: string
    total: number
    count: number
    average: number
  }>
}

export function ExpenseReport({ report }: ExpenseReportProps) {
  const totalExpenses = report.reduce((sum, item) => sum + item.total, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reporte de Gastos por Categoría</CardTitle>
        <CardDescription>Distribución de gastos y promedios</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {report.length > 0 ? (
          report.map((item) => {
            const percentage = (item.total / totalExpenses) * 100

            return (
              <div key={item.category} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{item.category}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.count} {item.count === 1 ? "gasto" : "gastos"} • Promedio: $
                      {item.average.toLocaleString("es-CO")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">${item.total.toLocaleString("es-CO")}</p>
                    <p className="text-xs text-muted-foreground">{percentage.toFixed(1)}%</p>
                  </div>
                </div>
                <Progress value={percentage} className="h-2" />
              </div>
            )
          })
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">No hay datos de gastos para mostrar</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
