"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import type { DebtProjection } from "@/lib/projections"

interface DebtProjectionTableProps {
  projections: DebtProjection[]
}

export function DebtProjectionTable({ projections }: DebtProjectionTableProps) {
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

  // Group by month/year
  const groupedProjections = projections.reduce(
    (acc, proj) => {
      const key = `${proj.year}-${proj.month}`
      if (!acc[key]) {
        acc[key] = {
          month: proj.month,
          year: proj.year,
          projections: [],
          total: 0,
        }
      }
      acc[key].projections.push(proj)
      acc[key].total += proj.projected_payment
      return acc
    },
    {} as Record<string, { month: number; year: number; projections: DebtProjection[]; total: number }>,
  )

  const sortedGroups = Object.values(groupedProjections).sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year
    return a.month - b.month
  })

  if (projections.length === 0) {
    return (
      <div className="text-center py-8 border rounded-lg">
        <p className="text-muted-foreground">No hay proyecciones de pago disponibles</p>
        <p className="text-sm text-muted-foreground mt-1">Agrega deudas con pagos mensuales para ver proyecciones</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {sortedGroups.map((group) => (
        <div key={`${group.year}-${group.month}`} className="space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-lg font-semibold">
              {monthNames[group.month - 1]} {group.year}
            </h3>
            <Badge variant="secondary" className="text-base">
              Total: ${group.total.toLocaleString("es-CO")}
            </Badge>
          </div>

          <div className="rounded-lg border overflow-x-auto">
            <Table className="min-w-[760px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Deuda</TableHead>
                  <TableHead className="text-right">Pago Proyectado</TableHead>
                  <TableHead className="text-right">Interés</TableHead>
                  <TableHead className="text-right">Capital</TableHead>
                  <TableHead className="text-right">Saldo Después</TableHead>
                  <TableHead className="text-right">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.projections.map((proj, idx) => (
                  <TableRow key={`${proj.debt_id}-${idx}`}>
                    <TableCell className="font-medium">{proj.entity_name}</TableCell>
                    <TableCell className="text-right font-semibold">
                      ${proj.projected_payment.toLocaleString("es-CO")}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      ${proj.interest_component.toLocaleString("es-CO")}
                    </TableCell>
                    <TableCell className="text-right">
                      ${proj.principal_component.toLocaleString("es-CO")}
                    </TableCell>
                    <TableCell className="text-right">${proj.projected_balance.toLocaleString("es-CO")}</TableCell>
                    <TableCell className="text-right">
                      {proj.is_final_payment ? (
                        <Badge className="bg-emerald-600">Pago Final</Badge>
                      ) : (
                        <Badge variant="outline">En Progreso</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ))}
    </div>
  )
}
