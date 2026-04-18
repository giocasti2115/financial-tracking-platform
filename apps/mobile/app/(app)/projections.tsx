import { useMemo, useState } from "react"
import { Pressable, Share, StyleSheet, Text, View } from "react-native"
import { AppScreen } from "@/components/ui/app-screen"
import { AppInput } from "@/components/ui/app-input"
import { PrimaryButton } from "@/components/ui/primary-button"
import { colors } from "@/theme/colors"
import { projections, type CreditSimulationResult } from "@/lib/projections"
import { useAuth } from "@/providers/auth-provider"
import { debtsApi } from "@/lib/debts"
import { ApiError } from "@/lib/api-client"

const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
})

const parseCurrencyInput = (value: string) => Number(value.replace(/[^\d.,-]/g, "").replace(/\./g, "").replace(",", "."))

export default function ProjectionsScreen() {
  const { accessToken, refreshSession } = useAuth()
  const [amount, setAmount] = useState("")
  const [rateValue, setRateValue] = useState("")
  const [termMonths, setTermMonths] = useState("")
  const [extraPayment, setExtraPayment] = useState("")
  const [frequency, setFrequency] = useState<"monthly" | "biweekly">("monthly")
  const [entityName, setEntityName] = useState("Nuevo crédito")
  const [debtType, setDebtType] = useState("crédito personal")
  const [notes, setNotes] = useState("")
  const [savingDebt, setSavingDebt] = useState(false)
  const [exportingCsv, setExportingCsv] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [result, setResult] = useState<CreditSimulationResult | null>(null)

  const payoffDate = useMemo(() => {
    if (!result) return "-"
    return new Date(result.payoffDate).toLocaleDateString("es-CO", { year: "numeric", month: "long" })
  }, [result])

  const handleSimulate = () => {
    const principal = parseCurrencyInput(amount)
    const annualRate = Number(rateValue)
    const term = Number.parseInt(termMonths, 10)
    const extra = extraPayment.trim().length > 0 ? parseCurrencyInput(extraPayment) : 0

    if (Number.isNaN(principal) || principal <= 0) {
      setError("Ingresa un monto válido mayor a 0.")
      return
    }
    if (Number.isNaN(annualRate) || annualRate < 0) {
      setError("Ingresa una tasa anual válida.")
      return
    }
    if (Number.isNaN(term) || term < 1 || term > 360) {
      setError("El plazo debe estar entre 1 y 360 meses.")
      return
    }

    setError(null)
    setSuccess(null)
    const simulation = projections.simulateCreditScenario({
      amount: principal,
      annualRate,
      termMonths: term,
      frequency,
      extraPayment: Number.isNaN(extra) ? 0 : Math.max(0, extra),
    })
    setResult(simulation)
  }

  const handleRegisterDebt = async () => {
    if (!result) {
      setError("Primero debes ejecutar una simulación.")
      return
    }

    const originalAmount = parseCurrencyInput(amount)
    const annualRate = Number(rateValue)
    if (Number.isNaN(originalAmount) || originalAmount <= 0) {
      setError("El monto simulado es inválido para registrar la deuda.")
      return
    }

    if (!entityName.trim() || !debtType.trim()) {
      setError("Completa entidad y tipo de deuda para guardar.")
      return
    }

    setSavingDebt(true)
    setError(null)
    setSuccess(null)
    try {
      await debtsApi.create(
        { accessToken, refreshSession },
        {
          entity_name: entityName.trim(),
          debt_type: debtType.trim(),
          original_amount: originalAmount,
          current_balance: originalAmount,
          monthly_payment:
            result.frequency === "monthly"
              ? result.periodicPayment
              : Number((result.periodicPayment * 2).toFixed(2)),
          payment_frequency: result.frequency,
          interest_rate: Number.isNaN(annualRate) ? undefined : annualRate,
          start_date: new Date().toISOString().slice(0, 10),
          status: "active",
          notes: notes.trim() || undefined,
        },
      )
      setSuccess("Deuda registrada correctamente desde la simulación.")
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos registrar la deuda simulada.")
    } finally {
      setSavingDebt(false)
    }
  }

  const handleExportCsv = async () => {
    if (!result || result.schedule.length === 0) {
      setError("No hay simulación para exportar.")
      return
    }

    setExportingCsv(true)
    setError(null)
    setSuccess(null)
    try {
      const header = ["Periodo", "Fecha", "Pago", "Interés", "Capital", "Saldo"]
      const rows = result.schedule.map((entry) => [
        entry.period.toString(),
        new Date(entry.date).toLocaleDateString("es-CO"),
        entry.payment.toFixed(2),
        entry.interest.toFixed(2),
        entry.principal.toFixed(2),
        entry.balance.toFixed(2),
      ])
      const csv = [header, ...rows]
        .map((columns) => columns.map((col) => `"${String(col).replace(/"/g, '""')}"`).join(","))
        .join("\n")

      await Share.share({
        title: "Simulación de crédito",
        message: `Simulación de crédito\n\n${csv}`,
      })
      setSuccess("CSV generado y listo para compartir.")
    } catch {
      setError("No pudimos exportar la simulación en este momento.")
    } finally {
      setExportingCsv(false)
    }
  }

  return (
    <AppScreen scroll>
      <Text style={styles.title}>Proyecciones</Text>

      <View style={styles.card}>
        <Text style={styles.subtitle}>Simulador de crédito</Text>
        <Text style={styles.text}>Evalúa cuotas, intereses y fecha estimada de finalización de una nueva obligación.</Text>

        <AppInput label="Monto solicitado" value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="25000000" />
        <AppInput
          label="Tasa efectiva anual (%)"
          value={rateValue}
          onChangeText={setRateValue}
          keyboardType="numeric"
          placeholder="18"
        />
        <AppInput
          label="Plazo (meses)"
          value={termMonths}
          onChangeText={setTermMonths}
          keyboardType="number-pad"
          placeholder="24"
        />
        <AppInput
          label="Pago extra por periodo (opcional)"
          value={extraPayment}
          onChangeText={setExtraPayment}
          keyboardType="numeric"
          placeholder="0"
        />

        <Text style={styles.fieldLabel}>Frecuencia</Text>
        <View style={styles.segmentRow}>
          {[
            { label: "Mensual", value: "monthly" as const },
            { label: "Quincenal", value: "biweekly" as const },
          ].map((item) => {
            const active = frequency === item.value
            return (
              <Pressable key={item.label} onPress={() => setFrequency(item.value)} style={[styles.segment, active && styles.segmentActive]}>
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{item.label}</Text>
              </Pressable>
            )
          })}
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {success ? (
          <View style={styles.successCard}>
            <Text style={styles.successText}>{success}</Text>
          </View>
        ) : null}

        <PrimaryButton label="Simular" onPress={handleSimulate} />
      </View>

      {result ? (
        <View style={styles.resultsCard}>
          <Text style={styles.subtitle}>Resumen</Text>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>{result.frequency === "monthly" ? "Cuota mensual" : "Pago quincenal"}</Text>
            <Text style={styles.metricValue}>{currencyFormatter.format(result.periodicPayment)}</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Interés total</Text>
            <Text style={styles.metricValue}>{currencyFormatter.format(result.totalInterest)}</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Total pagado</Text>
            <Text style={styles.metricValue}>{currencyFormatter.format(result.totalPaid)}</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Fecha estimada fin</Text>
            <Text style={styles.metricValue}>{payoffDate}</Text>
          </View>

          <Text style={styles.tableTitle}>Primeros periodos</Text>
          {result.schedule.slice(0, 8).map((entry) => (
            <View key={entry.period} style={styles.periodCard}>
              <Text style={styles.periodTitle}>Periodo {entry.period}</Text>
              <Text style={styles.periodText}>Pago: {currencyFormatter.format(entry.payment)}</Text>
              <Text style={styles.periodText}>Interés: {currencyFormatter.format(entry.interest)}</Text>
              <Text style={styles.periodText}>Capital: {currencyFormatter.format(entry.principal)}</Text>
              <Text style={styles.periodText}>Saldo: {currencyFormatter.format(entry.balance)}</Text>
            </View>
          ))}

          <View style={styles.actionsRow}>
            <PrimaryButton label="Exportar CSV" onPress={() => void handleExportCsv()} loading={exportingCsv} />
          </View>

          <View style={styles.registerCard}>
            <Text style={styles.subtitle}>Registrar deuda simulada</Text>
            <AppInput label="Entidad" value={entityName} onChangeText={setEntityName} placeholder="Ej: Banco XYZ" />
            <AppInput label="Tipo de deuda" value={debtType} onChangeText={setDebtType} placeholder="Ej: Crédito personal" />
            <AppInput label="Notas (opcional)" value={notes} onChangeText={setNotes} placeholder="Observaciones" />
            <PrimaryButton label="Guardar deuda" onPress={() => void handleRegisterDebt()} loading={savingDebt} />
          </View>
        </View>
      ) : null}

      <View style={styles.cardMuted}>
        <Text style={styles.text}>Sprint 1.5: registro de deuda y exportación CSV habilitados.</Text>
      </View>
    </AppScreen>
  )
}

