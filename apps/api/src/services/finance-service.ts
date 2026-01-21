import createError from 'http-errors';
import { DatabaseError } from 'pg';
import { db, query } from '../lib/db.js';
import type {
  AssetInput,
  AssetUpdateInput,
  DebtInput,
  DebtPaymentInput,
  DebtUpdateInput,
  ExpenseInput,
  ExpensePaymentInput,
  ExpenseUpdateInput,
  IncomeInput,
  MicroExpenseInput
} from '../schemas/finance.js';

const isPgDatabaseError = (error: unknown): error is DatabaseError => error instanceof DatabaseError;

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
  year: Number(row.year),
  asset_id: row.asset_id ?? null
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
  payment_day: row.payment_day === null ? null : Number(row.payment_day),
  payment_frequency: row.payment_frequency ?? 'monthly'
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

const mapMicroExpense = (row: Record<string, any>) => ({
  id: row.id,
  user_id: row.user_id,
  description: row.description,
  amount: Number(row.amount),
  category: row.category ?? null,
  occurred_on: row.occurred_on instanceof Date ? row.occurred_on.toISOString().slice(0, 10) : row.occurred_on,
  notes: row.notes ?? null,
  created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString()
});

const ensureCurrencyExists = async (code: string) => {
  await query(
    `INSERT INTO currencies (code, name)
     VALUES ($1, $2)
     ON CONFLICT (code) DO NOTHING`,
    [code, code]
  );
};

const formatCurrency = (value: number) => {
  const sanitized = value.toString().replace(/\./g, '').replace(/,/g, '.')
  const normalized = Number.parseFloat(sanitized)
  if (Number.isNaN(normalized)) {
    throw createError(400, 'Monto inválido')
  }
  return Number(normalized.toFixed(2))
};

let expenseDebtColumnEnsured = false;
const ensureExpenseDebtColumn = async () => {
  if (expenseDebtColumnEnsured) {
    return;
  }

  await query(
    `ALTER TABLE IF EXISTS expenses
       ADD COLUMN IF NOT EXISTS debt_id UUID REFERENCES debts(id) ON DELETE SET NULL`
  );

  await query(`CREATE INDEX IF NOT EXISTS idx_expenses_debt ON expenses(debt_id)`);

  expenseDebtColumnEnsured = true;
};

let expenseAssetColumnEnsured = false;
const ensureExpenseAssetColumn = async () => {
  if (expenseAssetColumnEnsured) {
    return;
  }

  await query(
    `ALTER TABLE IF EXISTS expenses
       ADD COLUMN IF NOT EXISTS asset_id UUID REFERENCES accounts(id) ON DELETE SET NULL`
  );

  await query(`CREATE INDEX IF NOT EXISTS idx_expenses_asset ON expenses(asset_id)`);

  expenseAssetColumnEnsured = true;
};

let expensePaymentAccountColumnEnsured = false;
const ensureExpensePaymentAccountColumn = async () => {
  if (expensePaymentAccountColumnEnsured) {
    return;
  }

  await query(
    `ALTER TABLE IF EXISTS expense_payments
       ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL`
  );

  expensePaymentAccountColumnEnsured = true;
};

let debtFrequencyColumnEnsured = false;
const ensureDebtFrequencyColumn = async () => {
  if (debtFrequencyColumnEnsured) {
    return;
  }

  await query(
    `ALTER TABLE IF EXISTS debts
       ADD COLUMN IF NOT EXISTS payment_frequency TEXT NOT NULL DEFAULT 'monthly'`
  );

  debtFrequencyColumnEnsured = true;
};

const normalizePaymentFrequency = (value: string | null | undefined): 'monthly' | 'biweekly' =>
  value === 'biweekly' ? 'biweekly' : 'monthly';

const getPeriodicInterestRate = (interestRate: number | null | undefined, frequency: string | null | undefined) => {
  const normalizedRate = Number(interestRate ?? 0) / 100;
  return normalizePaymentFrequency(frequency) === 'biweekly' ? normalizedRate / 2 : normalizedRate;
};

const splitDebtPaymentComponents = (
  balance: number,
  paymentAmount: number,
  interestRate: number | null | undefined,
  frequency: string | null | undefined
) => {
  if (paymentAmount <= 0) {
    throw createError(400, 'El monto del pago debe ser mayor que cero.');
  }

  const periodicRate = getPeriodicInterestRate(interestRate, frequency);
  const interestComponent = periodicRate > 0 ? formatCurrency(balance * periodicRate) : 0;
  const principalBeforeCap = Math.max(paymentAmount - interestComponent, 0);
  const principalComponent = formatCurrency(Math.min(principalBeforeCap, balance));
  const allowableTotal = interestComponent + principalComponent;

  if (paymentAmount - allowableTotal > 1e-2 && balance > 0) {
    throw createError(400, 'El pago supera el saldo permitido para esta deuda.');
  }

  const newBalance = formatCurrency(Math.max(balance - principalComponent, 0));
  return { interestComponent, principalComponent, newBalance };
};

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

