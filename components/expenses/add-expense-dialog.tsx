"use client"

import type React from "react"

import { useMemo, useState } from "react"
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
import type { Asset, Debt, Expense, PaymentPeriod } from "@/lib/types"
import { FINANCIAL_YEAR_END, FINANCIAL_YEAR_START, parseCurrencyInput } from "@/lib/utils"
import { Plus } from "lucide-react"

interface AddExpenseDialogProps {
  onAdd: (expense: Omit<Expense, "id" | "created_at" | "updated_at">) => Promise<void> | void
  debts: Debt[]
  assets: Asset[]
}

const NO_DEBT_VALUE = "none"
const NO_ASSET_VALUE = "none"

export function AddExpenseDialog({ onAdd, debts, assets }: AddExpenseDialogProps) {
  const [open, setOpen] = useState(false)
  const currentYear = useMemo(() => new Date().getFullYear().toString(), [])

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
    asset_id: z.string(),
  })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: "",
      amount: "",
      payment_date: "",
      payment_period: "primera_quincena",
      semester: "1",
      year: currentYear,
      notes: "",
      debt_id: NO_DEBT_VALUE,
      asset_id: NO_ASSET_VALUE,
    },
  })

  const handleSubmit = form.handleSubmit(async (values) => {
    await onAdd({
      user_id: "current-user",
      description: values.description.trim(),
      amount: parseCurrencyInput(values.amount),
      amount_paid: 0,
      payment_date: values.payment_date,
      payment_period: values.payment_period as PaymentPeriod,
      semester: Number.parseInt(values.semester, 10),
      year: Number.parseInt(values.year, 10),
      notes: values.notes?.trim() ? values.notes.trim() : undefined,
      is_paid: false,
      debt_id: values.debt_id === NO_DEBT_VALUE ? undefined : values.debt_id,
      asset_id: values.asset_id === NO_ASSET_VALUE ? undefined : values.asset_id,
    })

    form.reset({
      description: "",
      amount: "",
      payment_date: "",
      payment_period: "primera_quincena",
      semester: "1",
      year: currentYear,
      notes: "",
      debt_id: NO_DEBT_VALUE,
      asset_id: NO_ASSET_VALUE,
    })
    setOpen(false)
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="mr-2 h-4 w-4" />
          Agregar Gasto
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <Form {...form}>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Agregar Nuevo Gasto</DialogTitle>
              <DialogDescription>
                Registra un nuevo gasto en tu sistema de seguimiento financiero
              </DialogDescription>
            </DialogHeader>

          <div className="grid gap-4 py-4">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="grid gap-2">
                  <FormLabel>Descripción *</FormLabel>
                  <FormControl>
                    <Input
                      id="description"
                      placeholder="Ej: Arriendo, Credito, Parqueadero, Netflix"
                      {...field}
                    />
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
                    <Input id="amount" type="text" inputMode="decimal" placeholder="0.00" {...field} />
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
                        <SelectTrigger id="payment_period">
                          <SelectValue placeholder="Selecciona" />
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
                      <Input id="payment_date" type="date" {...field} />
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
                        <SelectTrigger id="semester">
                          <SelectValue placeholder="Selecciona" />
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
                      <Input id="year" type="text" inputMode="numeric" placeholder="2026" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="debt_id"
              render={({ field }) => (
                <FormItem className="grid gap-2">
                  <FormLabel>Asociar a deuda</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger id="linked-debt">
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

            <FormField
              control={form.control}
              name="asset_id"
              render={({ field }) => (
                <FormItem className="grid gap-2">
                  <FormLabel>Acreditar en activo</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={assets.length === 0}>
                    <FormControl>
                      <SelectTrigger id="linked-asset">
                        <SelectValue placeholder="Sin activo" />
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
                  <FormMessage />
                    {assets.length === 0 && (
                      <p className="text-xs text-muted-foreground">Crea un activo para vincular los pagos.</p>
                    )}
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
                Guardar Gasto
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
