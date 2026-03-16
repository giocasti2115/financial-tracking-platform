import type { Debt, DebtPaymentFrequency, Expense, Income } from "./types"

export interface CreditSimulationPayment {
  period: number
  date: string
  payment: number
  interest: number
  principal: number
  balance: number
}

export interface CreditSimulationResult {
  periodicPayment: number
  totalInterest: number
  totalPaid: number
  payoffDate: string
  frequency: "monthly" | "biweekly"
  schedule: CreditSimulationPayment[]
}

export interface DebtProjection {
  debt_id: string
  entity_name: string
  month: number
  year: number
  projected_payment: number
  projected_balance: number
  is_final_payment: boolean
  interest_component: number
  principal_component: number
}

export interface MonthlyProjection {
  month: number
  year: number
  total_income: number
  total_expenses: number
  total_debt_payments: number
  total_debt_interest: number
  total_debt_principal: number
  available: number
  debt_projections: DebtProjection[]
}

const toCurrency = (value: number) => Number(Number(value).toFixed(2))

const normalizeFrequency = (frequency?: DebtPaymentFrequency | null) =>
  frequency === "biweekly" ? "biweekly" : "monthly"

const getPeriodicInterestRate = (interestRate?: number | null, frequency?: DebtPaymentFrequency | null) => {
  const normalizedRate = Number(interestRate ?? 0) / 100
  return normalizeFrequency(frequency) === "biweekly" ? normalizedRate / 2 : normalizedRate
}

const addPeriod = (date: Date, frequency: "monthly" | "biweekly") => {
  const next = new Date(date)
  if (frequency === "monthly") {
    next.setMonth(next.getMonth() + 1)
  } else {
    next.setDate(next.getDate() + 14)
  }
  return next
}

const splitPayment = (
  balance: number,
  paymentAmount: number,
  interestRate?: number | null,
  frequency?: DebtPaymentFrequency | null,
) => {
  if (paymentAmount <= 0 || balance <= 0) {
    return {
      interest: 0,
      principal: 0,
      payment: 0,
      balanceAfter: balance,
    }
  }

  const periodicRate = getPeriodicInterestRate(interestRate, frequency)
  const interest = periodicRate > 0 ? toCurrency(balance * periodicRate) : 0
  const principalBeforeCap = Math.max(paymentAmount - interest, 0)
  const principal = toCurrency(Math.min(principalBeforeCap, balance))
  const payment = toCurrency(interest + principal)
  const balanceAfter = toCurrency(Math.max(balance - principal, 0))

  return {
    interest,
    principal,
    payment,
    balanceAfter,
  }
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
        const paymentsPerMonth = normalizeFrequency(debt.payment_frequency) === "biweekly" ? 2 : 1
        const scheduledPayment = toCurrency(debt.monthly_payment ?? 0)

        if (scheduledPayment <= 0) {
          return
        }

        while (remainingBalance > 0 && monthOffset < months) {
          const projectionDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + monthOffset, 1)
          let monthlyInterest = 0
          let monthlyPrincipal = 0
          let monthlyPayment = 0

          for (let i = 0; i < paymentsPerMonth && remainingBalance > 0; i++) {
            const { interest, principal, payment, balanceAfter } = splitPayment(
              remainingBalance,
              scheduledPayment,
              debt.interest_rate,
              debt.payment_frequency,
            )

            monthlyInterest += interest
            monthlyPrincipal += principal
            monthlyPayment += payment
            remainingBalance = balanceAfter

            if (payment === 0) {
              break
            }
          }

          if (monthlyPayment === 0) {
            break
          }

          projections.push({
            debt_id: debt.id,
            entity_name: debt.entity_name,
            month: projectionDate.getMonth() + 1,
            year: projectionDate.getFullYear(),
            projected_payment: toCurrency(monthlyPayment),
            projected_balance: Math.max(0, remainingBalance),
            is_final_payment: remainingBalance <= 0,
            interest_component: toCurrency(monthlyInterest),
            principal_component: toCurrency(monthlyPrincipal),
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
      const totalDebtInterest = monthDebtProjections.reduce((sum, dp) => sum + dp.interest_component, 0)
      const totalDebtPrincipal = monthDebtProjections.reduce((sum, dp) => sum + dp.principal_component, 0)

      projections.push({
        month,
        year,
        total_income: avgMonthlyIncome,
        total_expenses: avgMonthlyExpenses,
        total_debt_payments: totalDebtPayments,
        total_debt_interest: totalDebtInterest,
        total_debt_principal: totalDebtPrincipal,
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

    const projected = this.generateDebtProjections(activeDebts, 360)
    const finalPayment = projected.reduce<DebtProjection | null>((latest, current) => {
      if (!current.is_final_payment) return latest
      if (!latest) return current
      if (current.year > latest.year) return current
      if (current.year === latest.year && current.month > latest.month) return current
      return latest
    }, null)

    if (!finalPayment) {
      return null
    }

    return new Date(finalPayment.year, finalPayment.month - 1, 1)
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

  simulateCreditScenario(params: {
    amount: number
    annualRate: number
    termMonths: number
    frequency: "monthly" | "biweekly"
    extraPayment?: number
    startDate?: Date
  }): CreditSimulationResult {
    const principal = Math.max(0, Number(params.amount) || 0)
    const annualRate = Math.max(0, Number(params.annualRate) || 0)
    const termMonths = Math.max(1, Math.floor(Number(params.termMonths) || 1))
    const frequency = params.frequency === "biweekly" ? "biweekly" : "monthly"
    const periodsPerYear = frequency === "biweekly" ? 24 : 12
    const periodicRate = annualRate / 100 / periodsPerYear
    const totalPeriods = termMonths * (frequency === "biweekly" ? 2 : 1)
    const extraPayment = Math.max(0, Number(params.extraPayment ?? 0) || 0)

    let periodicPayment = 0
    if (periodicRate === 0) {
      periodicPayment = toCurrency(principal / totalPeriods)
    } else {
      const factor = (1 + periodicRate) ** totalPeriods
      periodicPayment = toCurrency((principal * periodicRate * factor) / (factor - 1))
    }
    periodicPayment = toCurrency(periodicPayment + extraPayment)

    const schedule: CreditSimulationPayment[] = []
    let balance = principal
    let currentDate = params.startDate ? new Date(params.startDate) : new Date()

    for (let period = 1; period <= totalPeriods && balance > 0; period++) {
      currentDate = addPeriod(currentDate, frequency)
      const interest = periodicRate > 0 ? toCurrency(balance * periodicRate) : 0
      let principalComponent = toCurrency(periodicPayment - interest)
      if (principalComponent <= 0) {
        principalComponent = toCurrency(Math.min(balance, periodicPayment))
      }
      if (principalComponent > balance) {
        principalComponent = balance
      }
      const payment = toCurrency(principalComponent + interest)
      balance = toCurrency(Math.max(balance - principalComponent, 0))

      schedule.push({
        period,
        date: currentDate.toISOString(),
        payment,
        interest,
        principal: principalComponent,
        balance,
      })

      if (balance <= 0.01) {
        balance = 0
        break
      }
    }

    const totalInterest = toCurrency(schedule.reduce((sum, entry) => sum + entry.interest, 0))
    const totalPaid = toCurrency(schedule.reduce((sum, entry) => sum + entry.payment, 0))
    const payoffDate = schedule.length ? schedule[schedule.length - 1].date : new Date().toISOString()

    return {
      periodicPayment,
      totalInterest,
      totalPaid,
      payoffDate,
      frequency,
      schedule,
    }
  },
}
