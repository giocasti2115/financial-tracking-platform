import { Redirect, Tabs } from "expo-router"
import { useAuth } from "@/providers/auth-provider"
import { colors } from "@/theme/colors"

export default function AppLayout() {
  const { user, loading } = useAuth()

  if (!loading && !user) {
    return <Redirect href="/(auth)/login" />
  }

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.navy900 },
        headerTintColor: colors.ivory,
        tabBarStyle: { backgroundColor: colors.ivory, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.gold600,
        tabBarInactiveTintColor: colors.mutedText,
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: "Dashboard", tabBarLabel: "Inicio" }} />
      <Tabs.Screen name="expenses" options={{ title: "Gastos", tabBarLabel: "Gastos" }} />
      <Tabs.Screen name="debts" options={{ title: "Deudas", tabBarLabel: "Deudas" }} />
      <Tabs.Screen name="projections" options={{ title: "Proyecciones", tabBarLabel: "Proyecciones" }} />
      <Tabs.Screen name="profile" options={{ title: "Perfil", tabBarLabel: "Perfil" }} />
    </Tabs>
  )
}