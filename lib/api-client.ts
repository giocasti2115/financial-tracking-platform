import { auth } from "./auth"
import type {
  Asset,
  Debt,
  Expense,
  Income,
  PaymentPeriod,
  DebtPaymentFrequency,
  MicroExpense,
  MicroExpenseSummary,
  AccountBalanceSnapshot,
} from "./types"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
const NETWORK_ERROR_MESSAGE =
  "No pudimos conectar con el servidor. Verifica tu conexión e intenta nuevamente."

type ApiResponse<T> = { data: T }

type NewExpensePayload = {
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

type UpdateExpensePayload = Partial<NewExpensePayload> & {
  amount_paid?: number
  paid_date?: string | null
}

type ExpensePaymentPayload = {
  amount: number
  notes?: string
  asset_id?: string
}

type NewIncomePayload = {
  person_name: string
  amount: number
  payment_date: number
  month: number
  year: number
  notes?: string
}

type NewDebtPayload = {
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
  status?: "active" | "paid" | "pending"
  notes?: string
}

type UpdateDebtPayload = Partial<NewDebtPayload>

type DebtPaymentPayload = {
  amount: number
  payment_date: string
  notes?: string
}

type NewAssetPayload = {
  account_name: string
  account_type: Asset["account_type"]
  current_balance: number
  currency_code?: string
}

type UpdateAssetPayload = Partial<Omit<NewAssetPayload, "current_balance">> & {
  current_balance?: number
}

type NewAccountBalanceSnapshotPayload = {
  label: string
  amount: number
  recorded_on: string
  account_id?: string | null
  notes?: string
}

type UpdateAccountBalanceSnapshotPayload = Partial<NewAccountBalanceSnapshotPayload>

type NewMicroExpensePayload = {
  description: string
  amount: number
  category?: string
  occurred_on?: string
  notes?: string
}

const safeFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  try {
    return await fetch(input, init)
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[api-client] Error de red", error)
    }
    throw new Error(NETWORK_ERROR_MESSAGE)
  }
}

const buildHeaders = (body?: BodyInit | null, customHeaders?: HeadersInit) => {
  const headers = new Headers(customHeaders)
  if (body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }

  const token = auth.getAccessToken()
  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }
  return headers
}

const parseError = async (response: Response) => {
  try {
    const payload = await response.json()
    return payload.message || response.statusText
  } catch {
    return response.statusText
  }
}

const request = async <T>(path: string, options: RequestInit = {}, retry = true): Promise<T> => {
  const headers = buildHeaders(options.body ?? null, options.headers)
  const response = await safeFetch(`${API_URL}${path}`, { ...options, headers })

  if (response.status === 401 && retry) {
    const newToken = await auth.refreshAccessToken()
    if (newToken) {
      headers.set("Authorization", `Bearer ${newToken}`)
      const retryResponse = await safeFetch(`${API_URL}${path}`, { ...options, headers })
      if (!retryResponse.ok) {
        throw new Error(await parseError(retryResponse))
      }
      return (await retryResponse.json()) as T
    }

    auth.signOut()
    throw new Error("Sesión expirada. Inicia sesión nuevamente.")
  }

  if (!response.ok) {
    throw new Error(await parseError(response))
  }

  if (response.status === 204) {
    return {} as T
  }

  return (await response.json()) as T
}

