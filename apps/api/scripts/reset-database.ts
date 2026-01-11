import { config } from 'dotenv';
import { Pool } from 'pg';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: resolve(__dirname, '../.env') });

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not defined. Please configure apps/api/.env before running this script.');
  process.exit(1);
}

const tables = [
  'expense_payments',
  'expenses',
  'expense_templates',
  'incomes',
  'debt_payments',
  'debts',
  'account_entries',
  'accounts',
  'categories',
  'projections',
  'currencies',
  'refresh_tokens',
  'user_sessions',
  'users'
];

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function resetDatabase() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const truncateStatement = `TRUNCATE TABLE ${tables.join(', ')} RESTART IDENTITY CASCADE;`;
    await client.query(truncateStatement);
    await client.query('COMMIT');
    console.log('✅ Database reset complete. All records were removed.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to reset database:', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

resetDatabase();
