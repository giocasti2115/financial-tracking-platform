import type { DashboardBundle } from "@/lib/types"

export type DashboardInsights = {
  monthlyNet: number
  topExpenseCategories: Array<{ category: string; total: number }>
  debtPressure: number
}

export const buildDashboardInsights = (bundle: DashboardBundle): DashboardInsights => {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  const monthlyIncome = bundle.incomes
    .filter((income) => income.month === month && income.year === year)
    .reduce((sum, income) => sum + income.amount, 0)

  const monthlyExpenses = bundle.expenses
    .filter((expense) => {
      const [y, m] = expense.payment_date.split("-").map(Number)
      return y === year && m === month
    })
    .reduce((sum, expense) => sum + expense.amount, 0)

  const activeDebts = bundle.debts.filter((debt) => debt.status === "active")
  const debtPressure = activeDebts.reduce((sum, debt) => sum + (debt.monthly_payment ?? 0), 0)

  const categoryMap = new Map<string, number>()
  for (const expense of bundle.expenses) {
    const current = categoryMap.get(expense.description) ?? 0
    categoryMap.set(expense.description, current + expense.amount)
  }

  const topExpenseCategories = [...categoryMap.entries()]
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 3)

  return {
    monthlyNet: monthlyIncome - monthlyExpenses - debtPressure,
    topExpenseCategories,
    debtPressure,
  }
}