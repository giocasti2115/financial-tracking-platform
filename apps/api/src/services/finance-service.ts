import createError from 'http-errors';
import { db, query } from '../lib/db.js';
import type {
  AssetInput,
  AssetUpdateInput,
  DebtInput,
  DebtPaymentInput,
  ExpenseInput,
  ExpensePaymentInput,
  ExpenseUpdateInput,
  IncomeInput
} from '../schemas/finance.js';

const toNumber = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const mapExpense = (row: Record<string, any>) => ({
  ...row,
  amount: Number(row.amount),
  amount_paid: Number(row.amount_paid ?? 0),
  semester: row.semester === null ? null : Number(row.semester),
  year: Number(row.year)
});

const mapIncome = (row: Record<string, any>) => ({
  ...row,
  amount: Number(row.amount),
  payment_date: Number(row.payment_date),
  month: Number(row.month),
  year: Number(row.year)
});

const mapDebt = (row: Record<string, any>) => ({
  ...row,
  original_amount: Number(row.original_amount),
  current_balance: Number(row.current_balance),
  monthly_payment: row.monthly_payment === null ? null : Number(row.monthly_payment),
  interest_rate: row.interest_rate === null ? null : Number(row.interest_rate),
  payment_day: row.payment_day === null ? null : Number(row.payment_day)
});

const mapAsset = (row: Record<string, any>) => ({
  id: row.id,
  user_id: row.user_id,
  account_name: row.name,
  account_type: row.account_type,
  current_balance: Number(row.current_balance),
  last_updated: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
  created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
  currency_code: row.currency_code
});

const buildUpdateSet = (payload: Record<string, unknown>) => {
  const entries = Object.entries(payload).filter(([, value]) => value !== undefined);
  const assignments: string[] = [];
  const values: unknown[] = [];

  entries.forEach(([key, value], index) => {
    assignments.push(`${key} = $${index + 3}`);
    values.push(value);
  });

  assignments.push(`updated_at = NOW()`);
  return { assignments, values };
};

