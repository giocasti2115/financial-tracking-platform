import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { accountBalanceSnapshotInputSchema, monthFilterSchema } from '../schemas/finance.js';
import { FinanceService } from '../services/finance-service.js';
import { asyncHandler } from '../utils/async-handler.js';

export const accountBalanceSnapshotsRouter = Router();

accountBalanceSnapshotsRouter.use(authMiddleware);

accountBalanceSnapshotsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { month } = monthFilterSchema.parse(req.query);
    const data = await FinanceService.listAccountBalanceSnapshots(req.auth!.userId, month);
    res.json({ data });
  })
);

accountBalanceSnapshotsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const payload = accountBalanceSnapshotInputSchema.parse(req.body);
    const created = await FinanceService.createAccountBalanceSnapshot(req.auth!.userId, payload);
    res.status(201).json({ data: created });
  })
);

accountBalanceSnapshotsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await FinanceService.deleteAccountBalanceSnapshot(req.auth!.userId, req.params.id);
    res.status(204).send();
  })
);
