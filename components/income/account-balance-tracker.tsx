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
import { cn, parseDateInput } from "@/lib/utils"

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
  selectedPeriodLabel: string
  quincenaLabel: string
  pendingAmount: number
  defaultRecordDate?: string
  onCreate: (payload: { label: string; amount: number; recorded_on: string; account_id?: string | null; notes?: string }) => Promise<void>
  onDelete: (snapshotId: string) => Promise<void>
  isSubmitting: boolean
  isDeleting?: boolean
  canAdd: boolean
}

export function AccountBalanceTracker({
  snapshots,
  assets,
  selectedPeriodLabel,
  quincenaLabel,
  pendingAmount,
  defaultRecordDate,
  onCreate,
  onDelete,
  isSubmitting,
  isDeleting,
  canAdd,
}: AccountBalanceTrackerProps) {
  const totalRecorded = useMemo(() => snapshots.reduce((sum, item) => sum + item.amount, 0), [snapshots])
  const availableAfter = totalRecorded - pendingAmount
  const formattedPending = pendingAmount.toLocaleString("es-CO")
  const formattedRecorded = totalRecorded.toLocaleString("es-CO")
  const formattedAvailable = Math.abs(availableAfter).toLocaleString("es-CO")
  const effectiveRecordDate = defaultRecordDate ?? new Date().toISOString().slice(0, 10)
  const form = useForm<z.infer<typeof snapshotSchema>>({
    resolver: zodResolver(snapshotSchema),
    defaultValues: {
      label: "",
      amount: "",
      recorded_on: effectiveRecordDate,
      account_id: "",
      notes: "",
    },
  })

  useEffect(() => {
    form.setValue("recorded_on", effectiveRecordDate)
  }, [effectiveRecordDate, form])

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

  const getSnapshotMeta = (snapshot: AccountBalanceSnapshot) => {
    const parsed = parseDateInput(snapshot.recorded_on ?? snapshot.created_at)
    if (!parsed) {
      return { dateLabel: snapshot.recorded_on ?? "—", periodLabel: "Sin fecha" }
    }
    const dateLabel = `${monthNames[parsed.getMonth()]} ${parsed.getFullYear()}`
    const periodLabel = parsed.getDate() <= 15 ? "Primera quincena" : "Segunda quincena"
    return { dateLabel, periodLabel }
  }

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div>
          <CardTitle>Saldos por quincena</CardTitle>
          <CardDescription>
            {selectedPeriodLabel}. Visualiza cuánto queda libre en cada cuenta después de contemplar los pagos
            pendientes de la {quincenaLabel.toLowerCase()}.
          </CardDescription>
        </div>
        <div className="grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs uppercase tracking-wide text-amber-700">Faltante por pagar</p>
            <p className="text-lg font-semibold text-amber-900">{`$${formattedPending}`}</p>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-xs uppercase tracking-wide text-emerald-700">Existente en cuentas</p>
            <p className="text-lg font-semibold text-emerald-900">{`$${formattedRecorded}`}</p>
          </div>
          <div
            className={cn(
              "rounded-lg border p-3",
              availableAfter >= 0
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-rose-200 bg-rose-50 text-rose-900",
            )}
          >
            <p className="text-xs uppercase tracking-wide">Disponible después de faltantes</p>
            <p className="text-lg font-semibold">
              {availableAfter >= 0 ? "" : "-"}
              {`$${formattedAvailable}`}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {!canAdd && (
          <p className="rounded-lg border border-dashed border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Selecciona un año, mes y quincena específicos para registrar los saldos restantes.
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
                <TableHead>Periodo</TableHead>
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
              {snapshots.map((snapshot) => {
                const meta = getSnapshotMeta(snapshot)
                return (
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
                      <div>
                        <p className="font-medium leading-tight">{meta.dateLabel}</p>
                        <p className="text-xs text-muted-foreground">{meta.periodLabel}</p>
                      </div>
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
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
