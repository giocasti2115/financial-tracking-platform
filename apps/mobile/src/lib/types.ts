export type PaymentPeriod = "primera_quincena" | "segunda_quincena"
export type DebtStatus = "active" | "paid" | "pending"
export type DebtPaymentFrequency = "monthly" | "biweekly"
export type AccountType = "savings" | "checking" | "investment"

export interface Expense {
  id: string
  user_id: string
  description: string
  amount: number
  amount_paid: number
  payment_date: string
  payment_period: PaymentPeriod
  semester: number
  year: number
  notes?: string
  is_paid: boolean
  debt_id?: string | null
  asset_id?: string | null
  created_at: string
  updated_at: string
}

export interface Income {
  id: string
  user_id: string
  person_name: string
  amount: number
  payment_date: number
  year: number
  month: number
  created_at: string
}

export interface Debt {
  id: string
  user_id: string
  debt_type: string
  entity_name: string
  original_amount: number
  current_balance: number
  monthly_payment?: number
  payment_day?: number
  start_date?: string
  end_date?: string
  interest_rate?: number
  payment_frequency?: DebtPaymentFrequency
  status: DebtStatus
  notes?: string
  created_at: string
  updated_at: string
}

export interface Asset {
  id: string
  user_id: string
  account_name: string
  account_type: AccountType
  current_balance: number
  last_updated: string
  created_at: string
  updated_at: string
}

export type DashboardBundle = {
  incomes: Income[]
  expenses: Expense[]
  debts: Debt[]
  assets: Asset[]
}