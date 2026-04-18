import { StyleSheet, Text, View } from "react-native"
import { AppScreen } from "@/components/ui/app-screen"
import { PrimaryButton } from "@/components/ui/primary-button"
import { useAuth } from "@/providers/auth-provider"
import { colors } from "@/theme/colors"
import { appConfig } from "@/lib/config"

export default function ProfileScreen() {
  const { user, signOut } = useAuth()

  return (
    <AppScreen>
      <Text style={styles.title}>Perfil</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Usuario</Text>
        <Text style={styles.value}>{user?.name || "Sin nombre"}</Text>

        <Text style={styles.label}>Correo</Text>
        <Text style={styles.value}>{user?.email || "-"}</Text>

        <Text style={styles.label}>Entorno</Text>
        <Text style={styles.env}>{appConfig.env.toUpperCase()}</Text>
      </View>

      <PrimaryButton label="Cerrar sesión" onPress={() => void signOut()} />
    </AppScreen>
  )
}

const styles = StyleSheet.create({
  title: {
    color: colors.navy900,
    fontSize: 26,
    fontWeight: "700",
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.ivory,
    padding: 14,
    gap: 6,
  },
  label: {
    color: colors.mutedText,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 8,
  },
  value: {
    color: colors.navy900,
    fontSize: 16,
    fontWeight: "600",
  },
  env: {
    color: colors.gold600,
    fontWeight: "700",
    fontSize: 15,
  },
})