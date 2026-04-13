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
import { Textarea } from "@/components/ui/textarea"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { parseCurrencyInput } from "@/lib/utils"
import { calculations } from "@/lib/calculations"
import type { Debt } from "@/lib/types"
import { DollarSign, Loader2 } from "lucide-react"

interface AddPaymentDialogProps {
  debt: Debt
  onSubmit: (payment: { debtId: string; amount: number; payment_date: string; notes?: string }) => Promise<void>
}

export function AddPaymentDialog({ debt, onSubmit }: AddPaymentDialogProps) {
  const [open, setOpen] = useState(false)
  const today = useMemo(() => new Date().toISOString().split("T")[0], [])
  const currentBalance = debt.current_balance
  const frequencyLabel = debt.payment_frequency === "biweekly" ? "Quincenal" : "Mensual"
  const payoffInterestEstimate = useMemo(() => {
    const breakdown = calculations.calculateDebtPaymentBreakdown(debt, currentBalance)
    return breakdown?.interest_component ?? 0
  }, [debt, currentBalance])
  const payoffAmount = useMemo(() => Math.max(currentBalance + payoffInterestEstimate, currentBalance), [currentBalance, payoffInterestEstimate])

  const formSchema = z.object({
    amount: z
      .string({ required_error: "Ingresa el monto" })
      .trim()
      .min(1, "Ingresa el monto")
      .refine((value) => !Number.isNaN(parseCurrencyInput(value)), "Monto inválido")
      .refine((value) => parseCurrencyInput(value) > 0, "El monto debe ser mayor a 0")
      .refine(
        (value) => parseCurrencyInput(value) <= payoffAmount + 1e-6,
        `El monto no puede superar $${payoffAmount.toLocaleString("es-CO")}`,
      ),
    payment_date: z
      .string({ required_error: "Selecciona la fecha" })
      .trim()
      .refine((value) => !Number.isNaN(Date.parse(value)), "Fecha inválida"),
    notes: z
      .string()
      .max(400, "Máximo 400 caracteres")
      .optional()
      .or(z.literal("")),
  })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: "",
      payment_date: today,
      notes: "",
    },
  })

  const watchedAmount = form.watch("amount")
  const paymentPreview = useMemo(() => {
    const parsed = watchedAmount ? parseCurrencyInput(watchedAmount) : undefined
    if (!parsed || Number.isNaN(parsed) || parsed <= 0) {
      return calculations.calculateDebtPaymentBreakdown(debt) ?? null
    }
    return calculations.calculateDebtPaymentBreakdown(debt, parsed) ?? null
  }, [watchedAmount, debt])

  useEffect(() => {
    if (!open) {
      form.reset({ amount: "", payment_date: today, notes: "" })
    }
  }, [open, today, form])

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await onSubmit({
        debtId: debt.id,
        amount: parseCurrencyInput(values.amount),
        payment_date: values.payment_date,
        notes: values.notes?.trim() ? values.notes.trim() : undefined,
      })

      form.reset({ amount: "", payment_date: today, notes: "" })
      setOpen(false)
    } catch (error) {
      alert(error instanceof Error ? error.message : "Ocurrió un error al registrar el pago.")
    }
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2 bg-transparent">
          <DollarSign className="h-4 w-4" />
          Registrar Pago
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        <Form {...form}>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Registrar Pago de Deuda</DialogTitle>
              <DialogDescription>
                Saldo actual: <span className="font-semibold">${currentBalance.toLocaleString("es-CO")}</span>
                <br /> Frecuencia: {frequencyLabel}
              </DialogDescription>
            </DialogHeader>

          <div className="grid gap-4 py-4">
            <FormField
              control={form.control}
              name="amount"
                render={({ field }) => {
                  const previewAmount = parseCurrencyInput(field.value)
                  const previewBalance = paymentPreview?.next_balance
                  const paymentOnlyInterest =
                    paymentPreview && paymentPreview.principal_component <= 0 && previewAmount > 0

                  return (
                    <FormItem className="grid gap-2">
                      <FormLabel>Monto del Pago *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="amount"
                            type="text"
                            inputMode="decimal"
                            placeholder="0.00"
                            className="pl-9"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      {field.value && Number.isFinite(previewAmount) && (
                        <div className="space-y-1">
                          {typeof previewBalance === "number" && (
                            <p className="text-xs text-muted-foreground">
                              Nuevo saldo: ${previewBalance.toLocaleString("es-CO")}
                            </p>
                          )}
                          {paymentOnlyInterest && (
                            <p className="text-xs text-amber-700">
                              El pago solo cubre intereses, por lo que el saldo no disminuye.
                            </p>
                          )}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2 text-xs">
                        {debt.monthly_payment && debt.monthly_payment > 0 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              form.setValue("amount", debt.monthly_payment?.toFixed(2) ?? "", {
                                shouldValidate: true,
                                shouldDirty: true,
                              })
                            }
                          >
                            Cuota sugerida
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            form.setValue("amount", payoffAmount.toFixed(2), {
                              shouldValidate: true,
                              shouldDirty: true,
                            })
                          }
                        >
                          Saldo total
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            form.setValue("amount", "", {
                              shouldValidate: true,
                              shouldDirty: true,
                            })
                          }
                        >
                          Otro valor
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )
                }}
              />

            {paymentPreview && (
              <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
                <p className="text-sm font-medium text-foreground">Desglose estimado del pago</p>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <span>Interés</span>
                    <span className="font-semibold text-red-600">
                      ${paymentPreview.interest_component.toLocaleString("es-CO")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Capital</span>
                    <span className="font-semibold text-emerald-600">
                      ${paymentPreview.principal_component.toLocaleString("es-CO")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Nuevo saldo</span>
                    <span className="font-semibold">
                      ${paymentPreview.next_balance.toLocaleString("es-CO")}
                    </span>
                  </div>
                </div>
                {!debt.interest_rate && (
                  <p className="mt-2 text-[11px]">Completa la tasa de interés para tener cálculos más precisos.</p>
                )}
              </div>
            )}

            <FormField
              control={form.control}
              name="payment_date"
              render={({ field }) => (
                <FormItem className="grid gap-2">
                  <FormLabel>Fecha de Pago *</FormLabel>
                  <FormControl>
                    <Input id="payment_date" type="date" {...field} />
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
                    <Textarea id="notes" placeholder="Notas adicionales (opcional)" rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Registrar Pago"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
