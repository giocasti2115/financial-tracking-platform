import * as SecureStore from "expo-secure-store"

export type PlanTier = "free" | "plus" | "pro"

const PLAN_KEY = "aurea_mobile_plan_tier"

export const monetization = {
  plans: [
    { id: "free" as const, name: "Free", monthlyPrice: 0, features: ["Módulos base", "Dashboard", "Reportes simples"] },
    { id: "plus" as const, name: "Plus", monthlyPrice: 14900, features: ["Sin anuncios", "Reportes avanzados", "Alertas prioritarias"] },
    { id: "pro" as const, name: "Pro", monthlyPrice: 29900, features: ["Todo Plus", "Proyecciones premium", "Soporte prioritario"] },
  ],

  async getCurrentPlan(): Promise<PlanTier> {
    try {
      const stored = await SecureStore.getItemAsync(PLAN_KEY)
      if (stored === "plus" || stored === "pro") return stored
      return "free"
    } catch {
      return "free"
    }
  },

  async setCurrentPlan(plan: PlanTier) {
    await SecureStore.setItemAsync(PLAN_KEY, plan)
  },
}