const styles = StyleSheet.create({
  title: { color: colors.navy900, fontSize: 26, fontWeight: "700" },
  subtitle: { color: colors.navy900, fontSize: 18, fontWeight: "700" },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.ivory,
    padding: 14,
    gap: 10,
  },
  cardMuted: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cream,
    padding: 14,
  },
  text: { color: colors.navy700, fontSize: 14, lineHeight: 20 },
  fieldLabel: {
    color: colors.navy700,
    fontSize: 13,
    fontWeight: "600",
  },
  segmentRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  segment: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cream,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  segmentActive: {
    backgroundColor: colors.navy900,
    borderColor: colors.navy900,
  },
  segmentText: {
    color: colors.navy700,
    fontSize: 13,
    fontWeight: "600",
  },
  segmentTextActive: {
    color: colors.ivory,
  },
  errorCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#efc9c4",
    backgroundColor: "#fff3f1",
    padding: 10,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
  },
  successCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#cce7cf",
    backgroundColor: "#eef9ef",
    padding: 10,
  },
  successText: {
    color: "#1e6f2b",
    fontSize: 13,
  },
  resultsCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.ivory,
    padding: 14,
    gap: 10,
  },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  metricLabel: {
    color: colors.navy700,
    fontSize: 13,
  },
  metricValue: {
    color: colors.navy900,
    fontSize: 13,
    fontWeight: "700",
  },
  tableTitle: {
    color: colors.navy900,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 2,
  },
  periodCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cream,
    padding: 10,
    gap: 2,
  },
  periodTitle: {
    color: colors.navy900,
    fontSize: 13,
    fontWeight: "700",
  },
  periodText: {
    color: colors.navy700,
    fontSize: 12,
  },
  actionsRow: {
    marginTop: 6,
  },
  registerCard: {
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cream,
    padding: 10,
    gap: 10,
  },
})