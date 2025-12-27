// Temporary local storage solution until database is integrated
import type { Expense, Debt, Asset, Income, ExpenseCategory } from "./types"

export const STORAGE_KEYS = {
  EXPENSES: "financial_expenses",
  DEBTS: "financial_debts",
  ASSETS: "financial_assets",
  INCOME: "financial_income",
  CATEGORIES: "financial_categories",
  USER: "financial_user",
  ACCESS_TOKEN: "financial_access_token",
  REFRESH_TOKEN: "financial_refresh_token",
} as const

function dispatchStorageUpdate() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("storage-updated"))
  }
}

export const storage = {
  // Generic storage methods
  get<T>(key: string): T | null {
    if (typeof window === "undefined") return null
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : null
    } catch (error) {
      console.error("[v0] Storage get error:", error)
      return null
    }
  },

  set<T>(key: string, value: T): void {
    if (typeof window === "undefined") return
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error("[v0] Storage set error:", error)
    }
  },

  remove(key: string): void {
    if (typeof window === "undefined") return
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.error("[v0] Storage remove error:", error)
    }
  },

  // Specific data methods
  getExpenses(): Expense[] {
    return this.get<Expense[]>(STORAGE_KEYS.EXPENSES) || []
  },

  setExpenses(expenses: Expense[]): void {
    this.set(STORAGE_KEYS.EXPENSES, expenses)
    dispatchStorageUpdate()
  },

  getDebts(): Debt[] {
    return this.get<Debt[]>(STORAGE_KEYS.DEBTS) || []
  },

  setDebts(debts: Debt[]): void {
    this.set(STORAGE_KEYS.DEBTS, debts)
    dispatchStorageUpdate()
  },

  getAssets(): Asset[] {
    return this.get<Asset[]>(STORAGE_KEYS.ASSETS) || []
  },

  setAssets(assets: Asset[]): void {
    this.set(STORAGE_KEYS.ASSETS, assets)
    dispatchStorageUpdate()
  },

  getIncome(): Income[] {
    return this.get<Income[]>(STORAGE_KEYS.INCOME) || []
  },

  setIncome(income: Income[]): void {
    this.set(STORAGE_KEYS.INCOME, income)
    dispatchStorageUpdate()
  },

  getCategories(): ExpenseCategory[] {
    return this.get<ExpenseCategory[]>(STORAGE_KEYS.CATEGORIES) || []
  },

  setCategories(categories: ExpenseCategory[]): void {
    this.set(STORAGE_KEYS.CATEGORIES, categories)
  },

  clearAll(): void {
    Object.values(STORAGE_KEYS).forEach((key) => this.remove(key))
  },
}
