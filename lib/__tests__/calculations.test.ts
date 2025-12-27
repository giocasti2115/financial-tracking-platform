import { describe, expect, it } from "vitest"
import { calculations } from "../calculations"
import type { Asset, Debt } from "../types"

const buildDebt = (overrides: Partial<Debt> = {}): Debt => ({
  id: overrides.id ?? "debt-id",
  user_id: overrides.user_id ?? "user-1",
  debt_type: overrides.debt_type ?? "credito",
  entity_name: overrides.entity_name ?? "Banco",
  original_amount: overrides.original_amount ?? 10_000,
  current_balance: overrides.current_balance ?? 5_000,
  status: overrides.status ?? "active",
  created_at: overrides.created_at ?? new Date().toISOString(),
  updated_at: overrides.updated_at ?? new Date().toISOString(),
  monthly_payment: overrides.monthly_payment,
  payment_day: overrides.payment_day,
  start_date: overrides.start_date,
  end_date: overrides.end_date,
  interest_rate: overrides.interest_rate,
  notes: overrides.notes,
})

const buildAsset = (overrides: Partial<Asset> = {}): Asset => ({
  id: overrides.id ?? "asset-id",
  user_id: overrides.user_id ?? "user-1",
  account_name: overrides.account_name ?? "Cuenta",
  account_type: overrides.account_type ?? "savings",
  current_balance: overrides.current_balance ?? 8_000,
  last_updated: overrides.last_updated ?? new Date().toISOString(),
  created_at: overrides.created_at ?? new Date().toISOString(),
  updated_at: overrides.updated_at ?? new Date().toISOString(),
  notes: overrides.notes,
  currency_code: overrides.currency_code,
})

describe("calculations", () => {
  it("calculates patrimony using assets minus active debts", () => {
    const assets: Asset[] = [buildAsset({ current_balance: 10_000 }), buildAsset({ current_balance: 5_000 })]
    const debts: Debt[] = [
      buildDebt({ current_balance: 4_000, status: "active" }),
      buildDebt({ current_balance: 2_000, status: "paid" }),
    ]

    const result = calculations.calculatePatrimony(assets, debts)

    // total assets 15k - active debts 4k = 11k
    expect(result).toBe(11_000)
  })

  it("estimates months until payoff rounding up and ignoring missing payments", () => {
    const debtWithPlan = buildDebt({ current_balance: 9_500, monthly_payment: 1_000 })
    const debtWithoutPlan = buildDebt({ monthly_payment: undefined })

    expect(calculations.calculateMonthsUntilPaidOff(debtWithPlan)).toBe(10)
    expect(calculations.calculateMonthsUntilPaidOff(debtWithoutPlan)).toBeNull()
  })
})
