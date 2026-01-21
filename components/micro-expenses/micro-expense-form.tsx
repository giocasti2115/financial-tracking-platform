"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { parseCurrencyInput } from "@/lib/utils"
import type { NewMicroExpensePayload } from "@/lib/api-client"
import { Loader2, Plus } from "lucide-react"

const formSchema = z.object({
  description: z.string().trim().min(2, "Describe el gasto"),
  amount: z.string().trim().min(1, "Ingresa el monto"),
  category: z.string().trim().max(60).optional(),
  occurred_on: z.string().optional(),
  notes: z.string().trim().max(400, "Máximo 400 caracteres").optional(),
})

type FormValues = z.infer<typeof formSchema>

interface MicroExpenseFormProps {
  onSubmit: (payload: NewMicroExpensePayload) => Promise<void>
  isSubmitting: boolean
  defaultDate: string
  disabled?: boolean
}

export function MicroExpenseForm({ onSubmit, isSubmitting, defaultDate, disabled }: MicroExpenseFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: "",
      amount: "",
      category: "",
      occurred_on: defaultDate,
      notes: "",
    },
  })

  useEffect(() => {
    form.setValue("occurred_on", defaultDate)
  }, [defaultDate, form])

  const handleSubmit = form.handleSubmit(async (values) => {
    const parsedAmount = parseCurrencyInput(values.amount)
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      form.setError("amount", { message: "Ingresa un monto válido" })
      return
    }

    await onSubmit({
      description: values.description.trim(),
      amount: Number(parsedAmount.toFixed(2)),
      category: values.category?.trim() || undefined,
      occurred_on: values.occurred_on,
      notes: values.notes?.trim() || undefined,
    })

    form.reset({
      description: "",
      amount: "",
      category: values.category ?? "",
      occurred_on: defaultDate,
      notes: "",
    })
  })

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-4" aria-disabled={disabled}>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descripción *</FormLabel>
                <FormControl>
                  <Input placeholder="Café, snacks, transporte" {...field} disabled={disabled || isSubmitting} />
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
                <FormLabel>Monto *</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    {...field}
                    disabled={disabled || isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoría</FormLabel>
                <FormControl>
                  <Input placeholder="Panadería, Transporte, Snacks" {...field} disabled={disabled || isSubmitting} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="occurred_on"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha</FormLabel>
                <FormControl>
                  <Input type="date" {...field} disabled={disabled || isSubmitting} />
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
            <FormItem>
              <FormLabel>Notas</FormLabel>
              <FormControl>
                <Textarea rows={3} placeholder="Detalles adicionales" {...field} disabled={disabled || isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full md:w-auto" disabled={disabled || isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" /> Registrar gasto
            </>
          )}
        </Button>
      </form>
    </Form>
  )
}
