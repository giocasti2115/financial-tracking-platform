import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { expenseInputSchema, expensePaymentSchema, expenseUpdateSchema } from '../schemas/finance.js';
import { FinanceService } from '../services/finance-service.js';
import { asyncHandler } from '../utils/async-handler.js';

export const expensesRouter = Router();

expensesRouter.use(authMiddleware);

expensesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const data = await FinanceService.listExpenses(req.auth!.userId);
    res.json({ data });
  })
);

expensesRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const payload = expenseInputSchema.parse(req.body);
    const created = await FinanceService.createExpense(req.auth!.userId, payload);
    res.status(201).json({ data: created });
  })
);

expensesRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const payload = expenseUpdateSchema.parse(req.body);
    const updated = await FinanceService.updateExpense(req.auth!.userId, req.params.id, payload);
    res.json({ data: updated });
  })
);

expensesRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await FinanceService.deleteExpense(req.auth!.userId, req.params.id);
    res.status(204).send();
  })
);

expensesRouter.post(
  '/:id/payments',
  asyncHandler(async (req, res) => {
    const payload = expensePaymentSchema.parse(req.body);
    const updated = await FinanceService.registerExpensePayment(req.auth!.userId, req.params.id, payload);
    res.json({ data: updated });
  })
);
