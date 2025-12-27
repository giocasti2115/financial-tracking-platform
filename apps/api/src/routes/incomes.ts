import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { incomeInputSchema } from '../schemas/finance.js';
import { FinanceService } from '../services/finance-service.js';
import { asyncHandler } from '../utils/async-handler.js';

export const incomesRouter = Router();

incomesRouter.use(authMiddleware);

incomesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const data = await FinanceService.listIncomes(req.auth!.userId);
    res.json({ data });
  })
);

incomesRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const payload = incomeInputSchema.parse(req.body);
    const created = await FinanceService.createIncome(req.auth!.userId, payload);
    res.status(201).json({ data: created });
  })
);

incomesRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await FinanceService.deleteIncome(req.auth!.userId, req.params.id);
    res.status(204).send();
  })
);
