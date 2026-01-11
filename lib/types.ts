export type PaymentPeriod = "primera_quincena" | "segunda_quincena"
export type DebtStatus = "active" | "paid" | "pending"
export type TransactionType = "deposit" | "withdrawal"
export type AccountType = "savings" | "checking" | "investment"
export type DebtPaymentFrequency = "monthly" | "biweekly"

export interface User {
  id: string
  email: string
  full_name?: string
  created_at: string
  updated_at: string
}

export interface ExpenseCategory {
  id: string
  user_id: string
  name: string
  is_fixed: boolean
  created_at: string
}

export interface Expense {
  id: string
  user_id: string
  category_id?: string
  description: string
  amount: number
  amount_paid: number // Add amount_paid field for partial payments
  payment_date: string
  payment_period: PaymentPeriod
  semester: number
  year: number
  notes?: string
  is_paid: boolean
  paid_date?: string
  debt_id?: string | null
  asset_id?: string | null
  debt?: Debt
  created_at: string
  updated_at: string
  category?: ExpenseCategory
}

export interface Income {
  id: string
  user_id: string
  person_name: string
  amount: number
  payment_date: number // 15 or 30
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

export interface DebtPayment {
  id: string
  debt_id: string
  user_id: string
  amount: number
  interest_component?: number
  principal_component?: number
  payment_date: string
  balance_after_payment: number
  notes?: string
  created_at: string
}

export interface Asset {
  id: string
  user_id: string
  account_name: string
  account_type: AccountType
  current_balance: number
  last_updated: string
  notes?: string
  created_at: string
  updated_at: string
  currency_code?: string
}

export interface AssetTransaction {
  id: string
  asset_id: string
  user_id: string
  transaction_type: TransactionType
  amount: number
  transaction_date: string
  balance_after: number
  description?: string
  created_at: string
}

export interface FinancialSummary {
  total_income: number
  total_expenses: number
  total_debts: number
  total_assets: number
  patrimony: number
  available_funds: number
}

export interface QuincenalSummary {
  period: PaymentPeriod
  month: number
  year: number
  total_income: number
  total_expenses: number
  paid_expenses: number // Added to track paid expenses separately
  pending_expenses: number // Added to track pending expenses
  available: number
  expenses: Expense[]
}
