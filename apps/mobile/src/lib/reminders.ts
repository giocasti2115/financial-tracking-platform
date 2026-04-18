import * as SecureStore from "expo-secure-store"
import type { Debt, Expense } from "@/lib/types"

const REMINDERS_KEY = "aurea_mobile_reminders"

export type ReminderItem = {
  id: string
  type: "expense" | "debt"
  title: string
  dueDate: string
  amount: number
  read: boolean
}

const toIsoDate = (date: Date) => date.toISOString().slice(0, 10)

const dateDistanceDays = (date: string) => {
  const now = new Date()
  const target = new Date(date)
  const diffMs = target.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

const computeUpcomingReminders = (expenses: Expense[], debts: Debt[]): ReminderItem[] => {
  const reminders: ReminderItem[] = []
  const currentYear = new Date().getFullYear()

  for (const expense of expenses) {
    const days = dateDistanceDays(expense.payment_date)
    if (days >= 0 && days <= 10 && !expense.is_paid) {
      reminders.push({
        id: `exp-${expense.id}`,
        type: "expense",
        title: `Gasto próximo: ${expense.description}`,
        dueDate: expense.payment_date,
        amount: Math.max(expense.amount - (expense.amount_paid ?? 0), 0),
        read: false,
      })
    }
  }

  for (const debt of debts) {
    if (debt.status !== "active" || !debt.payment_day || !debt.monthly_payment) continue
    const dueDate = new Date()
    dueDate.setDate(Math.max(1, Math.min(28, debt.payment_day)))
    if (dueDate < new Date()) {
      dueDate.setMonth(dueDate.getMonth() + 1)
    }
    const days = dateDistanceDays(toIsoDate(dueDate))
    if (days >= 0 && days <= 10) {
      reminders.push({
        id: `debt-${debt.id}-${currentYear}-${dueDate.getMonth() + 1}`,
        type: "debt",
        title: `Cuota de deuda: ${debt.entity_name}`,
        dueDate: toIsoDate(dueDate),
        amount: debt.monthly_payment,
        read: false,
      })
    }
  }

  return reminders.sort((a, b) => a.dueDate.localeCompare(b.dueDate))
}

const save = async (items: ReminderItem[]) => {
  try {
    await SecureStore.setItemAsync(REMINDERS_KEY, JSON.stringify(items))
  } catch {
    // best-effort
  }
}

export const reminders = {
  async sync(expenses: Expense[], debts: Debt[]) {
    const existing = await this.list()
    const existingById = new Map(existing.map((item) => [item.id, item]))
    const next = computeUpcomingReminders(expenses, debts).map((item) => ({
      ...item,
      read: existingById.get(item.id)?.read ?? false,
    }))
    await save(next)
    return next
  },

  async list() {
    try {
      const raw = await SecureStore.getItemAsync(REMINDERS_KEY)
      if (!raw) return [] as ReminderItem[]
      return JSON.parse(raw) as ReminderItem[]
    } catch {
      return [] as ReminderItem[]
    }
  },

  async markAllAsRead() {
    const current = await this.list()
    const next = current.map((item) => ({ ...item, read: true }))
    await save(next)
    return next
  },
}