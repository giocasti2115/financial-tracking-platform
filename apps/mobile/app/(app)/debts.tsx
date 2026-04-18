import { useCallback, useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native"
import { AppScreen } from "@/components/ui/app-screen"
import { AppInput } from "@/components/ui/app-input"
import { PrimaryButton } from "@/components/ui/primary-button"
import { useAuth } from "@/providers/auth-provider"
import { colors } from "@/theme/colors"
import { ApiError } from "@/lib/api-client"
import { debtsApi } from "@/lib/debts"
import type { Debt, DebtPaymentFrequency, DebtStatus } from "@/lib/types"

const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
})

const parseCurrencyInput = (value: string) => {
  return Number(value.replace(/[^\d.,-]/g, "").replace(/\./g, "").replace(",", "."))
}

export default function DebtsScreen() {
  const { accessToken, refreshSession } = useAuth()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [debts, setDebts] = useState<Debt[]>([])

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<DebtStatus | "all">("active")
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedDebtId, setSelectedDebtId] = useState<string | null>(null)

  const [createForm, setCreateForm] = useState({
    entity_name: "",
    debt_type: "",
    original_amount: "",
    current_balance: "",
    monthly_payment: "",
    interest_rate: "",
    payment_day: "",
    payment_frequency: "monthly" as DebtPaymentFrequency,
    notes: "",
  })

  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    payment_date: new Date().toISOString().slice(0, 10),
    notes: "",
  })

  const auth = useMemo(
    () => ({ accessToken, refreshSession }),
    [accessToken, refreshSession],
  )

  const loadDebts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await debtsApi.list(auth)
      setDebts(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos cargar tus deudas.")
    } finally {
      setLoading(false)
    }
  }, [auth])

  useEffect(() => {
    void loadDebts()
  }, [loadDebts])

  const filteredDebts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    return debts
      .filter((debt) => {
        const matchesStatus = statusFilter === "all" || debt.status === statusFilter
        const matchesSearch =
          normalizedSearch.length === 0 ||
          debt.entity_name.toLowerCase().includes(normalizedSearch) ||
          debt.debt_type.toLowerCase().includes(normalizedSearch)
        return matchesStatus && matchesSearch
      })
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
  }, [debts, search, statusFilter])

  const totalActiveDebt = useMemo(
    () => filteredDebts.filter((debt) => debt.status === "active").reduce((sum, debt) => sum + debt.current_balance, 0),
    [filteredDebts],
  )

  const handleCreateDebt = async () => {
    if (!createForm.entity_name.trim() || !createForm.debt_type.trim()) {
      setError("Completa entidad y tipo de deuda.")
      return
    }

    const originalAmount = parseCurrencyInput(createForm.original_amount)
    const currentBalance = parseCurrencyInput(createForm.current_balance)

    if (Number.isNaN(originalAmount) || originalAmount <= 0 || Number.isNaN(currentBalance) || currentBalance < 0) {
      setError("Ingresa montos válidos para la deuda.")
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const monthlyPayment = parseCurrencyInput(createForm.monthly_payment)
      const interestRate = Number(createForm.interest_rate)
      const paymentDay = Number(createForm.payment_day)

      const created = await debtsApi.create(auth, {
        entity_name: createForm.entity_name.trim(),
        debt_type: createForm.debt_type.trim(),
        original_amount: originalAmount,
        current_balance: currentBalance,
        monthly_payment:
          createForm.monthly_payment.trim().length > 0 && !Number.isNaN(monthlyPayment) && monthlyPayment >= 0
            ? monthlyPayment
            : undefined,
        interest_rate:
          createForm.interest_rate.trim().length > 0 && !Number.isNaN(interestRate) && interestRate >= 0
            ? interestRate
            : undefined,
        payment_day:
          createForm.payment_day.trim().length > 0 && Number.isInteger(paymentDay) && paymentDay >= 1 && paymentDay <= 31
            ? paymentDay
            : undefined,
        payment_frequency: createForm.payment_frequency,
        status: currentBalance <= 0 ? "paid" : "active",
        notes: createForm.notes.trim() || undefined,
      })

      setDebts((current) => [created, ...current])
      setCreateForm({
        entity_name: "",
        debt_type: "",
        original_amount: "",
        current_balance: "",
        monthly_payment: "",
        interest_rate: "",
        payment_day: "",
        payment_frequency: "monthly",
        notes: "",
      })
      setShowCreateForm(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos registrar la deuda.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleRegisterPayment = async (debtId: string) => {
    const amount = parseCurrencyInput(paymentForm.amount)
    if (Number.isNaN(amount) || amount <= 0) {
      setError("Ingresa un valor válido para el pago.")
      return
    }
    if (!paymentForm.payment_date) {
      setError("Ingresa la fecha del pago.")
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const updated = await debtsApi.registerPayment(auth, debtId, {
        amount,
        payment_date: paymentForm.payment_date,
        notes: paymentForm.notes.trim() || undefined,
      })

      setDebts((current) => current.map((item) => (item.id === debtId ? updated : item)))
      setSelectedDebtId(null)
      setPaymentForm({
        amount: "",
        payment_date: new Date().toISOString().slice(0, 10),
        notes: "",
      })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos registrar el pago.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppScreen scroll>
      <Text style={styles.title}>Deudas</Text>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Saldo activo filtrado</Text>
        <Text style={styles.summaryValue}>{currencyFormatter.format(totalActiveDebt)}</Text>
        <Text style={styles.summaryFootnote}>{filteredDebts.length} deuda(s) en la vista</Text>
      </View>

      <View style={styles.filtersCard}>
        <Text style={styles.sectionTitle}>Filtros</Text>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar entidad o tipo"
          placeholderTextColor={colors.mutedText}
          style={styles.searchInput}
        />
        <View style={styles.segmentRow}>
          {[
            { label: "Todas", value: "all" as const },
            { label: "Activas", value: "active" as const },
            { label: "Pendientes", value: "pending" as const },
            { label: "Pagadas", value: "paid" as const },
          ].map((item) => {
            const active = statusFilter === item.value
            return (
              <Pressable
                key={item.label}
                onPress={() => setStatusFilter(item.value)}
                style={[styles.segment, active && styles.segmentActive]}
              >
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{item.label}</Text>
              </Pressable>
            )
          })}
        </View>
      </View>

      <View style={styles.formCard}>
        <View style={styles.formHeader}>
          <Text style={styles.sectionTitle}>Nueva deuda</Text>
          <Pressable onPress={() => setShowCreateForm((value) => !value)}>
            <Text style={styles.toggleLink}>{showCreateForm ? "Ocultar" : "Mostrar"}</Text>
          </Pressable>
        </View>

        {showCreateForm ? (
          <View style={styles.formContent}>
            <AppInput
              label="Entidad"
              value={createForm.entity_name}
              onChangeText={(value) => setCreateForm((current) => ({ ...current, entity_name: value }))}
              placeholder="Ej: Bancolombia"
            />
            <AppInput
              label="Tipo"
              value={createForm.debt_type}
              onChangeText={(value) => setCreateForm((current) => ({ ...current, debt_type: value }))}
              placeholder="Ej: Tarjeta de crédito"
            />
            <AppInput
              label="Monto original"
              value={createForm.original_amount}
              onChangeText={(value) => setCreateForm((current) => ({ ...current, original_amount: value }))}
              keyboardType="numeric"
              placeholder="0"
            />
            <AppInput
              label="Saldo actual"
              value={createForm.current_balance}
              onChangeText={(value) => setCreateForm((current) => ({ ...current, current_balance: value }))}
              keyboardType="numeric"
              placeholder="0"
            />
            <AppInput
              label="Pago mensual (opcional)"
              value={createForm.monthly_payment}
              onChangeText={(value) => setCreateForm((current) => ({ ...current, monthly_payment: value }))}
              keyboardType="numeric"
              placeholder="0"
            />
            <View style={styles.twoColRow}>
              <View style={styles.col}>
                <AppInput
                  label="Interés %"
                  value={createForm.interest_rate}
                  onChangeText={(value) => setCreateForm((current) => ({ ...current, interest_rate: value }))}
                  keyboardType="numeric"
                  placeholder="0"
                />
              </View>
              <View style={styles.col}>
                <AppInput
                  label="Día de pago"
                  value={createForm.payment_day}
                  onChangeText={(value) => setCreateForm((current) => ({ ...current, payment_day: value }))}
                  keyboardType="number-pad"
                  placeholder="15"
                />
              </View>
            </View>

            <Text style={styles.filterLabel}>Frecuencia</Text>
            <View style={styles.segmentRow}>
              {[
                { label: "Mensual", value: "monthly" as const },
                { label: "Quincenal", value: "biweekly" as const },
              ].map((item) => {
                const active = createForm.payment_frequency === item.value
                return (
                  <Pressable
                    key={item.label}
                    onPress={() => setCreateForm((current) => ({ ...current, payment_frequency: item.value }))}
                    style={[styles.segment, active && styles.segmentActive]}
                  >
                    <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{item.label}</Text>
                  </Pressable>
                )
              })}
            </View>

            <AppInput
              label="Notas"
              value={createForm.notes}
              onChangeText={(value) => setCreateForm((current) => ({ ...current, notes: value }))}
              placeholder="Opcional"
            />

            <PrimaryButton label="Guardar deuda" onPress={() => void handleCreateDebt()} loading={submitting} />
          </View>
        ) : null}
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
          {!submitting ? <PrimaryButton label="Reintentar carga" onPress={() => void loadDebts()} /> : null}
        </View>
      ) : null}

      {loading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator color={colors.gold600} />
          <Text style={styles.loadingText}>Cargando deudas...</Text>
        </View>
      ) : filteredDebts.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Sin deudas</Text>
          <Text style={styles.emptyText}>No hay resultados con los filtros actuales.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {filteredDebts.map((debt) => {
            const progress = debt.original_amount > 0 ? 1 - debt.current_balance / debt.original_amount : 0
            const paidPercent = Math.max(0, Math.min(100, Math.round(progress * 100)))
            const isPaymentOpen = selectedDebtId === debt.id

            return (
              <View key={debt.id} style={styles.debtCard}>
                <View style={styles.debtTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.debtTitle}>{debt.entity_name}</Text>
                    <Text style={styles.debtMeta}>{debt.debt_type}</Text>
                  </View>
                  <Text style={styles.debtBalance}>{currencyFormatter.format(debt.current_balance)}</Text>
                </View>

                <View style={styles.debtBottom}>
                  <Text style={styles.debtTag}>{debt.status.toUpperCase()}</Text>
                  <Text style={styles.debtMeta}>Abonado: {paidPercent}%</Text>
                </View>

                {debt.monthly_payment ? (
                  <Text style={styles.supportText}>Pago sugerido: {currencyFormatter.format(debt.monthly_payment)}</Text>
                ) : null}

                <Pressable
                  onPress={() => setSelectedDebtId((current) => (current === debt.id ? null : debt.id))}
                  style={styles.inlineLinkBtn}
                >
                  <Text style={styles.inlineLinkText}>{isPaymentOpen ? "Ocultar pago" : "Registrar pago"}</Text>
                </Pressable>

                {isPaymentOpen ? (
                  <View style={styles.paymentBox}>
                    <AppInput
                      label="Monto pago"
                      value={paymentForm.amount}
                      onChangeText={(value) => setPaymentForm((current) => ({ ...current, amount: value }))}
                      keyboardType="numeric"
                      placeholder="0"
                    />
                    <AppInput
                      label="Fecha"
                      value={paymentForm.payment_date}
                      onChangeText={(value) => setPaymentForm((current) => ({ ...current, payment_date: value }))}
                      placeholder="YYYY-MM-DD"
                    />
                    <AppInput
                      label="Notas"
                      value={paymentForm.notes}
                      onChangeText={(value) => setPaymentForm((current) => ({ ...current, notes: value }))}
                      placeholder="Opcional"
                    />

                    <PrimaryButton
                      label="Aplicar pago"
                      onPress={() => void handleRegisterPayment(debt.id)}
                      loading={submitting}
                    />
                  </View>
                ) : null}
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
  sectionTitle: {
    color: colors.navy900,
    fontSize: 18,
    fontWeight: "700",
  },
  filtersCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.ivory,
    padding: 14,
    gap: 10,
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
  segmentRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
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
  filterLabel: {
    color: colors.navy700,
    fontSize: 13,
    fontWeight: "600",
  },
  twoColRow: {
    flexDirection: "row",
    gap: 10,
  },
  col: {
    flex: 1,
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
  debtCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.ivory,
    padding: 14,
    gap: 8,
  },
  debtTop: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  debtTitle: {
    color: colors.navy900,
    fontSize: 16,
    fontWeight: "700",
  },
  debtMeta: {
    color: colors.mutedText,
    fontSize: 12,
  },
  debtBalance: {
    color: colors.navy900,
    fontSize: 16,
    fontWeight: "700",
  },
  debtBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  debtTag: {
    color: colors.gold600,
    fontSize: 12,
    fontWeight: "700",
  },
  supportText: {
    color: colors.navy700,
    fontSize: 12,
  },
  inlineLinkBtn: {
    alignSelf: "flex-start",
  },
  inlineLinkText: {
    color: colors.gold600,
    fontWeight: "700",
    fontSize: 13,
  },
  paymentBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cream,
    padding: 12,
    gap: 10,
  },
})