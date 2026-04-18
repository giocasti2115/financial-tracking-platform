import { authRequest, type AuthRequestOptions } from "@/lib/auth-request"
import type { Debt, DebtPaymentFrequency, DebtStatus } from "@/lib/types"

type ApiResponse<T> = { data: T }

export type NewDebtPayload = {
  entity_name: string
  debt_type: string
  original_amount: number
  current_balance: number
  monthly_payment?: number
  interest_rate?: number
  payment_day?: number
  start_date?: string
  end_date?: string
  payment_frequency?: DebtPaymentFrequency
  status?: DebtStatus
  notes?: string
}

export type DebtPaymentPayload = {
  amount: number
  payment_date: string
  notes?: string
}

export const debtsApi = {
  list: async (auth: AuthRequestOptions) => {
    const response = await authRequest<ApiResponse<Debt[]>>("/debts", auth)
    return response.data
  },

  create: async (auth: AuthRequestOptions, payload: NewDebtPayload) => {
    const response = await authRequest<ApiResponse<Debt>>("/debts", auth, {
      method: "POST",
      body: JSON.stringify(payload),
    })
    return response.data
  },

  registerPayment: async (auth: AuthRequestOptions, debtId: string, payload: DebtPaymentPayload) => {
    const response = await authRequest<ApiResponse<Debt>>(`/debts/${debtId}/payments`, auth, {
      method: "POST",
      body: JSON.stringify(payload),
    })
    return response.data
  },
}