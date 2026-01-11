"use client"

import type React from "react"
import { useEffect, useMemo } from "react"
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
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import type { Asset, Debt, Expense } from "@/lib/types"
import { parseCurrencyInput } from "@/lib/utils"
import { DollarSign } from "lucide-react"

interface RegisterPaymentDialogProps {
  expense: Expense | null
  debt?: Debt | null
  assets: Asset[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onRegisterPayment: (expenseId: string, paymentAmount: number, notes?: string, assetId?: string) => Promise<void> | void
}

const NO_ASSET_VALUE = "none"

export function RegisterPaymentDialog({ expense, debt, assets, open, onOpenChange, onRegisterPayment }: RegisterPaymentDialogProps) {
  const paidAmount = expense?.amount_paid ?? 0
  const remaining = expense ? expense.amount - paidAmount : 0
  const percentPaid = expense && expense.amount !== 0 ? (paidAmount / expense.amount) * 100 : 0

  const formSchema = useMemo(
    () =>
      z.object({
        amount: z
          .string({ required_error: "Ingresa el monto del pago" })
          .trim()
          .min(1, "Ingresa el monto del pago")
          .refine((value) => !Number.isNaN(parseCurrencyInput(value)), "Ingresa un monto válido")
          .refine((value) => parseCurrencyInput(value) > 0, "El monto debe ser mayor a 0")
          .refine(
            (value) => parseCurrencyInput(value) <= remaining + 1e-6,
            `El monto no puede ser mayor al saldo pendiente ($${remaining.toLocaleString("es-CO")})`,
          ),
        notes: z
          .union([z.string().max(400, "Máximo 400 caracteres"), z.literal("")])
          .optional(),
        asset_id: z
          .union([z.string().uuid(), z.literal(NO_ASSET_VALUE)])
          .optional(),
      }),
    [remaining],
  )

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { amount: "", notes: "", asset_id: NO_ASSET_VALUE },
  })

  useEffect(() => {
    if (!open) {
      form.reset({ amount: "", notes: "", asset_id: NO_ASSET_VALUE })
    }
  }, [open, form])

  useEffect(() => {
    if (open) {
      form.reset({ amount: "", notes: "", asset_id: NO_ASSET_VALUE })
    }
  }, [expense?.id, open, form])

  const handleSubmit = form.handleSubmit(async (values) => {
    if (!expense) return
    const amount = parseCurrencyInput(values.amount)
    const assetId = values.asset_id && values.asset_id !== NO_ASSET_VALUE ? values.asset_id : undefined
    const notes = values.notes?.trim() ? values.notes.trim() : undefined

    try {
      await onRegisterPayment(expense.id, amount, notes, assetId)
      form.reset({ amount: "", notes: "", asset_id: NO_ASSET_VALUE })
      onOpenChange(false)
    } catch (error) {
      alert(error instanceof Error ? error.message : "Ocurrió un error al registrar el pago.")
    }
  })

  if (!expense) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <Form {...form}>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Registrar Pago</DialogTitle>
              <DialogDescription>
                Registra un pago total o parcial para este gasto
                {debt ? `, sincroniza la deuda ${debt.entity_name}` : ""}
                {assets.length > 0 ? " y acredita un activo." : "."}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {/* Expense Info */}
              <div className="space-y-2 p-4 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Gasto:</span>
                  <span className="text-sm">{expense.description}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Monto Total:</span>
                  <span className="text-sm font-semibold">${expense.amount.toLocaleString("es-CO")}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Pagado:</span>
                  <span className="text-sm text-emerald-600">${paidAmount.toLocaleString("es-CO")}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm font-medium">Saldo Pendiente:</span>
                  <span className="text-base font-bold text-red-600">${remaining.toLocaleString("es-CO")}</span>
                </div>
                {debt && (
                  <div className="flex items-center justify-between text-xs text-emerald-700 pt-2 border-t">
                    <span>Deuda vinculada</span>
                    <span className="font-semibold">{debt.entity_name}</span>
                  </div>
                )}
                {paidAmount > 0 && (
                  <div className="pt-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>Progreso de pago</span>
                      <span>{percentPaid.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 transition-all"
                        style={{ width: `${Math.min(percentPaid, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Amount */}
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem className="grid gap-2">
                    <FormLabel>Monto del Pago *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="payment-amount"
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          className="pl-9"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          form.setValue("amount", (remaining / 2).toFixed(2), {
                            shouldValidate: true,
                            shouldDirty: true,
                          })
                        }
                        disabled={remaining <= 0}
                      >
                        50%
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          form.setValue("amount", remaining.toFixed(2), {
                            shouldValidate: true,
                            shouldDirty: true,
                          })
                        }
                        disabled={remaining <= 0}
                      >
                        Pago Total
                      </Button>
                    </div>
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
                      <Textarea
                        id="payment-notes"
                        placeholder="Notas sobre el pago (opcional)"
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="asset_id"
                render={({ field }) => (
                  <FormItem className="grid gap-2">
                    <FormLabel>Acreditar en activo</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange} disabled={assets.length === 0}>
                      <FormControl>
                        <SelectTrigger id="payment-asset">
                          <SelectValue placeholder="Selecciona un activo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NO_ASSET_VALUE}>Sin activo</SelectItem>
                        {assets.map((asset) => (
                          <SelectItem key={asset.id} value={asset.id}>
                            {asset.account_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {assets.length === 0 && (
                      <p className="text-xs text-muted-foreground">Crea un activo para reflejar el saldo disponible.</p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={form.formState.isSubmitting}
              >
                Registrar Pago
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
