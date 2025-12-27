"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { MonthlyProjection } from "@/lib/projections"
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

interface MonthlyProjectionChartProps {
  projections: MonthlyProjection[]
}

export function MonthlyProjectionChart({ projections }: MonthlyProjectionChartProps) {
  const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]

  const chartData = projections.map((proj) => ({
    name: `${monthNames[proj.month - 1]} ${proj.year}`,
    Ingresos: proj.total_income,
    Gastos: proj.total_expenses,
    Deudas: proj.total_debt_payments,
    Disponible: proj.available,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Proyección Financiera Mensual</CardTitle>
        <CardDescription>Ingresos, gastos y pagos de deudas proyectados</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip
              formatter={(value: number) => `$${value.toLocaleString("es-CO")}`}
              contentStyle={{ backgroundColor: "white", border: "1px solid #ccc" }}
            />
            <Legend />
            <Bar dataKey="Ingresos" fill="#10b981" />
            <Bar dataKey="Gastos" fill="#f59e0b" />
            <Bar dataKey="Deudas" fill="#ef4444" />
            <Bar dataKey="Disponible" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