export const FinanceService = {
  listAssets: async (userId: string) => {
    const result = await query(
      `SELECT id, user_id, name, account_type, current_balance, currency_code, created_at, updated_at
       FROM accounts
       WHERE user_id = $1 AND archived = false
       ORDER BY created_at DESC` ,
      [userId]
    );
    return result.rows.map(mapAsset);
  },

  createAsset: async (userId: string, payload: AssetInput) => {
    const result = await query(
      `INSERT INTO accounts (user_id, currency_code, account_type, name, starting_balance, current_balance)
       VALUES ($1, $2, $3, $4, $5, $5)
       RETURNING id, user_id, name, account_type, current_balance, currency_code, created_at, updated_at` ,
      [userId, (payload.currency_code ?? 'COP').toUpperCase(), payload.account_type, payload.account_name, payload.current_balance]
    );
    return mapAsset(result.rows[0]);
  },

  updateAsset: async (userId: string, assetId: string, payload: AssetUpdateInput) => {
    const normalized: Record<string, unknown> = {};

    if (payload.account_name !== undefined) {
      normalized.name = payload.account_name;
    }
    if (payload.account_type !== undefined) {
      normalized.account_type = payload.account_type;
    }
    if (payload.current_balance !== undefined) {
      normalized.current_balance = payload.current_balance;
    }

    if (Object.keys(normalized).length === 0) {
      const existing = await query(
        `SELECT id, user_id, name, account_type, current_balance, currency_code, created_at, updated_at
         FROM accounts
         WHERE id = $1 AND user_id = $2 AND archived = false` ,
        [assetId, userId]
      );

      if (!existing.rowCount) {
        throw createError(404, 'Asset not found');
      }

      return mapAsset(existing.rows[0]);
    }

    const { assignments, values } = buildUpdateSet(normalized);
    const updated = await query(
      `UPDATE accounts
       SET ${assignments.join(', ')}
       WHERE id = $1 AND user_id = $2 AND archived = false
       RETURNING id, user_id, name, account_type, current_balance, currency_code, created_at, updated_at` ,
      [assetId, userId, ...values]
    );

    if (!updated.rowCount) {
      throw createError(404, 'Asset not found');
    }

    return mapAsset(updated.rows[0]);
  },

  deleteAsset: async (userId: string, assetId: string) => {
    const result = await query('DELETE FROM accounts WHERE id = $1 AND user_id = $2', [assetId, userId]);
    if (!result.rowCount) {
      throw createError(404, 'Asset not found');
    }
  },

  listExpenses: async (userId: string) => {
    const result = await query(
      `SELECT *
       FROM expenses
       WHERE user_id = $1
       ORDER BY payment_date DESC` ,
      [userId]
    );
    return result.rows.map(mapExpense);
  },

  createExpense: async (userId: string, payload: ExpenseInput) => {
    const result = await query(
      `INSERT INTO expenses
        (user_id, description, amount, payment_date, payment_period, semester, year, notes, is_paid, amount_paid, paid_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, false), COALESCE($10, 0),
               CASE WHEN COALESCE($9, false) = true THEN NOW() ELSE NULL END)
       RETURNING *` ,
      [
        userId,
        payload.description,
        payload.amount,
        payload.payment_date,
        payload.payment_period,
        payload.semester,
        payload.year,
        payload.notes ?? null,
        payload.is_paid ?? false,
        payload.amount_paid ?? 0
      ]
    );
    return mapExpense(result.rows[0]);
  },

  updateExpense: async (userId: string, expenseId: string, payload: ExpenseUpdateInput) => {
    const filteredPayload = Object.fromEntries(
      Object.entries(payload).filter(([, value]) => value !== undefined)
    );

    if (Object.keys(filteredPayload).length === 0) {
      const current = await query('SELECT * FROM expenses WHERE id = $1 AND user_id = $2', [expenseId, userId]);
      if (!current.rowCount) {
        throw createError(404, 'Expense not found');
      }
      return mapExpense(current.rows[0]);
    }

    if (filteredPayload.is_paid && !filteredPayload.paid_date) {
      filteredPayload.paid_date = new Date().toISOString();
    }

    const { assignments, values } = buildUpdateSet(filteredPayload);
    const result = await query(
      `UPDATE expenses
       SET ${assignments.join(', ')}
       WHERE id = $1 AND user_id = $2
       RETURNING *` ,
      [expenseId, userId, ...values]
    );

    if (!result.rowCount) {
      throw createError(404, 'Expense not found');
    }

    return mapExpense(result.rows[0]);
  },

  deleteExpense: async (userId: string, expenseId: string) => {
    const result = await query('DELETE FROM expenses WHERE id = $1 AND user_id = $2', [expenseId, userId]);
    if (!result.rowCount) {
      throw createError(404, 'Expense not found');
    }
  },

  registerExpensePayment: async (userId: string, expenseId: string, payload: ExpensePaymentInput) => {
    const existing = await query<{ amount: string; amount_paid: string }>(
      'SELECT amount, amount_paid FROM expenses WHERE id = $1 AND user_id = $2',
      [expenseId, userId]
    );

    if (!existing.rowCount) {
      throw createError(404, 'Expense not found');
    }

    const totalAmount = Number(existing.rows[0].amount);
    const currentPaid = Number(existing.rows[0].amount_paid ?? 0);
    const newTotal = currentPaid + payload.amount;

    if (newTotal - totalAmount > 1e-6) {
      throw createError(400, 'Payment exceeds remaining balance');
    }

    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO expense_payments (expense_id, user_id, amount, payment_date, notes)
         VALUES ($1, $2, $3, NOW(), $4)` ,
        [expenseId, userId, payload.amount, payload.notes ?? null]
      );

      const updated = await client.query(
        `UPDATE expenses
         SET amount_paid = amount_paid + $1,
             is_paid = CASE WHEN amount_paid + $1 >= amount THEN true ELSE is_paid END,
             paid_date = CASE WHEN amount_paid + $1 >= amount THEN NOW() ELSE paid_date END,
             updated_at = NOW()
         WHERE id = $2 AND user_id = $3
         RETURNING *` ,
        [payload.amount, expenseId, userId]
      );

      await client.query('COMMIT');
      return mapExpense(updated.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  listIncomes: async (userId: string) => {
    const result = await query(
      `SELECT *
       FROM incomes
       WHERE user_id = $1
       ORDER BY year DESC, month DESC, payment_date DESC` ,
      [userId]
    );
    return result.rows.map(mapIncome);
  },

  createIncome: async (userId: string, payload: IncomeInput) => {
    const result = await query(
      `INSERT INTO incomes (user_id, person_name, amount, payment_date, month, year, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *` ,
      [userId, payload.person_name, payload.amount, payload.payment_date, payload.month, payload.year, payload.notes ?? null]
    );
    return mapIncome(result.rows[0]);
  },

  deleteIncome: async (userId: string, incomeId: string) => {
    const result = await query('DELETE FROM incomes WHERE id = $1 AND user_id = $2', [incomeId, userId]);
    if (!result.rowCount) {
      throw createError(404, 'Income not found');
    }
  },

  listDebts: async (userId: string) => {
    const result = await query(
      `SELECT *
       FROM debts
       WHERE user_id = $1
       ORDER BY created_at DESC` ,
      [userId]
    );
    return result.rows.map(mapDebt);
  },

  createDebt: async (userId: string, payload: DebtInput) => {
    const result = await query(
      `INSERT INTO debts (
          user_id, debt_type, entity_name, original_amount, current_balance,
          monthly_payment, payment_day, start_date, end_date, interest_rate, status, notes
        )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, COALESCE($11, 'active'), $12)
       RETURNING *` ,
      [
        userId,
        payload.debt_type,
        payload.entity_name,
        payload.original_amount,
        payload.current_balance,
        payload.monthly_payment ?? null,
        payload.payment_day ?? null,
        payload.start_date ?? null,
        payload.end_date ?? null,
        payload.interest_rate ?? null,
        payload.status ?? null,
        payload.notes ?? null
      ]
    );
    return mapDebt(result.rows[0]);
  },

  deleteDebt: async (userId: string, debtId: string) => {
    const result = await query('DELETE FROM debts WHERE id = $1 AND user_id = $2', [debtId, userId]);
    if (!result.rowCount) {
      throw createError(404, 'Debt not found');
    }
  },

  addDebtPayment: async (userId: string, debtId: string, payload: DebtPaymentInput) => {
    const existing = await query<{ current_balance: string }>(
      'SELECT current_balance FROM debts WHERE id = $1 AND user_id = $2',
      [debtId, userId]
    );

    if (!existing.rowCount) {
      throw createError(404, 'Debt not found');
    }

    const currentBalance = Number(existing.rows[0].current_balance);
    if (payload.amount > currentBalance) {
      throw createError(400, 'Payment exceeds current balance');
    }

    const newBalance = currentBalance - payload.amount;

    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO debt_payments (debt_id, user_id, amount, interest_component, principal_component, payment_date, balance_after_payment, notes)
         VALUES ($1, $2, $3, 0, $3, $4, $5, $6)` ,
        [debtId, userId, payload.amount, payload.payment_date, newBalance, payload.notes ?? null]
      );

      const updated = await client.query(
        `UPDATE debts
         SET current_balance = $1,
             status = CASE WHEN $1 <= 0 THEN 'paid' ELSE status END,
             updated_at = NOW()
         WHERE id = $2 AND user_id = $3
         RETURNING *` ,
        [Math.max(newBalance, 0), debtId, userId]
      );

      await client.query('COMMIT');
      return mapDebt(updated.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
};
