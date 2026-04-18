import { authRequest, type AuthRequestOptions } from "@/lib/auth-request"
import type { Expense, PaymentPeriod } from "@/lib/types"

export type NewExpensePayload = {
  description: string
  amount: number
  payment_date: string
  payment_period: PaymentPeriod
  semester: number
  year: number
  notes?: string
  is_paid?: boolean
  amount_paid?: number
  debt_id?: string | null
  asset_id?: string | null
}

type ApiResponse<T> = { data: T }

export const expensesApi = {
  list: async (auth: AuthRequestOptions) => {
    const response = await authRequest<ApiResponse<Expense[]>>("/expenses", auth)
    return response.data
  },

  create: async (auth: AuthRequestOptions, payload: NewExpensePayload) => {
    const response = await authRequest<ApiResponse<Expense>>("/expenses", auth, {
      method: "POST",
      body: JSON.stringify(payload),
    })
    return response.data
  },
}

export const getSemesterFromDate = (date: string) => {
  const [, monthValue] = date.split("-")
  const month = Number(monthValue)
  return month <= 6 ? 1 : 2
}