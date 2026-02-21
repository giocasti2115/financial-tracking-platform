import type { Express } from 'express';
import { assetsRouter } from './assets.js';
import { authRouter } from './auth.js';
import { accountBalanceSnapshotsRouter } from './account-balance-snapshots.js';
import { debtsRouter } from './debts.js';
import { expensesRouter } from './expenses.js';
import { healthRouter } from './health.js';
import { incomesRouter } from './incomes.js';
import { microExpensesRouter } from './micro-expenses.js';

export const registerRoutes = (app: Express) => {
  app.use('/health', healthRouter);
  app.use('/auth', authRouter);
  app.use('/assets', assetsRouter);
  app.use('/account-balance-snapshots', accountBalanceSnapshotsRouter);
  app.use('/expenses', expensesRouter);
  app.use('/incomes', incomesRouter);
  app.use('/debts', debtsRouter);
  app.use('/micro-expenses', microExpensesRouter);
};
