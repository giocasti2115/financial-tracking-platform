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

const toCurrency = (value: number) => Number(Number(value).toFixed(2))

const addPeriod = (date: Date, frequency: "monthly" | "biweekly") => {
  const next = new Date(date)
  if (frequency === "monthly") {
    next.setMonth(next.getMonth() + 1)
  } else {
    next.setDate(next.getDate() + 14)
  }
  return next
}

export const projections = {
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