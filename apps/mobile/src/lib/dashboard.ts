import { authRequest, type AuthRequestOptions } from "@/lib/auth-request"
import { cacheStore } from "@/lib/cache-store"
import type { Asset, DashboardBundle, Debt, Expense, Income } from "@/lib/types"

export const fetchDashboardBundle = async (auth: AuthRequestOptions): Promise<DashboardBundle> => {
  try {
    const [incomes, expenses, debts, assets] = await Promise.all([
      authRequest<Income[]>("/incomes", auth),
      authRequest<Expense[]>("/expenses", auth),
      authRequest<Debt[]>("/debts", auth),
      authRequest<Asset[]>("/assets", auth),
    ])

    const bundle = { incomes, expenses, debts, assets }
    await cacheStore.set("dashboard_bundle", bundle)
    return bundle
  } catch (error) {
    const cached = await cacheStore.get<DashboardBundle>("dashboard_bundle")
    if (cached?.value) {
      return cached.value
    }
    throw error
  }
}

export const dashboardCalculations = {
  totalAssets(assets: Asset[]) {
    return assets.reduce((sum, asset) => sum + asset.current_balance, 0)
  },

  totalDebts(debts: Debt[]) {
    return debts.filter((debt) => debt.status === "active").reduce((sum, debt) => sum + debt.current_balance, 0)
  },

  patrimony(assets: Asset[], debts: Debt[]) {
    return this.totalAssets(assets) - this.totalDebts(debts)
  },

  monthlyIncome(incomes: Income[]) {
    const now = new Date()
    return incomes
      .filter((income) => income.year === now.getFullYear() && income.month === now.getMonth() + 1)
      .reduce((sum, income) => sum + income.amount, 0)
  },

  monthlyExpenses(expenses: Expense[]) {
    const now = new Date()
    return expenses
      .filter((expense) => {
        const [year, month] = expense.payment_date.split("-").map(Number)
        return year === now.getFullYear() && month === now.getMonth() + 1
      })
      .reduce((sum, expense) => sum + expense.amount, 0)
  },
}