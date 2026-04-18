"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import type { UpdateDebtPayload } from "@/lib/api-client"
import type { Debt } from "@/lib/types"
import { parseCurrencyInput } from "@/lib/utils"
import { Loader2, Pencil } from "lucide-react"

const formatNumberField = (value: number | null | undefined) =>
  value === null || value === undefined ? "" : value.toString()

const PAYMENT_FREQUENCIES = [
  { label: "Mensual", value: "monthly" },
  { label: "Quincenal", value: "biweekly" },
] as const

const DEBT_TYPES = ["Credito", "Prestamo", "Tarjeta", "Hipoteca", "Otro"] as const

const isDebtType = (value: string | null | undefined): value is (typeof DEBT_TYPES)[number] =>
  typeof value === 'string' && DEBT_TYPES.includes(value as (typeof DEBT_TYPES)[number])

const isPaymentFrequency = (
  value: string | null | undefined,
): value is (typeof PAYMENT_FREQUENCIES)[number]['value'] =>
  typeof value === 'string' && PAYMENT_FREQUENCIES.some((option) => option.value === value)

interface EditDebtDialogProps {
  debt: Debt
  onSubmit: (payload: UpdateDebtPayload) => Promise<void>
  isUpdating?: boolean
}

export function EditDebtDialog({ debt, onSubmit, isUpdating }: EditDebtDialogProps) {
  const currencyField = z
    .string({ required_error: "Campo requerido" })
    .trim()
    .min(1, "Campo requerido")
    .refine((value) => !Number.isNaN(parseCurrencyInput(value)), "Monto inválido")
    .refine((value) => parseCurrencyInput(value) > 0, "Debe ser mayor a 0")

  const optionalCurrencyField = z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((value) => {
      if (!value) return true
      return !Number.isNaN(parseCurrencyInput(value)) && parseCurrencyInput(value) > 0
    }, "Monto inválido")

  const optionalDayField = z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((value) => {
      if (!value) return true
      if (!/^\d+$/.test(value)) return false
      const numberValue = Number.parseInt(value, 10)
      return numberValue >= 1 && numberValue <= 31
    }, "Usa un día entre 1 y 31")

  const optionalPercentField = z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((value) => {
      if (!value) return true
      return !Number.isNaN(Number.parseFloat(value))
    }, "Valor inválido")
    .refine((value) => {
      if (!value) return true
      const asNumber = Number.parseFloat(value)
      return asNumber >= 0 && asNumber <= 100
    }, "Debe estar entre 0% y 100%")

  const optionalDateField = z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((value) => {
      if (!value) return true
      return !Number.isNaN(Date.parse(value))
    }, "Fecha inválida")

  const formSchema = z
    .object({
      debt_type: z.enum(["Credito", "Prestamo", "Tarjeta", "Hipoteca", "Otro"], {
        required_error: "Selecciona el tipo",
      }),
      entity_name: z.string().trim().min(3, "Ingresa la entidad"),
      original_amount: currencyField,
      current_balance: currencyField,
      monthly_payment: optionalCurrencyField,
      payment_frequency: z.enum(["monthly", "biweekly"]),
      payment_day: optionalDayField,
      start_date: optionalDateField,
      end_date: optionalDateField,
      interest_rate: optionalPercentField,
      notes: z
        .string()
        .max(500, "Máximo 500 caracteres")
        .optional()
        .or(z.literal("")),
    })
    .superRefine((values, ctx) => {
      const original = parseCurrencyInput(values.original_amount)
      const current = parseCurrencyInput(values.current_balance)
      if (Number.isFinite(original) && Number.isFinite(current) && current - original > 1e-3) {
        ctx.addIssue({
          path: ["current_balance"],
          code: z.ZodIssueCode.custom,
          message: "El saldo no puede superar el monto original",
        })
      }

      if (values.start_date && values.end_date) {
        const start = Date.parse(values.start_date)
        const end = Date.parse(values.end_date)
        if (!Number.isNaN(start) && !Number.isNaN(end) && end < start) {
          ctx.addIssue({
            path: ["end_date"],
            code: z.ZodIssueCode.custom,
            message: "La fecha final debe ser posterior a la inicial",
          })
        }
      }
    })

  const [open, setOpen] = useState(false)

  type DebtFormValues = z.infer<typeof formSchema>

  const buildInitialState = (currentDebt: Debt): DebtFormValues => ({
    debt_type: isDebtType(currentDebt.debt_type) ? currentDebt.debt_type : "Credito",
    entity_name: currentDebt.entity_name,
    original_amount: currentDebt.original_amount.toString(),
    current_balance: currentDebt.current_balance.toString(),
    monthly_payment: formatNumberField(currentDebt.monthly_payment),
    payment_frequency: isPaymentFrequency(currentDebt.payment_frequency) ? currentDebt.payment_frequency : "monthly",
    payment_day: formatNumberField(currentDebt.payment_day),
    start_date: currentDebt.start_date ? currentDebt.start_date.slice(0, 10) : "",
    end_date: currentDebt.end_date ? currentDebt.end_date.slice(0, 10) : "",
    interest_rate: formatNumberField(currentDebt.interest_rate),
    notes: currentDebt.notes ?? "",
  })

  const defaultValues = useMemo<DebtFormValues>(() => buildInitialState(debt), [debt])

  const form = useForm<DebtFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  })

  useEffect(() => {
    form.reset(buildInitialState(debt))
  }, [debt, form])

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit({
      debt_type: values.debt_type,
      entity_name: values.entity_name.trim(),
      original_amount: parseCurrencyInput(values.original_amount),
      current_balance: parseCurrencyInput(values.current_balance),
      monthly_payment: values.monthly_payment ? parseCurrencyInput(values.monthly_payment) : undefined,
      payment_frequency: values.payment_frequency,
      payment_day: values.payment_day ? Number.parseInt(values.payment_day, 10) : undefined,
      start_date: values.start_date || undefined,
      end_date: values.end_date || undefined,
      interest_rate: values.interest_rate ? Number.parseFloat(values.interest_rate) : undefined,
      notes: values.notes?.trim() ? values.notes.trim() : undefined,
    })
    setOpen(false)
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-emerald-700 hover:bg-emerald-50"
          aria-label="Editar deuda"
          disabled={isUpdating}
        >
          {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <Form {...form}>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Editar Deuda</DialogTitle>
              <DialogDescription>Actualiza los datos de esta obligación</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="debt_type"
                  render={({ field }) => (
                    <FormItem className="grid gap-2">
                      <FormLabel>Tipo de Deuda *</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger id="debt_type">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Credito">Crédito</SelectItem>
                          <SelectItem value="Prestamo">Préstamo</SelectItem>
                          <SelectItem value="Tarjeta">Tarjeta de Crédito</SelectItem>
                          <SelectItem value="Hipoteca">Hipoteca</SelectItem>
                          <SelectItem value="Otro">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="entity_name"
                  render={({ field }) => (
                    <FormItem className="grid gap-2">
                      <FormLabel>Entidad *</FormLabel>
                      <FormControl>
                        <Input id="entity_name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="original_amount"
                  render={({ field }) => (
                    <FormItem className="grid gap-2">
                      <FormLabel>Monto Original *</FormLabel>
                      <FormControl>
                        <Input id="original_amount" type="text" inputMode="decimal" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="current_balance"
                  render={({ field }) => (
                    <FormItem className="grid gap-2">
                      <FormLabel>Saldo Actual *</FormLabel>
                      <FormControl>
                        <Input id="current_balance" type="text" inputMode="decimal" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="monthly_payment"
                  render={({ field }) => (
                    <FormItem className="grid gap-2">
                      <FormLabel>Cuota Programada</FormLabel>
                      <FormControl>
                        <Input id="monthly_payment" type="text" inputMode="decimal" {...field} />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Valor total estimado de cada pago.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="payment_day"
                  render={({ field }) => (
                    <FormItem className="grid gap-2">
                      <FormLabel>Día de Pago</FormLabel>
                      <FormControl>
                        <Input id="payment_day" type="text" inputMode="numeric" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="payment_frequency"
                render={({ field }) => (
                  <FormItem className="grid gap-2">
                    <FormLabel>Frecuencia de Pago *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger id="payment_frequency">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PAYMENT_FREQUENCIES.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="start_date"
                  render={({ field }) => (
                    <FormItem className="grid gap-2">
                      <FormLabel>Fecha de Inicio</FormLabel>
                      <FormControl>
                        <Input id="start_date" type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="end_date"
                  render={({ field }) => (
                    <FormItem className="grid gap-2">
                      <FormLabel>Fecha de Finalización</FormLabel>
                      <FormControl>
                        <Input id="end_date" type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="interest_rate"
                render={({ field }) => (
                  <FormItem className="grid gap-2">
                    <FormLabel>Tasa de Interés (%)</FormLabel>
                    <FormControl>
                      <Input id="interest_rate" type="text" inputMode="decimal" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="grid gap-2">
                    <FormLabel>Notas</FormLabel>
                    <FormControl>
                      <Textarea id="notes" rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isUpdating} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button
                type="submit"
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700"
                disabled={form.formState.isSubmitting || isUpdating}
              >
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Guardar Cambios"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
