import { useState } from "react"
import { Link, router } from "expo-router"
import { StyleSheet, Text, View } from "react-native"
import { AppScreen } from "@/components/ui/app-screen"
import { AppInput } from "@/components/ui/app-input"
import { PrimaryButton } from "@/components/ui/primary-button"
import { useAuth } from "@/providers/auth-provider"
import { colors } from "@/theme/colors"
import { ApiError } from "@/lib/api-client"

export default function RegisterScreen() {
  const { signUp } = useAuth()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleRegister = async () => {
    setError(null)
    setLoading(true)
    try {
      await signUp(name, email, password)
      router.replace("/(app)/dashboard")
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos crear tu cuenta.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppScreen scroll>
      <View style={styles.container}>
        <Text style={styles.brand}>Aurea Finanzas</Text>
        <Text style={styles.subtitle}>Crea tu cuenta para comenzar</Text>

        <View style={styles.card}>
          <Text style={styles.title}>Registro</Text>

          <AppInput label="Nombre" value={name} onChangeText={setName} />
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

          <PrimaryButton
            label="Crear cuenta"
            onPress={handleRegister}
            loading={loading}
            disabled={!name || !email || password.length < 6}
          />

          <Link href="/(auth)/login" style={styles.link}>
            Ya tengo cuenta
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