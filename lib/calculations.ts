import type { Expense, Debt, Asset, Income, FinancialSummary, QuincenalSummary } from "./types"

export const calculations = {
  // Calculate total income for a specific period
  calculateTotalIncome(income: Income[], year: number, month?: number): number {
    return income
      .filter((i) => i.year === year && (month === undefined || i.month === month))
      .reduce((sum, i) => sum + i.amount, 0)
  },

  // Calculate total expenses for a specific period
  calculateTotalExpenses(expenses: Expense[], year: number, semester?: number): number {
    return expenses
      .filter((e) => e.year === year && (semester === undefined || e.semester === semester))
      .reduce((sum, e) => sum + e.amount, 0)
  },

  // Calculate total active debts
  calculateTotalDebts(debts: Debt[]): number {
    return debts.filter((d) => d.status === "active").reduce((sum, d) => sum + d.current_balance, 0)
  },

  // Calculate total assets
  calculateTotalAssets(assets: Asset[]): number {
    return assets.reduce((sum, a) => sum + a.current_balance, 0)
  },

  // Calculate patrimony (Assets - Liabilities)
  calculatePatrimony(assets: Asset[], debts: Debt[]): number {
    const totalAssets = this.calculateTotalAssets(assets)
    const totalDebts = this.calculateTotalDebts(debts)
    return totalAssets - totalDebts
  },

  // Calculate available funds for a quincenal period
  calculateQuincenalAvailable(
    income: Income[],
    expenses: Expense[],
    year: number,
    month: number,
    period: "primera_quincena" | "segunda_quincena",
  ): number {
    const paymentDate = period === "primera_quincena" ? 15 : 30
    const periodIncome = income
      .filter((i) => i.year === year && i.month === month && i.payment_date === paymentDate)
      .reduce((sum, i) => sum + i.amount, 0)

    const paidExpenses = expenses
      .filter((e) => e.year === year && e.payment_period === period)
      .reduce((sum, e) => sum + (e.amount_paid || 0), 0)

    return periodIncome - paidExpenses
  },

  // Get quincenal summary
  getQuincenalSummary(
    income: Income[],
    expenses: Expense[],
    year: number,
    month: number,
    period: "primera_quincena" | "segunda_quincena",
  ): QuincenalSummary {
    const paymentDate = period === "primera_quincena" ? 15 : 30
    const periodIncome = income
      .filter((i) => i.year === year && i.month === month && i.payment_date === paymentDate)
      .reduce((sum, i) => sum + i.amount, 0)

    // Filter expenses by year, month (from payment_date), and payment_period
    const periodExpenses = expenses.filter((e) => {
      if (e.year !== year || e.payment_period !== period) return false

      // Extract month from payment_date (format: YYYY-MM-DD)
      const expenseDate = new Date(e.payment_date)
      const expenseMonth = expenseDate.getMonth() + 1 // getMonth() returns 0-11

      return expenseMonth === month
    })

    const totalExpenses = periodExpenses.reduce((sum, e) => sum + e.amount, 0)
    const paidExpenses = periodExpenses.reduce((sum, e) => sum + (e.amount_paid || 0), 0)

    return {
      period,
      month,
      year,
      total_income: periodIncome,
      total_expenses: totalExpenses,
      paid_expenses: paidExpenses,
      pending_expenses: totalExpenses - paidExpenses,
      available: periodIncome - paidExpenses,
      expenses: periodExpenses,
    }
  },

  // Calculate months until debt is paid off
  calculateMonthsUntilPaidOff(debt: Debt): number | null {
    if (!debt.monthly_payment || debt.monthly_payment <= 0) return null
    return Math.ceil(debt.current_balance / debt.monthly_payment)
  },

  // Get financial summary
  getFinancialSummary(income: Income[], expenses: Expense[], debts: Debt[], assets: Asset[]): FinancialSummary {
    const currentYear = new Date().getFullYear()
    const currentMonth = new Date().getMonth() + 1

    return {
      total_income: this.calculateTotalIncome(income, currentYear, currentMonth),
      total_expenses: this.calculateTotalExpenses(expenses, currentYear),
      total_debts: this.calculateTotalDebts(debts),
      total_assets: this.calculateTotalAssets(assets),
      patrimony: this.calculatePatrimony(assets, debts),
      available_funds: 0, // Will be calculated based on current quincenal period
    }
  },
}
