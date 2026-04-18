import { useEffect, useState } from "react"
import * as SecureStore from "expo-secure-store"
import { Pressable, StyleSheet, Switch, Text, View } from "react-native"
import { AppScreen } from "@/components/ui/app-screen"
import { AppInput } from "@/components/ui/app-input"
import { PrimaryButton } from "@/components/ui/primary-button"
import { useAuth } from "@/providers/auth-provider"
import { colors } from "@/theme/colors"
import { appConfig } from "@/lib/config"
import { monetization, type PlanTier } from "@/lib/monetization"
import { telemetry, type TelemetryEvent } from "@/lib/telemetry"
import { reminders } from "@/lib/reminders"

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
  const [planTier, setPlanTier] = useState<PlanTier>("free")
  const [events, setEvents] = useState<TelemetryEvent[]>([])
  const [releaseReady, setReleaseReady] = useState(false)

  useEffect(() => {
    setName(user?.name ?? "")
  }, [user?.name])

  useEffect(() => {
    const loadSettings = async () => {
      const [storedReminders, storedBiometric, currentPlan, telemetryEvents, reminderItems] = await Promise.all([
        SecureStore.getItemAsync(SETTINGS_KEYS.paymentReminders),
        SecureStore.getItemAsync(SETTINGS_KEYS.biometricLock),
        monetization.getCurrentPlan(),
        telemetry.list(),
        reminders.list(),
      ])
      setPaymentReminders(storedReminders !== "false")
      setBiometricLock(storedBiometric === "true")
      setPlanTier(currentPlan)
      setEvents(telemetryEvents)
      setReleaseReady(reminderItems.length > 0 && telemetryEvents.filter((event) => event.level === "error").length < 5)
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

  const handleChangePlan = async (plan: PlanTier) => {
    await monetization.setCurrentPlan(plan)
    setPlanTier(plan)
    setInfo(`Plan actualizado a ${plan.toUpperCase()}.`)
  }

  const handleReloadDiagnostics = async () => {
    const telemetryEvents = await telemetry.list()
    setEvents(telemetryEvents)
    setInfo(`Diagnóstico actualizado (${telemetryEvents.length} evento(s)).`)
  }

  const handleClearDiagnostics = async () => {
    await telemetry.clear()
    setEvents([])
    setInfo("Telemetría local limpiada.")
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

      <View style={styles.card}>
        <Text style={styles.settingsTitle}>Monetización (Sprint 3.0)</Text>
        <Text style={styles.settingHint}>Plan actual: {planTier.toUpperCase()}</Text>
        <View style={styles.planRow}>
          {(["free", "plus", "pro"] as PlanTier[]).map((plan) => {
            const active = planTier === plan
            return (
              <Pressable key={plan} onPress={() => void handleChangePlan(plan)} style={[styles.planChip, active && styles.planChipActive]}>
                <Text style={[styles.planChipText, active && styles.planChipTextActive]}>{plan.toUpperCase()}</Text>
              </Pressable>
            )
          })}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.settingsTitle}>Diagnóstico y QA (Sprint 2.2)</Text>
        <Text style={styles.settingHint}>Eventos locales: {events.length}</Text>
        <Text style={styles.settingHint}>Errores recientes: {events.filter((event) => event.level === "error").length}</Text>
        <View style={styles.actionRow}>
          <View style={styles.actionCol}>
            <PrimaryButton label="Recargar" onPress={() => void handleReloadDiagnostics()} />
          </View>
          <View style={styles.actionCol}>
            <PrimaryButton label="Limpiar" onPress={() => void handleClearDiagnostics()} />
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.settingsTitle}>Release Candidate (Sprint 3.1)</Text>
        <Text style={styles.settingHint}>Estado automático: {releaseReady ? "LISTO" : "EN REVISIÓN"}</Text>
        <Text style={styles.settingHint}>Checklist en docs/mobile-release-candidate-checklist.md</Text>
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
  planRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 6,
  },
  planChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cream,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  planChipActive: {
    borderColor: colors.gold500,
    backgroundColor: "#fcefdc",
  },
  planChipText: {
    color: colors.navy700,
    fontSize: 12,
    fontWeight: "700",
  },
  planChipTextActive: {
    color: colors.gold600,
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
  },
  actionCol: {
    flex: 1,
  },
})