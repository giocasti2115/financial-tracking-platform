"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"

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
  const chartData = report.map((item, index) => ({
    name: item.category,
    value: item.total,
    color: CHART_COLORS[index % CHART_COLORS.length],
  }))
  const showChart = totalExpenses > 0 && chartData.length > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reporte de Gastos por Categoría</CardTitle>
        <CardDescription>Distribución de gastos y promedios</CardDescription>
      </CardHeader>
      <CardContent>
        {report.length > 0 ? (
          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <div className="space-y-4">
              {report.map((item) => {
                const percentage = totalExpenses === 0 ? 0 : (item.total / totalExpenses) * 100

                return (
                  <div key={item.category} className="space-y-2 rounded-xl border border-border/60 bg-card/80 p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-[var(--brand-navy-900)]">{item.category}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.count} {item.count === 1 ? "gasto" : "gastos"} • Promedio: $
                          {item.average.toLocaleString("es-CO")}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-[var(--brand-navy-700)]">
                          ${item.total.toLocaleString("es-CO")}
                        </p>
                        <p className="text-xs text-muted-foreground">{percentage.toFixed(1)}%</p>
                      </div>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                )
              })}
            </div>

            {showChart ? (
              <div className="h-[260px] rounded-2xl border bg-card shadow-[0_20px_45px_rgba(10,24,38,0.08)]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip formatter={(value: number) => `$${value.toLocaleString("es-CO")}`} />
                    <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90}>
                      {chartData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="px-4 pb-4 text-xs text-muted-foreground text-center">
                  Distribución porcentual del período seleccionado
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center rounded-2xl border border-dashed text-sm text-muted-foreground">
                No hay datos suficientes para visualizar el gráfico
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">No hay datos de gastos para mostrar</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

const CHART_COLORS = [
  "#d6a347",
  "#1c3b57",
  "#8f6426",
  "#f1c27d",
  "#5a83a5",
  "#29a88f",
  "#e67e22",
]
