import { Pool } from 'pg';
import { env } from '../env.js';

export const db = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10
});

export const query = async <T = unknown>(text: string, params?: unknown[]) => db.query<T>(text, params);
