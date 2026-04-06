import express from 'express';
import * as campaignController from '../controllers/campaignController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/', campaignController.getCampaigns);
router.get('/:id', campaignController.getCampaign);
router.post('/', authorize('ADMIN', 'MANAGER'), campaignController.createCampaign);
router.put('/:id', authorize('ADMIN', 'MANAGER'), campaignController.updateCampaign);
router.post('/:id/send', authorize('ADMIN', 'MANAGER'), campaignController.sendCampaign);
router.post('/:id/retry-failed', authorize('ADMIN', 'MANAGER'), campaignController.retryFailedCampaign);
router.delete('/:id', authorize('ADMIN', 'MANAGER'), campaignController.deleteCampaign);

export default router;
