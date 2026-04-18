import { useState } from "react"
import { Link, router } from "expo-router"
import { StyleSheet, Text, View } from "react-native"
import { AppScreen } from "@/components/ui/app-screen"
import { AppInput } from "@/components/ui/app-input"
import { PrimaryButton } from "@/components/ui/primary-button"
import { useAuth } from "@/providers/auth-provider"
import { colors } from "@/theme/colors"
import { ApiError } from "@/lib/api-client"

export default function LoginScreen() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setError(null)
    setLoading(true)
    try {
      await signIn(email, password)
      router.replace("/(app)/dashboard")
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos iniciar sesión.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppScreen scroll>
      <View style={styles.container}>
        <Text style={styles.brand}>Aurea Finanzas</Text>
        <Text style={styles.subtitle}>Haz de cada quincena tu mejor inversión</Text>

        <View style={styles.card}>
          <Text style={styles.title}>Inicia sesión</Text>
          <Text style={styles.description}>Accede a tu control financiero quincenal.</Text>

          <AppInput
            label="Correo"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <AppInput
            label="Contraseña"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <PrimaryButton label="Ingresar" onPress={handleLogin} loading={loading} disabled={!email || !password} />

          <Link href="/(auth)/register" style={styles.link}>
            Crear cuenta
          </Link>
        </View>
      </View>
    </AppScreen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    gap: 16,
    paddingVertical: 24,
  },
  brand: {
    textAlign: "center",
    color: colors.navy900,
    fontWeight: "700",
    fontSize: 30,
  },
  subtitle: {
    textAlign: "center",
    color: colors.navy500,
    fontSize: 15,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.ivory,
    padding: 16,
    gap: 14,
  },
  title: {
    color: colors.navy900,
    fontWeight: "700",
    fontSize: 22,
  },
  description: {
    color: colors.mutedText,
    fontSize: 14,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
  },
  link: {
    color: colors.gold600,
    textAlign: "center",
    fontWeight: "600",
  },
})