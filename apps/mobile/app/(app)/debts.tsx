import { StyleSheet, Text, View } from "react-native"
import { AppScreen } from "@/components/ui/app-screen"
import { colors } from "@/theme/colors"

export default function DebtsScreen() {
  return (
    <AppScreen>
      <Text style={styles.title}>Deudas</Text>
      <View style={styles.card}>
        <Text style={styles.text}>Aquí integraremos el control de pasivos y registro de pagos en la siguiente iteración.</Text>
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