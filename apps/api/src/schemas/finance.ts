import { z } from 'zod';

const currencyValue = z.number().finite().nonnegative();
const paymentPeriodSchema = z.enum(['primera_quincena', 'segunda_quincena', 'monthly', 'custom']);
const accountTypeSchema = z.enum(['cash', 'savings', 'checking', 'credit', 'investment']);
const debtPaymentFrequencySchema = z.enum(['monthly', 'biweekly']);
const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Fecha inválida');

export const expenseInputSchema = z.object({
  description: z.string().min(1),
  amount: currencyValue,
  payment_date: z.string().min(4),
  payment_period: paymentPeriodSchema,
  semester: z.number().int().min(1).max(2),
  year: z.number().int().min(2000),
  notes: z.string().optional(),
  is_paid: z.boolean().optional(),
  amount_paid: currencyValue.optional(),
  debt_id: z.string().uuid().optional().nullable(),
  asset_id: z.string().uuid().optional().nullable()
});

export const expenseUpdateSchema = expenseInputSchema.partial().extend({
  amount_paid: currencyValue.optional(),
  is_paid: z.boolean().optional(),
  paid_date: z.string().optional()
});

export const expensePaymentSchema = z.object({
  amount: currencyValue.positive(),
  notes: z.string().optional(),
  asset_id: z.string().uuid().optional()
});

export const incomeInputSchema = z.object({
  person_name: z.string().min(1),
  amount: currencyValue,
  payment_date: z.number().int().min(1).max(31),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000),
  notes: z.string().optional()
});

export const debtInputSchema = z.object({
  entity_name: z.string().min(1),
  debt_type: z.string().min(1),
  original_amount: currencyValue,
  current_balance: currencyValue,
  monthly_payment: currencyValue.optional(),
  interest_rate: z.number().nonnegative().optional(),
  payment_day: z.number().int().min(1).max(31).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  payment_frequency: debtPaymentFrequencySchema.optional(),
  status: z.enum(['active', 'paid', 'pending']).optional(),
  notes: z.string().optional()
});

export const debtPaymentSchema = z.object({
  amount: currencyValue.positive(),
  payment_date: z.string().min(4),
  notes: z.string().optional()
});

export const debtUpdateSchema = debtInputSchema.partial();

export const assetInputSchema = z.object({
  account_name: z.string().min(1),
  account_type: accountTypeSchema,
  current_balance: currencyValue,
  currency_code: z.string().length(3).optional()
});

export const assetUpdateSchema = z.object({
  account_name: z.string().min(1).optional(),
  account_type: accountTypeSchema.optional(),
  current_balance: currencyValue.optional()
});

export const accountBalanceSnapshotInputSchema = z.object({
  label: z.string().min(1).max(120),
  amount: currencyValue,
  recorded_on: dateStringSchema,
  account_id: z.string().uuid().optional().nullable(),
  notes: z.string().max(400).optional()
});

export const microExpenseInputSchema = z.object({
  description: z.string().trim().min(1),
  amount: currencyValue.positive(),
  category: z.string().trim().min(1).max(60).optional(),
  occurred_on: dateStringSchema.optional(),
  notes: z.string().max(400).optional()
});

export const monthFilterSchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Mes inválido')
    .optional()
});

export type ExpenseInput = z.infer<typeof expenseInputSchema>;
export type ExpenseUpdateInput = z.infer<typeof expenseUpdateSchema>;
export type ExpensePaymentInput = z.infer<typeof expensePaymentSchema>;
export type IncomeInput = z.infer<typeof incomeInputSchema>;
export type DebtInput = z.infer<typeof debtInputSchema>;
export type DebtPaymentInput = z.infer<typeof debtPaymentSchema>;
export type DebtUpdateInput = z.infer<typeof debtUpdateSchema>;
export type AssetInput = z.infer<typeof assetInputSchema>;
export type AssetUpdateInput = z.infer<typeof assetUpdateSchema>;
export type AccountBalanceSnapshotInput = z.infer<typeof accountBalanceSnapshotInputSchema>;
export type MicroExpenseInput = z.infer<typeof microExpenseInputSchema>;
export type MonthFilterInput = z.infer<typeof monthFilterSchema>;