const toIsoDate = (date: Date) => date.toISOString().slice(0, 10);

const getMonthBounds = (month?: string) => {
  let reference = new Date();
  if (month) {
    const [yearStr, monthStr] = month.split('-');
    const year = Number(yearStr);
    const monthIndex = Number(monthStr) - 1;
    reference = new Date(Date.UTC(year, monthIndex, 1));
  }

  const start = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), 1));
  const end = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() + 1, 1));

  return {
    startDate: toIsoDate(start),
    endDate: toIsoDate(end)
  };
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
    const currencyCode = (payload.currency_code ?? 'COP').toUpperCase();
    await ensureCurrencyExists(currencyCode);
    const result = await query(
      `INSERT INTO accounts (user_id, currency_code, account_type, name, starting_balance, current_balance)
       VALUES ($1, $2, $3, $4, $5, $5)
       RETURNING id, user_id, name, account_type, current_balance, currency_code, created_at, updated_at` ,
      [userId, currencyCode, payload.account_type, payload.account_name, payload.current_balance]
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
    await ensureExpenseDebtColumn();
    await ensureExpenseAssetColumn();
    const result = await query(
      `INSERT INTO expenses
        (user_id, description, amount, payment_date, payment_period, semester, year, notes, is_paid, amount_paid, paid_date, debt_id, asset_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, false), COALESCE($10, 0),
               CASE WHEN COALESCE($9, false) = true THEN NOW() ELSE NULL END, $11, $12)
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
        payload.amount_paid ?? 0,
        payload.debt_id ?? null,
        payload.asset_id ?? null
      ]
    );
    return mapExpense(result.rows[0]);
  },

  updateExpense: async (userId: string, expenseId: string, payload: ExpenseUpdateInput) => {
    await ensureExpenseDebtColumn();
    await ensureExpenseAssetColumn();
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
    await ensureExpenseDebtColumn();
    await ensureExpenseAssetColumn();
    await ensureExpensePaymentAccountColumn();
    await ensureDebtFrequencyColumn();
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      const expenseResult = await client.query<{ amount: string; amount_paid: string; debt_id: string | null; asset_id: string | null }>(
        'SELECT amount, amount_paid, debt_id, asset_id FROM expenses WHERE id = $1 AND user_id = $2 FOR UPDATE',
        [expenseId, userId]
      );

      if (!expenseResult.rowCount) {
        throw createError(404, 'Expense not found');
      }

      const expenseRow = expenseResult.rows[0];
      const totalAmount = Number(expenseRow.amount);
      const currentPaid = Number(expenseRow.amount_paid ?? 0);
      const amountDelta = formatCurrency(payload.amount);
      const newTotal = currentPaid + amountDelta;

      if (newTotal - totalAmount > 1e-6) {
        throw createError(400, 'Payment exceeds remaining balance');
      }

      const paymentTimestamp = new Date().toISOString();
      const paymentDate = paymentTimestamp.split('T')[0];

      const effectiveAssetId = payload.asset_id ?? expenseRow.asset_id;

      if (effectiveAssetId) {
        const assetResult = await client.query<{ current_balance: string }>(
          'SELECT current_balance FROM accounts WHERE id = $1 AND user_id = $2 AND archived = false FOR UPDATE',
          [effectiveAssetId, userId]
        );

        if (!assetResult.rowCount) {
          throw createError(404, 'Asset not found for this user');
        }

        const currentAssetBalance = Number(assetResult.rows[0].current_balance);
        const newAssetBalance = formatCurrency(currentAssetBalance + amountDelta);

        await client.query(
          `UPDATE accounts
             SET current_balance = $1,
                 updated_at = NOW()
           WHERE id = $2 AND user_id = $3` ,
          [newAssetBalance, effectiveAssetId, userId]
        );

        await client.query(
          `INSERT INTO account_entries (account_id, user_id, entry_type, amount, balance_after, description, occurred_at)
             VALUES ($1, $2, 'deposit', $3, $4, $5, $6)` ,
          [effectiveAssetId, userId, amountDelta, newAssetBalance, `Pago de gasto ${expenseId}`, paymentTimestamp]
        );
      }

      await client.query(
        `INSERT INTO expense_payments (expense_id, user_id, amount, payment_date, notes, account_id)
         VALUES ($1, $2, $3, $4, $5, $6)` ,
        [expenseId, userId, amountDelta, paymentTimestamp, payload.notes ?? null, effectiveAssetId ?? null]
      );

      const updatedExpense = await client.query(
        `UPDATE expenses
         SET amount_paid = amount_paid + $1,
             is_paid = CASE WHEN amount_paid + $1 >= amount THEN true ELSE is_paid END,
             paid_date = CASE WHEN amount_paid + $1 >= amount THEN $4 ELSE paid_date END,
             updated_at = NOW()
         WHERE id = $2 AND user_id = $3
         RETURNING *` ,
        [amountDelta, expenseId, userId, paymentTimestamp]
      );

      if (expenseRow.debt_id) {
        const debtResult = await client.query<{ current_balance: string; interest_rate: string | null; payment_frequency: string | null }>(
          'SELECT current_balance, interest_rate, payment_frequency FROM debts WHERE id = $1 AND user_id = $2 FOR UPDATE',
          [expenseRow.debt_id, userId]
        );

        if (!debtResult.rowCount) {
          throw createError(404, 'Debt not found for linked expense');
        }

        const debtRow = debtResult.rows[0];
        const currentBalance = Number(debtRow.current_balance);

        const { interestComponent, principalComponent, newBalance } = splitDebtPaymentComponents(
          currentBalance,
          amountDelta,
          toNumber(debtRow.interest_rate),
          debtRow.payment_frequency
        );

        await client.query(
          `INSERT INTO debt_payments (debt_id, user_id, amount, interest_component, principal_component, payment_date, balance_after_payment, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)` ,
          [expenseRow.debt_id, userId, amountDelta, interestComponent, principalComponent, paymentDate, newBalance, payload.notes ?? null]
        );

        await client.query(
          `UPDATE debts
           SET current_balance = $1,
               status = CASE WHEN $1 <= 0::numeric THEN 'paid' ELSE status END,
               updated_at = NOW()
           WHERE id = $2 AND user_id = $3` ,
          [newBalance, expenseRow.debt_id, userId]
        );
      }

      await client.query('COMMIT');
      return mapExpense(updatedExpense.rows[0]);
    } catch (error: unknown) {
      await client.query('ROLLBACK');
      if (isPgDatabaseError(error)) {
        console.error('[registerExpensePayment] database error:', error.message, error.detail);
        throw createError(400, error.detail || error.message);
      }
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
    await ensureDebtFrequencyColumn();
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
    await ensureDebtFrequencyColumn();
    const result = await query(
      `INSERT INTO debts (
          user_id, debt_type, entity_name, original_amount, current_balance,
          monthly_payment, payment_day, start_date, end_date, interest_rate, payment_frequency, status, notes
        )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
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
        normalizePaymentFrequency(payload.payment_frequency ?? null),
        payload.status ?? 'active',
        payload.notes ?? null
      ]
    );
    return mapDebt(result.rows[0]);
  },

  updateDebt: async (userId: string, debtId: string, payload: DebtUpdateInput) => {
    await ensureDebtFrequencyColumn();
    const normalized: Record<string, unknown> = {};

    if (payload.debt_type !== undefined) {
      normalized.debt_type = payload.debt_type;
    }
    if (payload.entity_name !== undefined) {
      normalized.entity_name = payload.entity_name;
    }
    if (payload.original_amount !== undefined) {
      normalized.original_amount = payload.original_amount;
    }
    if (payload.current_balance !== undefined) {
      normalized.current_balance = payload.current_balance;
    }
    if (payload.monthly_payment !== undefined) {
      normalized.monthly_payment = payload.monthly_payment;
    }
    if (payload.payment_day !== undefined) {
      normalized.payment_day = payload.payment_day;
    }
    if (payload.start_date !== undefined) {
      normalized.start_date = payload.start_date;
    }
    if (payload.end_date !== undefined) {
      normalized.end_date = payload.end_date;
    }
    if (payload.interest_rate !== undefined) {
      normalized.interest_rate = payload.interest_rate;
    }
    if (payload.payment_frequency !== undefined) {
      normalized.payment_frequency = normalizePaymentFrequency(payload.payment_frequency ?? null);
    }
    if (payload.status !== undefined) {
      normalized.status = payload.status;
    }
    if (payload.notes !== undefined) {
      normalized.notes = payload.notes;
    }

    if (Object.keys(normalized).length === 0) {
      const existing = await query('SELECT * FROM debts WHERE id = $1 AND user_id = $2', [debtId, userId]);
      if (!existing.rowCount) {
        throw createError(404, 'Debt not found');
      }
      return mapDebt(existing.rows[0]);
    }

    const { assignments, values } = buildUpdateSet(normalized);
    const updated = await query(
      `UPDATE debts
       SET ${assignments.join(', ')}
       WHERE id = $1 AND user_id = $2
       RETURNING *` ,
      [debtId, userId, ...values]
    );

    if (!updated.rowCount) {
      throw createError(404, 'Debt not found');
    }

    return mapDebt(updated.rows[0]);
  },

  deleteDebt: async (userId: string, debtId: string) => {
    const result = await query('DELETE FROM debts WHERE id = $1 AND user_id = $2', [debtId, userId]);
    if (!result.rowCount) {
      throw createError(404, 'Debt not found');
    }
  },

  addDebtPayment: async (userId: string, debtId: string, payload: DebtPaymentInput) => {
    await ensureDebtFrequencyColumn();
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      const existing = await client.query<{ current_balance: string; interest_rate: string | null; payment_frequency: string | null }>(
        'SELECT current_balance, interest_rate, payment_frequency FROM debts WHERE id = $1 AND user_id = $2 FOR UPDATE',
        [debtId, userId]
      );

      if (!existing.rowCount) {
        throw createError(404, 'Debt not found');
      }

      const debtRow = existing.rows[0];
      const currentBalance = Number(debtRow.current_balance);
      const amountDelta = formatCurrency(payload.amount);

      const { interestComponent, principalComponent, newBalance } = splitDebtPaymentComponents(
        currentBalance,
        amountDelta,
        toNumber(debtRow.interest_rate),
        debtRow.payment_frequency
      );

      await client.query(
        `INSERT INTO debt_payments (debt_id, user_id, amount, interest_component, principal_component, payment_date, balance_after_payment, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)` ,
        [debtId, userId, amountDelta, interestComponent, principalComponent, payload.payment_date, newBalance, payload.notes ?? null]
      );

      const updated = await client.query(
        `UPDATE debts
         SET current_balance = $1,
             status = CASE WHEN $1 <= 0::numeric THEN 'paid' ELSE status END,
             updated_at = NOW()
         WHERE id = $2 AND user_id = $3
         RETURNING *` ,
        [newBalance, debtId, userId]
      );

      await client.query('COMMIT');
      return mapDebt(updated.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  listMicroExpenses: async (userId: string, month?: string) => {
    const { startDate, endDate } = getMonthBounds(month);
    const result = await query(
      `SELECT id, user_id, description, category, amount, occurred_on, notes, created_at, updated_at
       FROM micro_expenses
       WHERE user_id = $1
         AND occurred_on >= $2
         AND occurred_on < $3
       ORDER BY occurred_on DESC, created_at DESC` ,
      [userId, startDate, endDate]
    );
    return result.rows.map(mapMicroExpense);
  },

  createMicroExpense: async (userId: string, payload: MicroExpenseInput) => {
    const occurredOn = payload.occurred_on ?? toIsoDate(new Date());
    const result = await query(
      `INSERT INTO micro_expenses (user_id, description, amount, category, occurred_on, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, user_id, description, category, amount, occurred_on, notes, created_at, updated_at` ,
      [userId, payload.description, payload.amount, payload.category ?? null, occurredOn, payload.notes ?? null]
    );
    return mapMicroExpense(result.rows[0]);
  },

  deleteMicroExpense: async (userId: string, microExpenseId: string) => {
    const result = await query('DELETE FROM micro_expenses WHERE id = $1 AND user_id = $2', [microExpenseId, userId]);
    if (!result.rowCount) {
      throw createError(404, 'Gasto hormiga no encontrado');
    }
  },

  getMicroExpenseSummary: async (userId: string, month?: string) => {
    const { startDate, endDate } = getMonthBounds(month);

    const aggregate = await query(
      `SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*)::INT AS count
         FROM micro_expenses
        WHERE user_id = $1 AND occurred_on >= $2 AND occurred_on < $3` ,
      [userId, startDate, endDate]
    );

    const totalAmount = Number(aggregate.rows[0]?.total ?? 0);
    const totalCount = Number(aggregate.rows[0]?.count ?? 0);

    const categories = await query(
      `SELECT COALESCE(NULLIF(category, ''), 'Sin categoría') AS category,
              SUM(amount) AS total,
              COUNT(*)::INT AS count
         FROM micro_expenses
        WHERE user_id = $1 AND occurred_on >= $2 AND occurred_on < $3
        GROUP BY category
        ORDER BY total DESC` ,
      [userId, startDate, endDate]
    );

    const daily = await query(
      `SELECT occurred_on::text AS occurred_on, SUM(amount) AS total
         FROM micro_expenses
        WHERE user_id = $1 AND occurred_on >= $2 AND occurred_on < $3
        GROUP BY occurred_on
        ORDER BY occurred_on` ,
      [userId, startDate, endDate]
    );

    return {
      total: totalAmount,
      count: totalCount,
      categories: categories.rows.map((row) => {
        const categoryTotal = Number(row.total);
        return {
          category: row.category ?? 'Sin categoría',
          total: categoryTotal,
          count: Number(row.count),
          percentage: totalAmount > 0 ? categoryTotal / totalAmount : 0
        };
      }),
      daily_totals: daily.rows.map((row) => ({
        occurred_on: row.occurred_on,
        total: Number(row.total)
      }))
    };
  }
};
