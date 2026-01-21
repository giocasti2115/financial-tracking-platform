import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { microExpenseInputSchema, monthFilterSchema } from '../schemas/finance.js';
import { FinanceService } from '../services/finance-service.js';
import { asyncHandler } from '../utils/async-handler.js';

export const microExpensesRouter = Router();

microExpensesRouter.use(authMiddleware);

microExpensesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { month } = monthFilterSchema.parse(req.query);
    const data = await FinanceService.listMicroExpenses(req.auth!.userId, month ?? undefined);
    res.json({ data });
  })
);

microExpensesRouter.get(
  '/summary',
  asyncHandler(async (req, res) => {
    const { month } = monthFilterSchema.parse(req.query);
    const data = await FinanceService.getMicroExpenseSummary(req.auth!.userId, month ?? undefined);
    res.json({ data });
  })
);

microExpensesRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const payload = microExpenseInputSchema.parse(req.body);
    const created = await FinanceService.createMicroExpense(req.auth!.userId, payload);
    res.status(201).json({ data: created });
  })
);

microExpensesRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await FinanceService.deleteMicroExpense(req.auth!.userId, req.params.id);
    res.status(204).send();
  })
);