export const apiClient = {
  // Assets
  getAssets: async () => {
    const response = await request<ApiResponse<Asset[]>>("/assets")
    return response.data
  },
  createAsset: async (payload: NewAssetPayload) => {
    const response = await request<ApiResponse<Asset>>("/assets", {
      method: "POST",
      body: JSON.stringify(payload),
    })
    return response.data
  },
  updateAsset: async (id: string, payload: UpdateAssetPayload) => {
    const response = await request<ApiResponse<Asset>>(`/assets/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    })
    return response.data
  },
  deleteAsset: async (id: string) => {
    await request(`/assets/${id}`, { method: "DELETE" })
  },

  // Account balance snapshots
  getAccountBalanceSnapshots: async (month?: string) => {
    const query = month ? `?month=${encodeURIComponent(month)}` : ""
    const response = await request<ApiResponse<AccountBalanceSnapshot[]>>(
      `/account-balance-snapshots${query}`,
    )
    return response.data
  },
  createAccountBalanceSnapshot: async (payload: NewAccountBalanceSnapshotPayload) => {
    const response = await request<ApiResponse<AccountBalanceSnapshot>>(`/account-balance-snapshots`, {
      method: "POST",
      body: JSON.stringify(payload),
    })
    return response.data
  },
  updateAccountBalanceSnapshot: async (id: string, payload: UpdateAccountBalanceSnapshotPayload) => {
    const response = await request<ApiResponse<AccountBalanceSnapshot>>(`/account-balance-snapshots/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    })
    return response.data
  },
  deleteAccountBalanceSnapshot: async (id: string) => {
    await request(`/account-balance-snapshots/${id}`, { method: "DELETE" })
  },

  // Expenses
  getExpenses: async () => {
    const response = await request<ApiResponse<Expense[]>>("/expenses")
    return response.data
  },
  createExpense: async (payload: NewExpensePayload) => {
    const response = await request<ApiResponse<Expense>>("/expenses", {
      method: "POST",
      body: JSON.stringify(payload),
    })
    return response.data
  },
  updateExpense: async (id: string, payload: UpdateExpensePayload) => {
    const response = await request<ApiResponse<Expense>>(`/expenses/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    })
    return response.data
  },
  deleteExpense: async (id: string) => {
    await request(`/expenses/${id}`, { method: "DELETE" })
  },
  registerExpensePayment: async (id: string, payload: ExpensePaymentPayload) => {
    const response = await request<ApiResponse<Expense>>(`/expenses/${id}/payments`, {
      method: "POST",
      body: JSON.stringify(payload),
    })
    return response.data
  },

  // Incomes
  getIncomes: async () => {
    const response = await request<ApiResponse<Income[]>>("/incomes")
    return response.data
  },
  createIncome: async (payload: NewIncomePayload) => {
    const response = await request<ApiResponse<Income>>("/incomes", {
      method: "POST",
      body: JSON.stringify(payload),
    })
    return response.data
  },
  deleteIncome: async (id: string) => {
    await request(`/incomes/${id}`, { method: "DELETE" })
  },

  // Debts
  getDebts: async () => {
    const response = await request<ApiResponse<Debt[]>>("/debts")
    return response.data
  },
  createDebt: async (payload: NewDebtPayload) => {
    const response = await request<ApiResponse<Debt>>("/debts", {
      method: "POST",
      body: JSON.stringify(payload),
    })
    return response.data
  },
  updateDebt: async (id: string, payload: UpdateDebtPayload) => {
    const response = await request<ApiResponse<Debt>>(`/debts/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    })
    return response.data
  },
  deleteDebt: async (id: string) => {
    await request(`/debts/${id}`, { method: "DELETE" })
  },
  addDebtPayment: async (id: string, payload: DebtPaymentPayload) => {
    const response = await request<ApiResponse<Debt>>(`/debts/${id}/payments`, {
      method: "POST",
      body: JSON.stringify(payload),
    })
    return response.data
  },

  // Micro expenses
  getMicroExpenses: async (month?: string) => {
    const query = month ? `?month=${encodeURIComponent(month)}` : ""
    const response = await request<ApiResponse<MicroExpense[]>>(`/micro-expenses${query}`)
    return response.data
  },
  createMicroExpense: async (payload: NewMicroExpensePayload) => {
    const response = await request<ApiResponse<MicroExpense>>(`/micro-expenses`, {
      method: "POST",
      body: JSON.stringify(payload),
    })
    return response.data
  },
  deleteMicroExpense: async (id: string) => {
    await request(`/micro-expenses/${id}`, { method: "DELETE" })
  },
  getMicroExpenseSummary: async (month?: string) => {
    const query = month ? `?month=${encodeURIComponent(month)}` : ""
    const response = await request<ApiResponse<MicroExpenseSummary>>(`/micro-expenses/summary${query}`)
    return response.data
  },
}

export type {
  NewDebtPayload,
  NewExpensePayload,
  UpdateExpensePayload,
  ExpensePaymentPayload,
  NewIncomePayload,
  DebtPaymentPayload,
  NewAssetPayload,
  UpdateAssetPayload,
  UpdateDebtPayload,
  NewMicroExpensePayload,
  NewAccountBalanceSnapshotPayload,
  UpdateAccountBalanceSnapshotPayload,
}
