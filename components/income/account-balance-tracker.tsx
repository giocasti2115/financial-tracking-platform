"use client"

import { useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Badge } from "@/components/ui/badge"
import { Trash2 } from "lucide-react"
import type { AccountBalanceSnapshot, Asset } from "@/lib/types"
import { cn } from "@/lib/utils"

const NO_ACCOUNT_VALUE = "__no-account__"

const snapshotSchema = z.object({
  label: z.string().trim().min(2, "Describe la cuenta o libre"),
  amount: z
    .string({ required_error: "Ingresa el monto" })
    .trim()
    .refine((value) => !Number.isNaN(Number.parseFloat(value)), "Monto inválido"),
  recorded_on: z
    .string({ required_error: "Selecciona la fecha" })
    .regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/u, "Fecha inválida"),
  account_id: z.string().uuid().optional().or(z.literal("")),
  notes: z.string().max(300, "Máximo 300 caracteres").optional().or(z.literal("")),
})

export interface AccountBalanceTrackerProps {
  snapshots: AccountBalanceSnapshot[]
  assets: Asset[]
  totalIncome: number
  selectedPeriodLabel: string
  onCreate: (payload: { label: string; amount: number; recorded_on: string; account_id?: string | null; notes?: string }) => Promise<void>
  onDelete: (snapshotId: string) => Promise<void>
  isSubmitting: boolean
  isDeleting?: boolean
  canAdd: boolean
}

export function AccountBalanceTracker({
  snapshots,
  assets,
  totalIncome,
  selectedPeriodLabel,
  onCreate,
  onDelete,
  isSubmitting,
  isDeleting,
  canAdd,
}: AccountBalanceTrackerProps) {
  const totalRecorded = useMemo(() => snapshots.reduce((sum, item) => sum + item.amount, 0), [snapshots])
  const difference = totalIncome - totalRecorded
  const form = useForm<z.infer<typeof snapshotSchema>>({
    resolver: zodResolver(snapshotSchema),
    defaultValues: {
      label: "",
      amount: "",
      recorded_on: selectedPeriodLabel === "Periodo actual" ? new Date().toISOString().slice(0, 10) : buildDateFromLabel(selectedPeriodLabel),
      account_id: "",
      notes: "",
    },
  })

  function buildDateFromLabel(label: string) {
    const parts = label.split(" ")
    if (parts.length >= 2) {
      const monthName = parts[0]
      const year = Number.parseInt(parts[1], 10)
      const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
      const monthIndex = months.findIndex((name) => name.toLowerCase() === monthName.toLowerCase())
      if (!Number.isNaN(year) && monthIndex >= 0) {
        return `${year}-${String(monthIndex + 1).padStart(2, "0")}-01`
      }
    }
    return new Date().toISOString().slice(0, 10)
  }

  useEffect(() => {
    const nextDate =
      selectedPeriodLabel === "Periodo actual"
        ? new Date().toISOString().slice(0, 10)
        : buildDateFromLabel(selectedPeriodLabel)
    form.setValue("recorded_on", nextDate)
  }, [selectedPeriodLabel, form])

  const handleSubmit = form.handleSubmit(async (values) => {
    const amount = Number.parseFloat(values.amount)
    await onCreate({
      label: values.label.trim(),
      amount,
      recorded_on: values.recorded_on,
      account_id: values.account_id ? values.account_id : null,
      notes: values.notes?.trim() ? values.notes.trim() : undefined,
    })
    form.reset({
      label: "",
      amount: "",
      recorded_on: values.recorded_on,
      account_id: "",
      notes: "",
    })
  })

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

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Saldos después de pagar</CardTitle>
          <CardDescription>Controla cuánto queda libre en cada cuenta para {selectedPeriodLabel.toLowerCase()}</CardDescription>
        </div>
        <div className="flex gap-3">
          <div className="text-left">
            <p className="text-xs uppercase text-muted-foreground">Existente</p>
            <p className="text-xl font-semibold text-emerald-600">${totalRecorded.toLocaleString("es-CO")}</p>
          </div>
          <div className="text-left">
            <p className="text-xs uppercase text-muted-foreground">Faltante vs ingresos</p>
            <p className={cn("text-xl font-semibold", difference <= 0 ? "text-emerald-600" : "text-amber-600")}>${Math.abs(difference).toLocaleString("es-CO")}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {!canAdd && (
          <p className="rounded-lg border border-dashed border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Selecciona un año y mes específicos para registrar los saldos restantes.
          </p>
        )}
        {canAdd && (
          <Form {...form}>
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-5">
              <FormField
                control={form.control}
                name="label"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Etiqueta</FormLabel>
                    <FormControl>
                      <Input placeholder="Libre Enero, Nequi, Bancolombia" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="recorded_on"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="account_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cuenta (opcional)</FormLabel>
                    <Select
                      value={field.value && field.value.length > 0 ? field.value : NO_ACCOUNT_VALUE}
                      onValueChange={(value) => field.onChange(value === NO_ACCOUNT_VALUE ? "" : value)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Solo libre" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NO_ACCOUNT_VALUE}>Sin cuenta</SelectItem>
                        {assets.map((asset) => (
                          <SelectItem key={asset.id} value={asset.id}>
                            {asset.account_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="md:col-span-5">
                    <FormLabel>Notas</FormLabel>
                    <FormControl>
                      <Textarea rows={2} placeholder="Detalle adicional (opcional)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="md:col-span-5 flex justify-end">
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={isSubmitting}>
                  {isSubmitting ? "Guardando..." : "Registrar saldo"}
                </Button>
              </div>
            </form>
          </Form>
        )}

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Etiqueta</TableHead>
                <TableHead>Cuenta</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead>Notas</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {snapshots.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">
                    Aún no registras saldos para este periodo.
                  </TableCell>
                </TableRow>
              )}
              {snapshots.map((snapshot) => (
                <TableRow key={snapshot.id}>
                  <TableCell className="font-medium">{snapshot.label}</TableCell>
                  <TableCell>
                    {snapshot.account_name ? (
                      <Badge variant="outline">{snapshot.account_name}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">Libre</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {snapshot.recorded_on
                      ? `${monthNames[Number(snapshot.month) - 1]} ${snapshot.year}`
                      : new Date(snapshot.created_at).toLocaleDateString("es-CO")}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    ${snapshot.amount.toLocaleString("es-CO")}
                  </TableCell>
                  <TableCell className="max-w-[220px] text-sm text-muted-foreground">
                    {snapshot.notes || "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => onDelete(snapshot.id)}
                      disabled={Boolean(isDeleting)}
                      aria-label="Eliminar registro"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
