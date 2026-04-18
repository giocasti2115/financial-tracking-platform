import { authRequest, type AuthRequestOptions } from "@/lib/auth-request"
import { cacheStore } from "@/lib/cache-store"
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
    try {
      const response = await authRequest<ApiResponse<Expense[]>>("/expenses", auth)
      await cacheStore.set("expenses_list", response.data)
      return response.data
    } catch (error) {
      const cached = await cacheStore.get<Expense[]>("expenses_list")
      if (cached?.value) {
        return cached.value
      }
      throw error
    }
  },

  create: async (auth: AuthRequestOptions, payload: NewExpensePayload) => {
    const response = await authRequest<ApiResponse<Expense>>("/expenses", auth, {
      method: "POST",
      body: JSON.stringify(payload),
    })
    const cached = await cacheStore.get<Expense[]>("expenses_list")
    if (cached?.value) {
      await cacheStore.set(
        "expenses_list",
        [response.data, ...cached.value].sort((a, b) => b.payment_date.localeCompare(a.payment_date)),
      )
    }
    return response.data
  },
}

export const getSemesterFromDate = (date: string) => {
  const [, monthValue] = date.split("-")
  const month = Number(monthValue)
  return month <= 6 ? 1 : 2
}