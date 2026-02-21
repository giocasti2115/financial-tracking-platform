"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { MonthlyProjection } from "@/lib/projections"
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

interface MonthlyProjectionChartProps {
  projections: MonthlyProjection[]
}

export function MonthlyProjectionChart({ projections }: MonthlyProjectionChartProps) {
  const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]

  const chartData = projections.map((proj) => ({
    name: `${monthNames[proj.month - 1]} ${proj.year}`,
    Ingresos: proj.total_income,
    Gastos: proj.total_expenses,
    Intereses: proj.total_debt_interest,
    Capital: proj.total_debt_principal,
    Disponible: proj.available,
  }))

  const distributionData = [
    {
      name: "Ingresos",
      value: projections.reduce((sum, item) => sum + item.total_income, 0),
      color: "#10b981",
    },
    {
      name: "Gastos",
      value: projections.reduce((sum, item) => sum + item.total_expenses, 0),
      color: "#f97316",
    },
    {
      name: "Intereses de deuda",
      value: projections.reduce((sum, item) => sum + item.total_debt_interest, 0),
      color: "#f43f5e",
    },
    {
      name: "Abono a capital",
      value: projections.reduce((sum, item) => sum + item.total_debt_principal, 0),
      color: "#7c3aed",
    },
  ]

  const totalProjected = distributionData.reduce((sum, item) => sum + item.value, 0)
  const averageAvailable = projections.length
    ? Math.round(projections.reduce((sum, item) => sum + item.available, 0) / projections.length)
    : 0

  if (projections.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Proyección Financiera Mensual</CardTitle>
          <CardDescription>Ingresos, gastos y pagos de deudas proyectados</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-10 text-sm text-muted-foreground">
          No hay datos suficientes para construir la proyección.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Proyección Financiera Mensual</CardTitle>
        <CardDescription>Ingresos, gastos y pagos de deudas proyectados</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} barCategoryGap={"20%"} barGap={8}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(value) => `$${value.toLocaleString("es-CO")}`} />
              <Tooltip
                formatter={(value: number) => `$${value.toLocaleString("es-CO")}`}
                labelFormatter={(label) => label}
                contentStyle={{ backgroundColor: "white", border: "1px solid #e5e7eb" }}
              />
              <Legend />
              <Bar dataKey="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={26} />
              <Bar dataKey="Gastos" fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={26} />
              <Bar dataKey="Intereses" name="Intereses deuda" stackId="debt" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={26} />
              <Bar dataKey="Capital" name="Capital deuda" stackId="debt" fill="#7c3aed" radius={[4, 4, 0, 0]} maxBarSize={26} />
              <Line type="monotone" dataKey="Disponible" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip formatter={(value: number) => `$${value.toLocaleString("es-CO")}`} />
                <Pie
                  data={distributionData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {distributionData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Disponible promedio proyectado</p>
              <p className={`text-3xl font-bold ${averageAvailable >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                ${averageAvailable.toLocaleString("es-CO")}
              </p>
            </div>
            {distributionData.map((item) => {
              const percentage = totalProjected === 0 ? 0 : (item.value / totalProjected) * 100
              return (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm font-medium">{item.name}</span>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-semibold">${item.value.toLocaleString("es-CO")}</p>
                    <p className="text-muted-foreground">{percentage.toFixed(1)}%</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
