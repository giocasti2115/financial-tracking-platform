import { useCallback, useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native"
import { AppScreen } from "@/components/ui/app-screen"
import { AppInput } from "@/components/ui/app-input"
import { PrimaryButton } from "@/components/ui/primary-button"
import { useAuth } from "@/providers/auth-provider"
import { colors } from "@/theme/colors"
import { ApiError } from "@/lib/api-client"
import { expensesApi, getSemesterFromDate } from "@/lib/expenses"
import type { Expense, PaymentPeriod } from "@/lib/types"

const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
})

const monthLabels = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]

export default function ExpensesScreen() {
  const { accessToken, refreshSession } = useAuth()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [search, setSearch] = useState("")
  const [selectedMonth, setSelectedMonth] = useState<number | "all">(new Date().getMonth() + 1)
  const [selectedPeriod, setSelectedPeriod] = useState<PaymentPeriod | "all">("all")
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    payment_date: new Date().toISOString().slice(0, 10),
    payment_period: "primera_quincena" as PaymentPeriod,
    notes: "",
  })

  const auth = useMemo(
    () => ({ accessToken, refreshSession }),
    [accessToken, refreshSession],
  )

  const loadExpenses = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await expensesApi.list(auth)
      setExpenses(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos cargar tus gastos.")
    } finally {
      setLoading(false)
    }
  }, [auth])

  useEffect(() => {
    void loadExpenses()
  }, [loadExpenses])

  const filteredExpenses = useMemo(() => {
    return expenses
      .filter((expense) => {
        const [, month] = expense.payment_date.split("-").map(Number)
        const matchesMonth = selectedMonth === "all" || month === selectedMonth
        const matchesPeriod = selectedPeriod === "all" || expense.payment_period === selectedPeriod
        const normalizedSearch = search.trim().toLowerCase()
        const matchesSearch =
          normalizedSearch.length === 0 ||
          expense.description.toLowerCase().includes(normalizedSearch) ||
          expense.notes?.toLowerCase().includes(normalizedSearch)

        return matchesMonth && matchesPeriod && matchesSearch
      })
      .sort((a, b) => b.payment_date.localeCompare(a.payment_date))
  }, [expenses, search, selectedMonth, selectedPeriod])

  const pendingTotal = useMemo(
    () => filteredExpenses.reduce((sum, expense) => sum + Math.max(expense.amount - (expense.amount_paid ?? 0), 0), 0),
    [filteredExpenses],
  )

  const handleCreateExpense = async () => {
    if (!formData.description.trim() || !formData.amount.trim() || !formData.payment_date) {
      setError("Completa descripción, monto y fecha para registrar el gasto.")
      return
    }

    const amount = Number(formData.amount.replace(/[^\d.,-]/g, "").replace(/\./g, "").replace(",", "."))
    if (Number.isNaN(amount) || amount <= 0) {
      setError("Ingresa un monto válido para el gasto.")
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const year = Number(formData.payment_date.slice(0, 4))
      const created = await expensesApi.create(auth, {
        description: formData.description.trim(),
        amount,
        payment_date: formData.payment_date,
        payment_period: formData.payment_period,
        semester: getSemesterFromDate(formData.payment_date),
        year,
        notes: formData.notes.trim() || undefined,
        is_paid: false,
        amount_paid: 0,
      })

      setExpenses((current) => [created, ...current])
      setFormData({
        description: "",
        amount: "",
        payment_date: new Date().toISOString().slice(0, 10),
        payment_period: "primera_quincena",
        notes: "",
      })
      setShowForm(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos registrar el gasto.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppScreen scroll>
      <Text style={styles.title}>Gastos</Text>
      <Text style={styles.description}>Consulta el mes actual, filtra resultados y registra nuevos gastos.</Text>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Total pendiente filtrado</Text>
        <Text style={styles.summaryValue}>{currencyFormatter.format(pendingTotal)}</Text>
        <Text style={styles.summaryFootnote}>{filteredExpenses.length} gasto(s) en la vista actual</Text>
      </View>

      <View style={styles.filterCard}>
        <Text style={styles.sectionTitle}>Filtros</Text>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar descripción o nota"
          placeholderTextColor={colors.mutedText}
          style={styles.searchInput}
        />

        <Text style={styles.filterLabel}>Mes</Text>
        <View style={styles.chipsRow}>
          <Pressable onPress={() => setSelectedMonth("all")} style={[styles.chip, selectedMonth === "all" && styles.chipActive]}>
            <Text style={[styles.chipText, selectedMonth === "all" && styles.chipTextActive]}>Todos</Text>
          </Pressable>
          {monthLabels.map((month, index) => {
            const value = index + 1
            const active = selectedMonth === value
            return (
              <Pressable key={month} onPress={() => setSelectedMonth(value)} style={[styles.chip, active && styles.chipActive]}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{month}</Text>
              </Pressable>
            )
          })}
        </View>

        <Text style={styles.filterLabel}>Quincena</Text>
        <View style={styles.periodRow}>
          {[
            { label: "Todas", value: "all" as const },
            { label: "Primera", value: "primera_quincena" as const },
            { label: "Segunda", value: "segunda_quincena" as const },
          ].map((item) => {
            const active = selectedPeriod === item.value
            return (
              <Pressable key={item.label} onPress={() => setSelectedPeriod(item.value)} style={[styles.segment, active && styles.segmentActive]}>
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{item.label}</Text>
              </Pressable>
            )
          })}
        </View>
      </View>

      <View style={styles.formCard}>
        <View style={styles.formHeader}>
          <Text style={styles.sectionTitle}>Registrar gasto</Text>
          <Pressable onPress={() => setShowForm((value) => !value)}>
            <Text style={styles.toggleLink}>{showForm ? "Ocultar" : "Mostrar"}</Text>
          </Pressable>
        </View>

        {showForm ? (
          <View style={styles.formContent}>
            <AppInput
              label="Descripción"
              value={formData.description}
              onChangeText={(value) => setFormData((current) => ({ ...current, description: value }))}
              placeholder="Ej: Arriendo, Spotify, parqueadero"
            />
            <AppInput
              label="Monto"
              value={formData.amount}
              onChangeText={(value) => setFormData((current) => ({ ...current, amount: value }))}
              keyboardType="numeric"
              placeholder="0"
            />
            <AppInput
              label="Fecha de pago"
              value={formData.payment_date}
              onChangeText={(value) => setFormData((current) => ({ ...current, payment_date: value }))}
              placeholder="YYYY-MM-DD"
            />
            <AppInput
              label="Notas"
              value={formData.notes}
              onChangeText={(value) => setFormData((current) => ({ ...current, notes: value }))}
              placeholder="Opcional"
            />

            <Text style={styles.filterLabel}>Quincena</Text>
            <View style={styles.periodRow}>
              {[
                { label: "Primera", value: "primera_quincena" as const },
                { label: "Segunda", value: "segunda_quincena" as const },
              ].map((item) => {
                const active = formData.payment_period === item.value
                return (
                  <Pressable
                    key={item.label}
                    onPress={() => setFormData((current) => ({ ...current, payment_period: item.value }))}
                    style={[styles.segment, active && styles.segmentActive]}
                  >
                    <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{item.label}</Text>
                  </Pressable>
                )
              })}
            </View>

            <PrimaryButton label="Guardar gasto" onPress={() => void handleCreateExpense()} loading={submitting} />
          </View>
        ) : null}
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
          {!submitting ? <PrimaryButton label="Reintentar carga" onPress={() => void loadExpenses()} /> : null}
        </View>
      ) : null}

      {loading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator color={colors.gold600} />
          <Text style={styles.loadingText}>Cargando gastos...</Text>
        </View>
      ) : filteredExpenses.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Sin resultados</Text>
          <Text style={styles.emptyText}>Ajusta filtros o registra tu primer gasto desde esta pantalla.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {filteredExpenses.map((expense) => {
            const pending = Math.max(expense.amount - (expense.amount_paid ?? 0), 0)
            return (
              <View key={expense.id} style={styles.expenseCard}>
                <View style={styles.expenseTopRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.expenseTitle}>{expense.description}</Text>
                    <Text style={styles.expenseMeta}>{expense.payment_date}</Text>
                  </View>
                  <Text style={styles.expenseAmount}>{currencyFormatter.format(expense.amount)}</Text>
                </View>
                <View style={styles.expenseBottomRow}>
                  <Text style={styles.expenseTag}>
                    {expense.payment_period === "primera_quincena" ? "Primera (15)" : "Segunda (30)"}
                  </Text>
                  <Text style={styles.expensePending}>Pendiente: {currencyFormatter.format(pending)}</Text>
                </View>
                {expense.notes ? <Text style={styles.notes}>{expense.notes}</Text> : null}
              </View>
            )
          })}
        </View>
      )}
    </AppScreen>
  )
}

