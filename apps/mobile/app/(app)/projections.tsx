import { useMemo, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { AppScreen } from "@/components/ui/app-screen"
import { AppInput } from "@/components/ui/app-input"
import { PrimaryButton } from "@/components/ui/primary-button"
import { colors } from "@/theme/colors"
import { projections, type CreditSimulationResult } from "@/lib/projections"

const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
})

const parseCurrencyInput = (value: string) => Number(value.replace(/[^\d.,-]/g, "").replace(/\./g, "").replace(",", "."))

export default function ProjectionsScreen() {
  const [amount, setAmount] = useState("")
  const [rateValue, setRateValue] = useState("")
  const [termMonths, setTermMonths] = useState("")
  const [extraPayment, setExtraPayment] = useState("")
  const [frequency, setFrequency] = useState<"monthly" | "biweekly">("monthly")
  const [error, setError] = useState<string | null>(null)
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
    const simulation = projections.simulateCreditScenario({
      amount: principal,
      annualRate,
      termMonths: term,
      frequency,
      extraPayment: Number.isNaN(extra) ? 0 : Math.max(0, extra),
    })
    setResult(simulation)
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
        </View>
      ) : null}

      <View style={styles.cardMuted}>
        <Text style={styles.text}>Siguiente paso: registrar deuda simulada desde móvil (Sprint pendiente).</Text>
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
})