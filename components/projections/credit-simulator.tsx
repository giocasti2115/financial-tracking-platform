"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { projections, type CreditSimulationResult } from "@/lib/projections"
import { parseCurrencyInput } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

const simulatorSchema = z.object({
  amount: z
    .string({ required_error: "Ingresa el monto" })
    .trim()
    .min(1, "Ingresa el monto")
    .refine((value) => parseCurrencyInput(value) > 0, "El monto debe ser mayor a 0"),
  rateValue: z
    .string({ required_error: "Ingresa la tasa" })
    .trim()
    .refine((value) => !Number.isNaN(Number(value)), "Ingresa un número válido")
    .refine((value) => Number(value) >= 0, "La tasa no puede ser negativa"),
  rateType: z.enum(["annual", "monthly"], { required_error: "Selecciona el tipo de tasa" }),
  termMonths: z
    .string({ required_error: "Ingresa el plazo" })
    .trim()
    .refine((value) => {
      const parsed = Number.parseInt(value, 10)
      return !Number.isNaN(parsed) && parsed >= 1 && parsed <= 360
    }, "Ingresa entre 1 y 360 meses"),
  frequency: z.enum(["monthly", "biweekly"], { required_error: "Selecciona una frecuencia" }),
  extraPayment: z
    .string()
    .optional()
    .refine((value) => value === undefined || value === "" || parseCurrencyInput(value) >= 0, "Monto inválido"),
})

const registerDebtSchema = z.object({
  entityName: z.string().trim().min(2, "Ingresa el nombre de la entidad"),
  debtType: z.string().trim().min(2, "Ingresa el tipo de deuda"),
  notes: z
    .union([z.string().max(400, "Máximo 400 caracteres"), z.literal("")])
    .optional()
    .transform((value) => (value?.trim() ? value.trim() : undefined)),
})

type SimulatorFormValues = z.infer<typeof simulatorSchema>
type RegisterDebtFormValues = z.infer<typeof registerDebtSchema>

const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
})

