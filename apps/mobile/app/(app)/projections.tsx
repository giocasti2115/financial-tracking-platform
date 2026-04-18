import { StyleSheet, Text, View } from "react-native"
import { AppScreen } from "@/components/ui/app-screen"
import { colors } from "@/theme/colors"

export default function ProjectionsScreen() {
  return (
    <AppScreen>
      <Text style={styles.title}>Proyecciones</Text>
      <View style={styles.card}>
        <Text style={styles.text}>El simulador de crédito y reportes se adaptarán para mobile en Sprint 2 y 3.</Text>
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