import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { assetInputSchema, assetUpdateSchema } from '../schemas/finance.js';
import { FinanceService } from '../services/finance-service.js';
import { asyncHandler } from '../utils/async-handler.js';

export const assetsRouter = Router();

assetsRouter.use(authMiddleware);

assetsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const data = await FinanceService.listAssets(req.auth!.userId);
    res.json({ data });
  })
);

assetsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const payload = assetInputSchema.parse(req.body);
    const created = await FinanceService.createAsset(req.auth!.userId, payload);
    res.status(201).json({ data: created });
  })
);

assetsRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const payload = assetUpdateSchema.parse(req.body);
    const updated = await FinanceService.updateAsset(req.auth!.userId, req.params.id, payload);
    res.json({ data: updated });
  })
);

assetsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await FinanceService.deleteAsset(req.auth!.userId, req.params.id);
    res.status(204).send();
  })
);