export function CreditSimulator() {
  const [result, setResult] = useState<CreditSimulationResult | null>(null)
  const [submittedValues, setSubmittedValues] = useState<SimulatorFormValues | null>(null)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const form = useForm<SimulatorFormValues>({
    resolver: zodResolver(simulatorSchema),
    defaultValues: {
      amount: "",
      rateValue: "",
      rateType: "annual",
      termMonths: "",
      frequency: "monthly",
      extraPayment: "",
    },
  })

  const registerDebtForm = useForm<RegisterDebtFormValues>({
    resolver: zodResolver(registerDebtSchema),
    defaultValues: {
      entityName: "",
      debtType: "",
      notes: "",
    },
  })

  const createDebtMutation = useMutation({
    mutationFn: apiClient.createDebt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debts"] })
      toast({
        title: "Deuda registrada",
        description: "Puedes verla en el módulo de Deudas.",
      })
      registerDebtForm.reset({ entityName: "", debtType: "", notes: "" })
    },
    onError: (error: Error) =>
      toast({
        variant: "destructive",
        title: "No pudimos crear la deuda",
        description: error.message,
      }),
  })

  useEffect(() => {
    if (!submittedValues) return
    if (!registerDebtForm.getValues("entityName")) {
      registerDebtForm.setValue("entityName", "Nuevo crédito")
    }
    if (!registerDebtForm.getValues("debtType")) {
      registerDebtForm.setValue("debtType", "crédito personal")
    }
  }, [submittedValues, registerDebtForm])

  const payoffDate = useMemo(() => {
    if (!result) return null
    return new Date(result.payoffDate).toLocaleDateString("es-CO", { year: "numeric", month: "long" })
  }, [result])

  const computeAnnualRate = (rateValue: string, rateType: "annual" | "monthly") => {
    const numeric = Number(rateValue)
    if (rateType === "monthly") {
      const monthlyFraction = numeric / 100
      const effectiveAnnual = Math.pow(1 + monthlyFraction, 12) - 1
      return Number((effectiveAnnual * 100).toFixed(6))
    }
    return numeric
  }

  const parseTermMonths = (value: string) => {
    const parsed = Number.parseInt(value, 10)
    if (Number.isNaN(parsed)) return 1
    return Math.min(360, Math.max(1, parsed))
  }

  const handleSubmit = form.handleSubmit((values) => {
    const amount = parseCurrencyInput(values.amount)
    const annualRate = computeAnnualRate(values.rateValue, values.rateType)
    const termMonths = parseTermMonths(values.termMonths)
    const extraPayment = values.extraPayment ? parseCurrencyInput(values.extraPayment) : 0
    const simulation = projections.simulateCreditScenario({
      amount,
      annualRate,
      termMonths,
      frequency: values.frequency,
      extraPayment,
    })
    setResult(simulation)
    setSubmittedValues(values)
  })

  const simulatedAmount = useMemo(() => {
    if (!submittedValues) return null
    return parseCurrencyInput(submittedValues.amount)
  }, [submittedValues])

  const handleExportCsv = useCallback(() => {
    if (!result || !result.schedule.length) {
      toast({
        variant: "destructive",
        title: "Nada para exportar",
        description: "Primero ejecuta una simulación.",
      })
      return
    }

    const header = ["Periodo", "Fecha", "Pago", "Interés", "Capital", "Saldo"]
    const rows = result.schedule.map((entry) => [
      entry.period.toString(),
      new Date(entry.date).toLocaleDateString("es-CO"),
      entry.payment.toFixed(2),
      entry.interest.toFixed(2),
      entry.principal.toFixed(2),
      entry.balance.toFixed(2),
    ])
    const csvContent = [header, ...rows]
      .map((columns) => columns.map((col) => `"${col.replace(/"/g, '""')}"`).join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.setAttribute("download", `simulador-credito-${Date.now()}.csv`)
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
    toast({ title: "Archivo generado", description: "Descargamos la tabla en formato CSV." })
  }, [result, toast])

  const handleRegisterDebt = registerDebtForm.handleSubmit(async (values) => {
    if (!result || !submittedValues || !simulatedAmount) {
      toast({ variant: "destructive", title: "Simula antes de registrar", description: "Ejecuta una simulación para usar estos datos." })
      return
    }

    const annualRate = computeAnnualRate(submittedValues.rateValue, submittedValues.rateType)

    const payload = {
      debt_type: values.debtType.trim(),
      entity_name: values.entityName.trim(),
      original_amount: simulatedAmount,
      current_balance: simulatedAmount,
      monthly_payment:
        result.frequency === "monthly"
          ? result.periodicPayment
          : Number((result.periodicPayment * 2).toFixed(2)),
      payment_frequency: result.frequency,
      interest_rate: annualRate,
      start_date: new Date().toISOString().slice(0, 10),
      notes: values.notes,
    }

    await createDebtMutation.mutateAsync(payload)
  })

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Simulador de nuevas obligaciones</CardTitle>
          <CardDescription>
            Ajusta el monto, la tasa y el plazo para entender el impacto de adquirir un nuevo crédito.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto solicitado</FormLabel>
                    <FormControl>
                      <Input inputMode="decimal" placeholder="25,000,000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rateValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tasa (% por periodo seleccionado)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="18" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rateType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de tasa</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="annual">Efectiva anual (EA)</SelectItem>
                        <SelectItem value="monthly">Nominal mensual (NM)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="termMonths"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plazo en meses</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={360} placeholder="24" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frecuencia de pago</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="monthly">Mensual</SelectItem>
                        <SelectItem value="biweekly">Quincenal</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="extraPayment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pago adicional por periodo (opcional)</FormLabel>
                    <FormControl>
                      <Input inputMode="decimal" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 md:col-span-2">
                <Button type="submit" className="w-full sm:w-auto">
                  Simular
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => form.reset(form.formState.defaultValues)}
                  className="w-full sm:w-auto"
                >
                  Limpiar
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {result ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-emerald-100">
            <CardHeader>
              <CardTitle>Resumen</CardTitle>
              <CardDescription>
                {submittedValues?.frequency === "monthly" ? "Cuota mensual estimada" : "Pago quincenal estimado"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Pago por periodo</p>
                <p className="text-3xl font-semibold text-emerald-600">
                  {currencyFormatter.format(result.periodicPayment)}
                </p>
              </div>
                <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Total pagado</p>
                  <p className="text-lg font-semibold">{currencyFormatter.format(result.totalPaid)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Interés total</p>
                  <p className="text-lg font-semibold text-rose-600">
                    {currencyFormatter.format(result.totalInterest)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Duración estimada</p>
                  <p className="text-lg font-semibold">
                    {result.schedule.length} {result.frequency === "monthly" ? "meses" : "quincenas"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fecha final proyectada</p>
                  <p className="text-lg font-semibold">{payoffDate}</p>
                </div>
              </div>
              <div className="pt-4 flex flex-wrap gap-3">
                <Button type="button" variant="secondary" onClick={handleExportCsv} disabled={!result?.schedule.length}>
                  Descargar CSV
                </Button>
                <Button type="button" variant="outline" asChild disabled={!result?.schedule.length}>
                  <a href="#register-debt">Registrar deuda real</a>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-100">
            <CardHeader>
              <CardTitle>Observaciones</CardTitle>
              <CardDescription>Comparte este resumen con tu asesor financiero.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                El simulador asume pagos {submittedValues?.frequency === "monthly" ? "mensuales" : "quincenales"} constantes
                y una tasa fija. Cambios en la tasa nominal modificarán el resultado real.
              </p>
              <p>
                Agregar un pago adicional por periodo acelera el cierre y reduce el interés total. Experimenta con diferentes
                montos para validar tu estrategia.
              </p>
              <p>
                Si deseas incorporar esta deuda en tus proyecciones reales, crea una deuda nueva desde el módulo principal y
                replica los datos finales.
              </p>
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-3">
                  Nota: esta es una simulación referencial. Las entidades financieras pueden incluir seguros, cargos
                  administrativos u otros costos que aumentan la cuota final. Verifica siempre la oferta oficial antes de tomar la decisión.
                </p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-muted-foreground">
            Ingresa los parámetros del crédito para ver la tabla de amortización y el resumen financiero.
          </CardContent>
        </Card>
      )}

      {result && (
        <Card id="register-debt" className="border-emerald-200">
          <CardHeader>
            <CardTitle>Registrar como deuda real</CardTitle>
            <CardDescription>
              Crea la obligación con el monto simulado ({simulatedAmount ? currencyFormatter.format(simulatedAmount) : "-"}) y
              sincronízala en el módulo de Deudas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...registerDebtForm}>
              <form onSubmit={handleRegisterDebt} className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={registerDebtForm.control}
                  name="entityName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Entidad / Banco</FormLabel>
                      <FormControl>
                        <Input placeholder="Entidad financiera" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={registerDebtForm.control}
                  name="debtType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de deuda</FormLabel>
                      <FormControl>
                        <Input placeholder="Crédito personal" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={registerDebtForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Notas (opcional)</FormLabel>
                      <FormControl>
                        <Textarea rows={3} placeholder="Observaciones para recordar esta simulación" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="md:col-span-2 flex flex-col sm:flex-row gap-3">
                  <Button type="submit" disabled={createDebtMutation.isPending} className="w-full sm:w-auto">
                    {createDebtMutation.isPending ? "Guardando..." : "Registrar deuda"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => registerDebtForm.reset({ entityName: "", debtType: "", notes: "" })}
                    className="w-full sm:w-auto"
                  >
                    Limpiar
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {result && result.schedule.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tabla de amortización</CardTitle>
            <CardDescription>Primeras {Math.min(result.schedule.length, 120)} filas mostradas</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[420px]">
              <table className="w-full min-w-[680px] text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="text-left text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Periodo</th>
                    <th className="py-2 pr-3 font-medium">Fecha</th>
                    <th className="py-2 pr-3 font-medium">Pago</th>
                    <th className="py-2 pr-3 font-medium">Interés</th>
                    <th className="py-2 pr-3 font-medium">Capital</th>
                    <th className="py-2 pr-0 font-medium">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {result.schedule.slice(0, 120).map((entry) => (
                    <tr key={entry.period} className="border-b last:border-b-0">
                      <td className="py-2 pr-3 font-medium text-slate-700">{entry.period}</td>
                      <td className="py-2 pr-3 text-slate-600">
                        {new Date(entry.date).toLocaleDateString("es-CO", { year: "numeric", month: "short" })}
                      </td>
                      <td className="py-2 pr-3">{currencyFormatter.format(entry.payment)}</td>
                      <td className="py-2 pr-3 text-rose-600">{currencyFormatter.format(entry.interest)}</td>
                      <td className="py-2 pr-3 text-emerald-600">{currencyFormatter.format(entry.principal)}</td>
                      <td className="py-2 pr-0 font-semibold">{currencyFormatter.format(entry.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
            {result.schedule.length > 120 && (
              <p className="mt-3 text-xs text-muted-foreground">
                Mostrando 120 filas de {result.schedule.length}. Descarga el CSV para revisar la tabla completa.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
