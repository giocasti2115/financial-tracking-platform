import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { debtInputSchema, debtPaymentSchema } from '../schemas/finance.js';
import { FinanceService } from '../services/finance-service.js';
import { asyncHandler } from '../utils/async-handler.js';

export const debtsRouter = Router();

debtsRouter.use(authMiddleware);

debtsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const data = await FinanceService.listDebts(req.auth!.userId);
    res.json({ data });
  })
);

debtsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const payload = debtInputSchema.parse(req.body);
    const created = await FinanceService.createDebt(req.auth!.userId, payload);
    res.status(201).json({ data: created });
  })
);

debtsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await FinanceService.deleteDebt(req.auth!.userId, req.params.id);
    res.status(204).send();
  })
);

debtsRouter.post(
  '/:id/payments',
  asyncHandler(async (req, res) => {
    const payload = debtPaymentSchema.parse(req.body);
    const updated = await FinanceService.addDebtPayment(req.auth!.userId, req.params.id, payload);
    res.json({ data: updated });
  })
);
