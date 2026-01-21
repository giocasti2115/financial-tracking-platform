"use client"

import type React from "react"
import { useEffect } from "react"
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
import type { Debt, Expense, PaymentPeriod } from "@/lib/types"
import { FINANCIAL_YEAR_END, FINANCIAL_YEAR_START, parseCurrencyInput } from "@/lib/utils"

interface EditExpenseDialogProps {
  expense: Expense | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (expense: Expense) => void
  debts: Debt[]
}

const NO_DEBT_VALUE = "none"

export function EditExpenseDialog({ expense, open, onOpenChange, onSave, debts }: EditExpenseDialogProps) {
  const formSchema = z.object({
    description: z.string().trim().min(3, "Describe el gasto"),
    amount: z
      .string({ required_error: "Ingresa el monto" })
      .trim()
      .min(1, "Ingresa el monto")
      .refine((value) => !Number.isNaN(parseCurrencyInput(value)), "Monto inválido")
      .refine((value) => parseCurrencyInput(value) > 0, "El monto debe ser mayor a 0"),
    payment_date: z
      .string({ required_error: "Selecciona la fecha" })
      .trim()
      .refine((value) => !Number.isNaN(Date.parse(value)), "Fecha inválida"),
    payment_period: z.enum(["primera_quincena", "segunda_quincena"], {
      required_error: "Selecciona la quincena",
    }),
    semester: z.enum(["1", "2"], { required_error: "Selecciona el semestre" }),
    year: z
      .string({ required_error: "Ingresa el año" })
      .trim()
      .regex(/^\d{4}$/, "Usa un año de cuatro dígitos")
      .refine(
        (value) => {
          const asNumber = Number.parseInt(value, 10)
          return asNumber >= FINANCIAL_YEAR_START && asNumber <= FINANCIAL_YEAR_END
        },
        `El año debe estar entre ${FINANCIAL_YEAR_START} y ${FINANCIAL_YEAR_END}`,
      ),
    notes: z
      .string()
      .max(400, "Máximo 400 caracteres")
      .optional()
      .or(z.literal("")),
    debt_id: z.string(),
  })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: "",
      amount: "",
      payment_date: "",
      payment_period: "primera_quincena",
      semester: "1",
      year: new Date().getFullYear().toString(),
      notes: "",
      debt_id: NO_DEBT_VALUE,
    },
  })

  const normalizeDateInput = (value: string) => (value ? value.split("T")[0] : "")

  useEffect(() => {
    if (expense) {
      const semesterValue: "1" | "2" = expense.semester === 2 ? "2" : "1"
      form.reset({
        description: expense.description,
        amount: expense.amount.toString(),
        payment_date: normalizeDateInput(expense.payment_date),
        payment_period: expense.payment_period,
        semester: semesterValue,
        year: expense.year.toString(),
        notes: expense.notes || "",
        debt_id: expense.debt_id ?? NO_DEBT_VALUE,
      })
    }
  }, [expense, form])

  const handleSubmit = form.handleSubmit((values) => {
    if (!expense) return

    const updatedExpense: Expense = {
      ...expense,
      description: values.description.trim(),
      amount: parseCurrencyInput(values.amount),
      payment_date: values.payment_date,
      payment_period: values.payment_period as PaymentPeriod,
      semester: Number.parseInt(values.semester, 10),
      year: Number.parseInt(values.year, 10),
      notes: values.notes?.trim() ? values.notes.trim() : undefined,
      debt_id: values.debt_id === NO_DEBT_VALUE ? null : values.debt_id,
      updated_at: new Date().toISOString(),
    }

    onSave(updatedExpense)
    onOpenChange(false)
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <Form {...form}>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Editar Gasto</DialogTitle>
              <DialogDescription>Modifica la información del gasto</DialogDescription>
            </DialogHeader>

          <div className="grid gap-4 py-4">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="grid gap-2">
                  <FormLabel>Descripción *</FormLabel>
                  <FormControl>
                    <Input id="edit-description" placeholder="Ej: Diezmo Gio, Parqueadero, Netflix" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem className="grid gap-2">
                  <FormLabel>Monto *</FormLabel>
                  <FormControl>
                    <Input id="edit-amount" type="text" inputMode="decimal" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="payment_period"
                render={({ field }) => (
                  <FormItem className="grid gap-2">
                    <FormLabel>Quincena *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger id="edit-payment_period">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="primera_quincena">Primera (15)</SelectItem>
                        <SelectItem value="segunda_quincena">Segunda (30)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="payment_date"
                render={({ field }) => (
                  <FormItem className="grid gap-2">
                    <FormLabel>Fecha de Pago *</FormLabel>
                    <FormControl>
                      <Input id="edit-payment_date" type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="semester"
                render={({ field }) => (
                  <FormItem className="grid gap-2">
                    <FormLabel>Semestre *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger id="edit-semester">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">Primer Semestre</SelectItem>
                        <SelectItem value="2">Segundo Semestre</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem className="grid gap-2">
                    <FormLabel>Año *</FormLabel>
                    <FormControl>
                      <Input id="edit-year" type="text" inputMode="numeric" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="grid gap-2">
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea id="edit-notes" placeholder="Notas adicionales (opcional)" rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="debt_id"
              render={({ field }) => (
                <FormItem className="grid gap-2">
                  <FormLabel>Asociar a deuda</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger id="edit-debt">
                        <SelectValue placeholder="Sin enlace" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NO_DEBT_VALUE}>Sin deuda</SelectItem>
                      {debts.map((debt) => (
                        <SelectItem key={debt.id} value={debt.id}>
                          {debt.entity_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                Guardar Cambios
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
