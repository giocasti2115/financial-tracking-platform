/**
 * Planes de Áurea.
 *
 * El despliegue web no bloquea a nadie salvo que se configuren las dos
 * variables públicas a la vez:
 *
 * - NEXT_PUBLIC_ENTITLEMENTS_MODE=enforce
 * - NEXT_PUBLIC_DEFAULT_PLAN=free
 *
 * Sin esas variables el modo es "open": isPremium() es true para todos.
 * El plan guardado en el dispositivo solo se consulta en modo "enforce".
 * No hay compra real aquí; persistPlan() queda para un adaptador (RevenueCat)
 * que todavía no se conecta.
 */

export const PLAN_STORAGE_KEY = "aurea_plan_tier"

export type PlanTier = "free" | "premium"
export type EntitlementMode = "open" | "enforce"

export const FEATURE_CATALOG = {
  income: { tier: "free", label: "Ingresos" },
  expenses: { tier: "free", label: "Gastos" },
  assets: { tier: "free", label: "Activos" },
  debts: { tier: "premium", label: "Deudas y amortización" },
  patrimony: { tier: "premium", label: "Patrimonio" },
  quincena: { tier: "premium", label: "Resumen de quincena" },
  projections: { tier: "premium", label: "Proyecciones" },
  exportData: { tier: "premium", label: "Exportación" },
  recurringClone: { tier: "premium", label: "Clonado de gastos" },
  reminders: { tier: "premium", label: "Recordatorios" },
  microExpenses: { tier: "premium", label: "Gastos hormiga" },
} as const

export type FeatureId = keyof typeof FEATURE_CATALOG

type ResolveOptions = {
  /** En el primer render no se lee localStorage, para no desalinear el HTML. */
  includeStored?: boolean
}

const isPlanTier = (value: string | null | undefined): value is PlanTier =>
  value === "free" || value === "premium"

export function getEntitlementMode(): EntitlementMode {
  return process.env.NEXT_PUBLIC_ENTITLEMENTS_MODE === "enforce" ? "enforce" : "open"
}

export function getDefaultPlan(): PlanTier {
  return process.env.NEXT_PUBLIC_DEFAULT_PLAN === "free" ? "free" : "premium"
}

export function readStoredPlan(): PlanTier | null {
  if (typeof localStorage === "undefined") return null

  try {
    const stored = localStorage.getItem(PLAN_STORAGE_KEY)
    return isPlanTier(stored) ? stored : null
  } catch {
    return null
  }
}

export function persistPlan(plan: PlanTier): void {
  if (typeof localStorage === "undefined") return

  try {
    localStorage.setItem(PLAN_STORAGE_KEY, plan)
  } catch {
    // El plan en memoria sigue vigente para esta sesión de cálculo.
  }
}

export function resolvePlan(options: ResolveOptions = {}): PlanTier {
  if (getEntitlementMode() === "open") {
    return "premium"
  }

  if (options.includeStored !== false) {
    const stored = readStoredPlan()
    if (stored) return stored
  }

  return getDefaultPlan()
}

export function isPremium(options: ResolveOptions = {}): boolean {
  return resolvePlan(options) === "premium"
}

export function canAccess(feature: FeatureId, options: ResolveOptions = {}): boolean {
  const requiredTier = FEATURE_CATALOG[feature].tier
  if (requiredTier === "free") return true
  return isPremium(options)
}

export function featureLabel(feature: FeatureId): string {
  return FEATURE_CATALOG[feature].label
}
