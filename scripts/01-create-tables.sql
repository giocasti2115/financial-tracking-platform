-- Enable UUID helpers
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Core identities ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  password_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ip_address INET,
  user_agent TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES user_sessions(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  revoked BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Catalogs ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS currencies (
  code CHAR(3) PRIMARY KEY,
  name TEXT NOT NULL,
  precision SMALLINT NOT NULL DEFAULT 2
);

CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  currency_code CHAR(3) NOT NULL REFERENCES currencies(code),
  account_type TEXT NOT NULL CHECK (account_type IN ('cash', 'savings', 'checking', 'credit', 'investment')),
  name TEXT NOT NULL,
  color TEXT,
  starting_balance DECIMAL(15, 2) DEFAULT 0,
  current_balance DECIMAL(15, 2) DEFAULT 0,
  archived BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, name)
);

CREATE TABLE IF NOT EXISTS account_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('deposit', 'withdrawal', 'transfer_in', 'transfer_out', 'adjustment')),
  amount DECIMAL(15, 2) NOT NULL,
  balance_after DECIMAL(15, 2) NOT NULL,
  description TEXT,
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category_type TEXT NOT NULL CHECK (category_type IN ('income', 'expense', 'debt')),
  is_fixed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, name, category_type)
);

-- Income -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS incomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  person_name TEXT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  payment_date SMALLINT NOT NULL CHECK (payment_date BETWEEN 1 AND 31),
  month SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expenses ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS expense_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  default_amount DECIMAL(15, 2) NOT NULL,
  default_period TEXT NOT NULL CHECK (default_period IN ('monthly', 'quincenal', 'annual', 'one_time')),
  day_of_month SMALLINT,
  semester SMALLINT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_period TEXT NOT NULL CHECK (payment_period IN ('primera_quincena', 'segunda_quincena', 'monthly', 'custom')),
  semester SMALLINT NOT NULL CHECK (semester IN (1, 2)),
  year INTEGER NOT NULL,
  amount_paid DECIMAL(15, 2) NOT NULL DEFAULT 0,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  paid_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expense_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(15, 2) NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Micro Expenses --------------------------------------------------------
CREATE TABLE IF NOT EXISTS micro_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount >= 0),
  category TEXT,
  occurred_on DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Debts ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  debt_type TEXT NOT NULL,
  entity_name TEXT NOT NULL,
  original_amount DECIMAL(15, 2) NOT NULL,
  current_balance DECIMAL(15, 2) NOT NULL,
  monthly_payment DECIMAL(15, 2),
  payment_day SMALLINT,
  start_date DATE,
  end_date DATE,
  interest_rate DECIMAL(5, 2),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paid', 'delinquent', 'written_off')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS debt_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debt_id UUID NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(15, 2) NOT NULL,
  interest_component DECIMAL(15, 2) DEFAULT 0,
  principal_component DECIMAL(15, 2) DEFAULT 0,
  payment_date DATE NOT NULL,
  balance_after_payment DECIMAL(15, 2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Link expenses directly with debts for reconciliation
ALTER TABLE IF EXISTS expenses
  ADD COLUMN IF NOT EXISTS debt_id UUID REFERENCES debts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_debt ON expenses(debt_id);

-- Projections ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  projection_type TEXT NOT NULL CHECK (projection_type IN ('cashflow', 'debt', 'savings')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  payload JSONB NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes ----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id, account_type);
CREATE INDEX IF NOT EXISTS idx_account_entries_account ON account_entries(account_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id, category_type);
CREATE INDEX IF NOT EXISTS idx_incomes_user_period ON incomes(user_id, year DESC, month DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_user_payment ON expenses(user_id, payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_is_paid ON expenses(is_paid);
CREATE INDEX IF NOT EXISTS idx_expense_payments_expense ON expense_payments(expense_id, payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_micro_expenses_user_date ON micro_expenses(user_id, occurred_on DESC);
CREATE INDEX IF NOT EXISTS idx_micro_expenses_user_month ON micro_expenses(user_id, date_trunc('month', occurred_on));
CREATE INDEX IF NOT EXISTS idx_debts_user_status ON debts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_debt_payments_debt ON debt_payments(debt_id, payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_projections_user_period ON projections(user_id, period_start, period_end);
