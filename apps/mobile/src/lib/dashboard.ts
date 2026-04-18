import { ApiError, apiRequest } from "@/lib/api-client"
import type { Asset, DashboardBundle, Debt, Expense, Income } from "@/lib/types"

type AuthOptions = {
  accessToken: string | null
  refreshSession: () => Promise<string | null>
}

const requestWithRefresh = async <T>(path: string, auth: AuthOptions): Promise<T> => {
  try {
    return await apiRequest<T>(path, { token: auth.accessToken })
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      const nextToken = await auth.refreshSession()
      if (nextToken) {
        return apiRequest<T>(path, { token: nextToken })
      }
    }
    throw error
  }
}

export const fetchDashboardBundle = async (auth: AuthOptions): Promise<DashboardBundle> => {
  const [incomes, expenses, debts, assets] = await Promise.all([
    requestWithRefresh<Income[]>("/incomes", auth),
    requestWithRefresh<Expense[]>("/expenses", auth),
    requestWithRefresh<Debt[]>("/debts", auth),
    requestWithRefresh<Asset[]>("/assets", auth),
  ])

  return { incomes, expenses, debts, assets }
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