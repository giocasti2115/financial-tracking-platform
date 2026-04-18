import { useCallback, useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native"
import { AppScreen } from "@/components/ui/app-screen"
import { PrimaryButton } from "@/components/ui/primary-button"
import { fetchDashboardBundle, dashboardCalculations } from "@/lib/dashboard"
import { buildDashboardInsights } from "@/lib/insights"
import { reminders, type ReminderItem } from "@/lib/reminders"
import { useAuth } from "@/providers/auth-provider"
import { colors } from "@/theme/colors"
import type { DashboardBundle } from "@/lib/types"

const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
})

export default function DashboardScreen() {
  const { accessToken, refreshSession, signOut, user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [bundle, setBundle] = useState<DashboardBundle | null>(null)
  const [reminderItems, setReminderItems] = useState<ReminderItem[]>([])

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await fetchDashboardBundle({ accessToken, refreshSession })
      setBundle(data)
      const syncedReminders = await reminders.sync(data.expenses, data.debts)
      setReminderItems(syncedReminders)
    } catch (err) {
      const message = err instanceof Error ? err.message : "No pudimos cargar tu dashboard móvil."
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [accessToken, refreshSession])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  const summaryCards = useMemo(() => {
    const assets = bundle?.assets ?? []
    const debts = bundle?.debts ?? []

    return [
      { label: "Activos", value: currencyFormatter.format(dashboardCalculations.totalAssets(assets)) },
      { label: "Pasivos", value: currencyFormatter.format(dashboardCalculations.totalDebts(debts)) },
      { label: "Patrimonio", value: currencyFormatter.format(dashboardCalculations.patrimony(assets, debts)) },
    ]
  }, [bundle])

  const monthlyIncome = useMemo(
    () => currencyFormatter.format(dashboardCalculations.monthlyIncome(bundle?.incomes ?? [])),
    [bundle],
  )
  const monthlyExpenses = useMemo(
    () => currencyFormatter.format(dashboardCalculations.monthlyExpenses(bundle?.expenses ?? [])),
    [bundle],
  )

  const insights = useMemo(() => {
    if (!bundle) return null
    return buildDashboardInsights(bundle)
  }, [bundle])

  const unreadReminders = useMemo(() => reminderItems.filter((item) => !item.read), [reminderItems])

  const handleMarkRemindersRead = useCallback(async () => {
    const updated = await reminders.markAllAsRead()
    setReminderItems(updated)
  }, [])

  return (
    <AppScreen scroll>
      <Text style={styles.title}>Hola, {user?.name || "usuario"}</Text>
      <Text style={styles.description}>Resumen rápido para control financiero diario.</Text>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.gold600} />
          <Text style={styles.stateText}>Cargando dashboard...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>No pudimos cargar la información</Text>
          <Text style={styles.errorText}>{error}</Text>
          <PrimaryButton label="Reintentar" onPress={() => void loadDashboard()} />
        </View>
      ) : (
        <>
          <View style={styles.grid}>
            {summaryCards.map((card) => (
              <View key={card.label} style={styles.card}>
                <Text style={styles.cardLabel}>{card.label}</Text>
                <Text style={styles.cardValue}>{card.value}</Text>
              </View>
            ))}
          </View>

          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>Mes actual</Text>
            <Text style={styles.metricLabel}>Ingresos</Text>
            <Text style={styles.metricValue}>{monthlyIncome}</Text>
            <Text style={styles.metricLabel}>Gastos programados</Text>
            <Text style={styles.metricValue}>{monthlyExpenses}</Text>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Actividad</Text>
            <Text style={styles.sectionItem}>- Activos registrados: {bundle?.assets.length ?? 0}</Text>
            <Text style={styles.sectionItem}>- Deudas registradas: {bundle?.debts.length ?? 0}</Text>
            <Text style={styles.sectionItem}>- Gastos registrados: {bundle?.expenses.length ?? 0}</Text>
            <Text style={styles.sectionItem}>- Ingresos registrados: {bundle?.incomes.length ?? 0}</Text>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Recordatorios</Text>
            {reminderItems.length === 0 ? (
              <Text style={styles.sectionItem}>- Sin pagos próximos para los próximos 10 días.</Text>
            ) : (
              <>
                <Text style={styles.sectionItem}>- Pendientes: {unreadReminders.length}</Text>
                {reminderItems.slice(0, 4).map((item) => (
                  <Text key={item.id} style={styles.sectionItem}>
                    - {item.title} ({new Date(item.dueDate).toLocaleDateString("es-CO")})
                  </Text>
                ))}
                <PrimaryButton label="Marcar recordatorios leídos" onPress={() => void handleMarkRemindersRead()} />
              </>
            )}
          </View>

          {insights ? (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Reporte avanzado</Text>
              <Text style={styles.sectionItem}>- Flujo neto mensual: {currencyFormatter.format(insights.monthlyNet)}</Text>
              <Text style={styles.sectionItem}>
                - Presión de deuda mensual: {currencyFormatter.format(insights.debtPressure)}
              </Text>
              {insights.topExpenseCategories.length > 0 ? (
                <>
                  <Text style={styles.sectionItem}>- Top gastos:</Text>
                  {insights.topExpenseCategories.map((entry) => (
                    <Text key={entry.category} style={styles.sectionSubItem}>
                      • {entry.category}: {currencyFormatter.format(entry.total)}
                    </Text>
                  ))}
                </>
              ) : null}
            </View>
          ) : null}

          <Pressable onPress={() => void signOut()} style={styles.signOutLink}>
            <Text style={styles.signOutText}>Cerrar sesión</Text>
          </Pressable>
        </>
      )}
    </AppScreen>
  )
}

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.navy900,
  },
  description: {
    color: colors.mutedText,
    fontSize: 14,
  },
  centerState: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.ivory,
    padding: 20,
    alignItems: "center",
    gap: 10,
  },
  stateText: {
    color: colors.navy700,
    fontSize: 14,
  },
  grid: {
    gap: 10,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.ivory,
    padding: 14,
  },
  cardLabel: {
    color: colors.navy500,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  cardValue: {
    color: colors.navy900,
    fontWeight: "700",
    fontSize: 22,
    marginTop: 4,
  },
  notice: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#f2ddb9",
    backgroundColor: "#fff8ed",
    padding: 14,
    gap: 6,
  },
  noticeTitle: {
    color: colors.navy900,
    fontWeight: "700",
    fontSize: 16,
  },
  noticeText: {
    color: colors.navy700,
    fontSize: 13,
    lineHeight: 20,
  },
  metricLabel: {
    color: colors.navy500,
    fontSize: 12,
    marginTop: 4,
  },
  metricValue: {
    color: colors.navy900,
    fontSize: 18,
    fontWeight: "700",
  },
  errorCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#efc9c4",
    backgroundColor: "#fff3f1",
    padding: 16,
    gap: 10,
  },
  errorTitle: {
    color: colors.navy900,
    fontWeight: "700",
    fontSize: 16,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 18,
  },
  sectionCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.ivory,
    padding: 14,
    gap: 8,
  },
  sectionTitle: {
    color: colors.navy900,
    fontWeight: "700",
    fontSize: 17,
  },
  sectionItem: {
    color: colors.navy700,
    fontSize: 14,
  },
  sectionSubItem: {
    color: colors.navy500,
    fontSize: 13,
    marginLeft: 4,
  },
  signOutLink: {
    paddingVertical: 8,
    alignSelf: "center",
  },
  signOutText: {
    color: colors.gold600,
    fontWeight: "700",
  },
})