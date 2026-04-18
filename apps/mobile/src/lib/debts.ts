import { authRequest, type AuthRequestOptions } from "@/lib/auth-request"
import { cacheStore } from "@/lib/cache-store"
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
    try {
      const response = await authRequest<ApiResponse<Debt[]>>("/debts", auth)
      await cacheStore.set("debts_list", response.data)
      return response.data
    } catch (error) {
      const cached = await cacheStore.get<Debt[]>("debts_list")
      if (cached?.value) {
        return cached.value
      }
      throw error
    }
  },

  create: async (auth: AuthRequestOptions, payload: NewDebtPayload) => {
    const response = await authRequest<ApiResponse<Debt>>("/debts", auth, {
      method: "POST",
      body: JSON.stringify(payload),
    })
    const cached = await cacheStore.get<Debt[]>("debts_list")
    if (cached?.value) {
      await cacheStore.set(
        "debts_list",
        [response.data, ...cached.value].sort((a, b) => b.created_at.localeCompare(a.created_at)),
      )
    }
    return response.data
  },

  registerPayment: async (auth: AuthRequestOptions, debtId: string, payload: DebtPaymentPayload) => {
    const response = await authRequest<ApiResponse<Debt>>(`/debts/${debtId}/payments`, auth, {
      method: "POST",
      body: JSON.stringify(payload),
    })
    const cached = await cacheStore.get<Debt[]>("debts_list")
    if (cached?.value) {
      await cacheStore.set(
        "debts_list",
        cached.value.map((debt) => (debt.id === debtId ? response.data : debt)),
      )
    }
    return response.data
  },
}