const styles = StyleSheet.create({
  title: {
    color: colors.navy900,
    fontSize: 26,
    fontWeight: "700",
  },
  description: {
    color: colors.mutedText,
    fontSize: 14,
  },
  summaryCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#f2ddb9",
    backgroundColor: "#fff8ed",
    padding: 14,
    gap: 4,
  },
  summaryLabel: {
    color: colors.navy500,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  summaryValue: {
    color: colors.navy900,
    fontSize: 24,
    fontWeight: "700",
  },
  summaryFootnote: {
    color: colors.navy700,
    fontSize: 12,
  },
  filterCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.ivory,
    padding: 14,
    gap: 10,
  },
  sectionTitle: {
    color: colors.navy900,
    fontSize: 18,
    fontWeight: "700",
  },
  searchInput: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cream,
    paddingHorizontal: 12,
    color: colors.navy900,
    fontSize: 15,
  },
  filterLabel: {
    color: colors.navy700,
    fontSize: 13,
    fontWeight: "600",
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cream,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  chipActive: {
    borderColor: colors.gold500,
    backgroundColor: "#fcefdc",
  },
  chipText: {
    color: colors.navy700,
    fontSize: 12,
    fontWeight: "600",
  },
  chipTextActive: {
    color: colors.gold600,
  },
  periodRow: {
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
  formCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.ivory,
    padding: 14,
    gap: 10,
  },
  formHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  toggleLink: {
    color: colors.gold600,
    fontWeight: "700",
  },
  formContent: {
    gap: 12,
  },
  errorCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#efc9c4",
    backgroundColor: "#fff3f1",
    padding: 14,
    gap: 10,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 18,
  },
  loadingCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.ivory,
    padding: 20,
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    color: colors.navy700,
  },
  emptyCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.ivory,
    padding: 18,
    gap: 8,
  },
  emptyTitle: {
    color: colors.navy900,
    fontWeight: "700",
    fontSize: 16,
  },
  emptyText: {
    color: colors.navy700,
    fontSize: 13,
    lineHeight: 19,
  },
  list: {
    gap: 10,
  },
  expenseCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.ivory,
    padding: 14,
    gap: 8,
  },
  expenseTopRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  expenseTitle: {
    color: colors.navy900,
    fontSize: 16,
    fontWeight: "700",
  },
  expenseMeta: {
    color: colors.mutedText,
    fontSize: 12,
    marginTop: 2,
  },
  expenseAmount: {
    color: colors.navy900,
    fontSize: 16,
    fontWeight: "700",
  },
  expenseBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  expenseTag: {
    color: colors.gold600,
    fontSize: 12,
    fontWeight: "700",
  },
  expensePending: {
    color: colors.navy700,
    fontSize: 12,
    fontWeight: "600",
  },
  notes: {
    color: colors.navy500,
    fontSize: 12,
    lineHeight: 18,
  },
})