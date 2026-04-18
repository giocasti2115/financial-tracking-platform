import { StyleSheet, Text, View } from "react-native"
import { AppScreen } from "@/components/ui/app-screen"
import { colors } from "@/theme/colors"

export default function ExpensesScreen() {
  return (
    <AppScreen>
      <Text style={styles.title}>Gastos</Text>
      <View style={styles.card}>
        <Text style={styles.text}>En Sprint 2 conectaremos listado, filtros y registro de gastos desde el API.</Text>
      </View>
    </AppScreen>
  )
}

const styles = StyleSheet.create({
  title: { color: colors.navy900, fontSize: 26, fontWeight: "700" },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.ivory,
    padding: 14,
  },
  text: { color: colors.navy700, fontSize: 14, lineHeight: 20 },
})