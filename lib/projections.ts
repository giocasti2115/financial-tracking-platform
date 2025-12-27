import type { Debt, Expense, Income } from "./types"

export interface DebtProjection {
  debt_id: string
  entity_name: string
  month: number
  year: number
  projected_payment: number
  projected_balance: number
  is_final_payment: boolean
}

export interface MonthlyProjection {
  month: number
  year: number
  total_income: number
  total_expenses: number
  total_debt_payments: number
  available: number
  debt_projections: DebtProjection[]
}

export const projections = {
  // Generate debt payment projections for the next N months
  generateDebtProjections(debts: Debt[], months = 12): DebtProjection[] {
    const projections: DebtProjection[] = []
    const currentDate = new Date()

    debts
      .filter((d) => d.status === "active" && d.monthly_payment && d.monthly_payment > 0)
      .forEach((debt) => {
        let remainingBalance = debt.current_balance
        let monthOffset = 0

        while (remainingBalance > 0 && monthOffset < months) {
          const projectionDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + monthOffset, 1)
          const payment = Math.min(debt.monthly_payment!, remainingBalance)
          remainingBalance -= payment

          projections.push({
            debt_id: debt.id,
            entity_name: debt.entity_name,
            month: projectionDate.getMonth() + 1,
            year: projectionDate.getFullYear(),
            projected_payment: payment,
            projected_balance: Math.max(0, remainingBalance),
            is_final_payment: remainingBalance <= 0,
          })

          monthOffset++
        }
      })

    return projections.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year
      if (a.month !== b.month) return a.month - b.month
      return a.entity_name.localeCompare(b.entity_name)
    })
  },

  // Generate monthly financial projections
  generateMonthlyProjections(income: Income[], expenses: Expense[], debts: Debt[], months = 12): MonthlyProjection[] {
    const projections: MonthlyProjection[] = []
    const currentDate = new Date()
    const debtProjections = this.generateDebtProjections(debts, months)

    for (let i = 0; i < months; i++) {
      const projectionDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1)
      const month = projectionDate.getMonth() + 1
      const year = projectionDate.getFullYear()

      // Calculate average monthly income (simplified)
      const avgMonthlyIncome =
        income.length > 0 ? income.reduce((sum, inc) => sum + inc.amount, 0) / Math.max(income.length / 12, 1) : 0

      // Calculate average monthly expenses (simplified)
      const avgMonthlyExpenses =
        expenses.length > 0 ? expenses.reduce((sum, exp) => sum + exp.amount, 0) / Math.max(expenses.length / 12, 1) : 0

      // Get debt payments for this month
      const monthDebtProjections = debtProjections.filter((dp) => dp.month === month && dp.year === year)
      const totalDebtPayments = monthDebtProjections.reduce((sum, dp) => sum + dp.projected_payment, 0)

      projections.push({
        month,
        year,
        total_income: avgMonthlyIncome,
        total_expenses: avgMonthlyExpenses,
        total_debt_payments: totalDebtPayments,
        available: avgMonthlyIncome - avgMonthlyExpenses - totalDebtPayments,
        debt_projections: monthDebtProjections,
      })
    }

    return projections
  },

  // Calculate when all debts will be paid off
  calculateDebtFreeDate(debts: Debt[]): Date | null {
    const activeDebts = debts.filter((d) => d.status === "active" && d.monthly_payment && d.monthly_payment > 0)

    if (activeDebts.length === 0) return null

    const monthsToPayOff = activeDebts.map((debt) => Math.ceil(debt.current_balance / debt.monthly_payment!))

    const maxMonths = Math.max(...monthsToPayOff)
    const debtFreeDate = new Date()
    debtFreeDate.setMonth(debtFreeDate.getMonth() + maxMonths)

    return debtFreeDate
  },

  // Generate expense report by category
  generateExpenseReport(expenses: Expense[], year: number, semester?: number) {
    const filtered = expenses.filter((e) => e.year === year && (semester === undefined || e.semester === semester))

    const byCategory = filtered.reduce(
      (acc, expense) => {
        const category = expense.description
        if (!acc[category]) {
          acc[category] = { total: 0, count: 0 }
        }
        acc[category].total += expense.amount
        acc[category].count += 1
        return acc
      },
      {} as Record<string, { total: number; count: number }>,
    )

    return Object.entries(byCategory)
      .map(([category, data]) => ({
        category,
        total: data.total,
        count: data.count,
        average: data.total / data.count,
      }))
      .sort((a, b) => b.total - a.total)
  },
}
