import { useEffect, useState } from "react"
import * as SecureStore from "expo-secure-store"
import { Pressable, StyleSheet, Switch, Text, View } from "react-native"
import { AppScreen } from "@/components/ui/app-screen"
import { AppInput } from "@/components/ui/app-input"
import { PrimaryButton } from "@/components/ui/primary-button"
import { useAuth } from "@/providers/auth-provider"
import { colors } from "@/theme/colors"
import { appConfig } from "@/lib/config"

const SETTINGS_KEYS = {
  paymentReminders: "aurea_setting_payment_reminders",
  biometricLock: "aurea_setting_biometric_lock",
} as const

export default function ProfileScreen() {
  const { user, updateProfile, signOut } = useAuth()
  const [name, setName] = useState(user?.name ?? "")
  const [isSaving, setIsSaving] = useState(false)
  const [info, setInfo] = useState<string | null>(null)
  const [paymentReminders, setPaymentReminders] = useState(true)
  const [biometricLock, setBiometricLock] = useState(false)

  useEffect(() => {
    setName(user?.name ?? "")
  }, [user?.name])

  useEffect(() => {
    const loadSettings = async () => {
      const [storedReminders, storedBiometric] = await Promise.all([
        SecureStore.getItemAsync(SETTINGS_KEYS.paymentReminders),
        SecureStore.getItemAsync(SETTINGS_KEYS.biometricLock),
      ])
      setPaymentReminders(storedReminders !== "false")
      setBiometricLock(storedBiometric === "true")
    }
    void loadSettings()
  }, [])

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      setInfo("El nombre no puede quedar vacío.")
      return
    }

    setIsSaving(true)
    setInfo(null)
    try {
      await updateProfile({ name: name.trim() })
      setInfo("Perfil actualizado correctamente.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleReminders = async (value: boolean) => {
    setPaymentReminders(value)
    await SecureStore.setItemAsync(SETTINGS_KEYS.paymentReminders, String(value))
  }

  const handleToggleBiometric = async (value: boolean) => {
    setBiometricLock(value)
    await SecureStore.setItemAsync(SETTINGS_KEYS.biometricLock, String(value))
  }

  return (
    <AppScreen scroll>
      <Text style={styles.title}>Perfil</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Usuario</Text>
        <AppInput label="Nombre" value={name} onChangeText={setName} placeholder="Tu nombre" />
        <PrimaryButton label="Guardar perfil" onPress={() => void handleSaveProfile()} loading={isSaving} />

        <Text style={styles.label}>Correo</Text>
        <Text style={styles.value}>{user?.email || "-"}</Text>

        <Text style={styles.label}>Entorno</Text>
        <Text style={styles.env}>{appConfig.env.toUpperCase()}</Text>

        {info ? <Text style={styles.info}>{info}</Text> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.settingsTitle}>Configuración base</Text>

        <View style={styles.settingRow}>
          <View style={styles.settingTextBlock}>
            <Text style={styles.settingLabel}>Recordatorios de pago</Text>
            <Text style={styles.settingHint}>Notificaciones internas para cuotas próximas.</Text>
          </View>
          <Switch value={paymentReminders} onValueChange={(value) => void handleToggleReminders(value)} />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingTextBlock}>
            <Text style={styles.settingLabel}>Bloqueo biométrico (beta)</Text>
            <Text style={styles.settingHint}>Protege la app al abrir (preparación para siguiente sprint).</Text>
          </View>
          <Switch value={biometricLock} onValueChange={(value) => void handleToggleBiometric(value)} />
        </View>

        <Pressable onPress={() => setInfo("Configuración guardada localmente en este dispositivo.")}>
          <Text style={styles.link}>Ver estado de configuración</Text>
        </Pressable>
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
  info: {
    color: colors.navy700,
    fontSize: 12,
    marginTop: 6,
  },
  settingsTitle: {
    color: colors.navy900,
    fontWeight: "700",
    fontSize: 16,
    marginBottom: 4,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingVertical: 6,
  },
  settingTextBlock: {
    flex: 1,
    gap: 2,
  },
  settingLabel: {
    color: colors.navy900,
    fontSize: 14,
    fontWeight: "600",
  },
  settingHint: {
    color: colors.mutedText,
    fontSize: 12,
  },
  link: {
    color: colors.gold600,
    fontWeight: "700",
    marginTop: 6,
  },
})