import type { Expense, Debt, Asset, Income, FinancialSummary, QuincenalSummary } from "./types"

const getDebtFrequency = (debt: Debt) => (debt.payment_frequency === "biweekly" ? "biweekly" : "monthly")

const getPeriodicRate = (debt: Debt) => {
  const baseRate = (debt.interest_rate ?? 0) / 100
  const frequency = getDebtFrequency(debt)
  return frequency === "biweekly" ? baseRate / 2 : baseRate
}

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
    if (!debt.monthly_payment || debt.monthly_payment <= 0 || debt.current_balance <= 0) {
      return null
    }

    const frequency = getDebtFrequency(debt)
    const periodicRate = getPeriodicRate(debt)
    const maxIterations = 600
    let balance = debt.current_balance
    let periods = 0

    while (balance > 1e-2 && periods < maxIterations) {
      const interest = Number((balance * periodicRate).toFixed(2))
      const principalBeforeCap = Math.max(debt.monthly_payment - interest, 0)
      if (principalBeforeCap <= 0) {
        return null
      }
      const principal = Math.min(principalBeforeCap, balance)
      balance = Number((balance - principal).toFixed(2))
      periods += 1
    }

    if (balance > 1e-2) {
      return null
    }

    const monthsEquivalent = frequency === "biweekly" ? periods / 2 : periods
    return Math.max(1, Math.ceil(monthsEquivalent))
  },

  calculateDebtPaymentBreakdown(debt: Debt, customAmount?: number) {
    const paymentAmount = customAmount ?? debt.monthly_payment ?? 0
    if (paymentAmount <= 0 || debt.current_balance <= 0) {
      return null
    }

    const periodicRate = getPeriodicRate(debt)
    const interest = Number((debt.current_balance * periodicRate).toFixed(2))
    const principalBeforeCap = Math.max(paymentAmount - interest, 0)
    const principal = Number(Math.min(principalBeforeCap, debt.current_balance).toFixed(2))
    const nextBalance = Number(Math.max(debt.current_balance - principal, 0).toFixed(2))

    return {
      payment_amount: Number(paymentAmount.toFixed(2)),
      interest_component: Math.min(interest, paymentAmount),
      principal_component: principal,
      next_balance: nextBalance,
      frequency: getDebtFrequency(debt),
    }
  },

  generateAmortizationSchedule(debt: Debt, periods = 6) {
    if (!debt.monthly_payment || debt.monthly_payment <= 0 || debt.current_balance <= 0) {
      return [] as Array<{ period: number; payment: number; interest: number; principal: number; balance: number }>
    }

    const paymentAmount = debt.monthly_payment
    const periodicRate = getPeriodicRate(debt)
    let balance = debt.current_balance
    const schedule: Array<{ period: number; payment: number; interest: number; principal: number; balance: number }> = []

    for (let period = 1; period <= periods && balance > 0; period += 1) {
      const interest = Number((balance * periodicRate).toFixed(2))
      const principalBeforeCap = Math.max(paymentAmount - interest, 0)
      if (principalBeforeCap <= 0 && periodicRate > 0) {
        break
      }
      const principal = Number(Math.min(principalBeforeCap, balance).toFixed(2))
      balance = Number(Math.max(balance - principal, 0).toFixed(2))
      const payment = Number(Math.min(paymentAmount, interest + principal).toFixed(2))
      schedule.push({ period, payment, interest, principal, balance })
    }

    return schedule
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
