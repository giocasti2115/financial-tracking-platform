import { StyleSheet, Text, View } from "react-native"
import { AppScreen } from "@/components/ui/app-screen"
import { colors } from "@/theme/colors"

const cards = [
  { label: "Activos", value: "$0" },
  { label: "Pasivos", value: "$0" },
  { label: "Patrimonio", value: "$0" },
]

export default function DashboardScreen() {
  return (
    <AppScreen>
      <Text style={styles.title}>Dashboard móvil</Text>
      <Text style={styles.description}>Resumen rápido para control financiero diario.</Text>

      <View style={styles.grid}>
        {cards.map((card) => (
          <View key={card.label} style={styles.card}>
            <Text style={styles.cardLabel}>{card.label}</Text>
            <Text style={styles.cardValue}>{card.value}</Text>
          </View>
        ))}
      </View>

      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>Sprint 1 activo</Text>
        <Text style={styles.noticeText}>
          Ya tenemos autenticación, navegación base y branding móvil. En Sprint 2 conectamos módulos de gastos y deudas.
        </Text>
      </View>
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
})