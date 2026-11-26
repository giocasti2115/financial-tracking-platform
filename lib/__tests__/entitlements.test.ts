import { afterEach, describe, expect, it } from "vitest"
import {
  PLAN_STORAGE_KEY,
  canAccess,
  getDefaultPlan,
  getEntitlementMode,
  isPremium,
  persistPlan,
  resolvePlan,
} from "../entitlements"

const modeKey = "NEXT_PUBLIC_ENTITLEMENTS_MODE"
const planKey = "NEXT_PUBLIC_DEFAULT_PLAN"

const restoreEnv = (key: string, value: string | undefined) => {
  if (value === undefined) {
    delete process.env[key]
  } else {
    process.env[key] = value
  }
}

const originalMode = process.env[modeKey]
const originalPlan = process.env[planKey]

afterEach(() => {
  restoreEnv(modeKey, originalMode)
  restoreEnv(planKey, originalPlan)
  delete (globalThis as { localStorage?: Storage }).localStorage
})

describe("entitlements", () => {
  it("keeps every feature open when the mode is unset", () => {
    delete process.env[modeKey]
    delete process.env[planKey]

    expect(getEntitlementMode()).toBe("open")
    expect(getDefaultPlan()).toBe("premium")
    expect(isPremium()).toBe(true)
    expect(canAccess("expenses")).toBe(true)
    expect(canAccess("debts")).toBe(true)
    expect(canAccess("projections")).toBe(true)
    expect(canAccess("microExpenses")).toBe(true)
  })

  it("ignores a stored free plan while the mode stays open", () => {
    delete process.env[modeKey]
    const memory = new Map<string, string>([[PLAN_STORAGE_KEY, "free"]])
    globalThis.localStorage = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value)
      },
      removeItem: (key: string) => {
        memory.delete(key)
      },
      clear: () => memory.clear(),
      key: () => null,
      length: memory.size,
    } as Storage

    expect(resolvePlan()).toBe("premium")
    expect(canAccess("debts")).toBe(true)
  })

  it("locks premium features only when enforcement and the free fallback are both set", () => {
    process.env[modeKey] = "enforce"
    process.env[planKey] = "free"

    expect(isPremium({ includeStored: false })).toBe(false)
    expect(canAccess("income", { includeStored: false })).toBe(true)
    expect(canAccess("expenses", { includeStored: false })).toBe(true)
    expect(canAccess("assets", { includeStored: false })).toBe(true)
    expect(canAccess("debts", { includeStored: false })).toBe(false)
    expect(canAccess("patrimony", { includeStored: false })).toBe(false)
    expect(canAccess("quincena", { includeStored: false })).toBe(false)
    expect(canAccess("recurringClone", { includeStored: false })).toBe(false)
    expect(canAccess("exportData", { includeStored: false })).toBe(false)
    expect(canAccess("reminders", { includeStored: false })).toBe(false)
  })

  it("keeps premium as the fallback when enforcement is on but the default plan is unset", () => {
    process.env[modeKey] = "enforce"
    delete process.env[planKey]

    expect(getDefaultPlan()).toBe("premium")
    expect(isPremium({ includeStored: false })).toBe(true)
  })

  it("uses a stored premium plan in enforce mode", () => {
    process.env[modeKey] = "enforce"
    process.env[planKey] = "free"
    const memory = new Map<string, string>()
    globalThis.localStorage = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value)
      },
      removeItem: (key: string) => {
        memory.delete(key)
      },
      clear: () => memory.clear(),
      key: () => null,
      length: 0,
    } as Storage

    expect(isPremium()).toBe(false)
    persistPlan("premium")
    expect(memory.get(PLAN_STORAGE_KEY)).toBe("premium")
    expect(isPremium()).toBe(true)
    expect(canAccess("projections")).toBe(true)
  })
})
