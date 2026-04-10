import express from 'express';
import * as reportController from '../controllers/reportController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/campaigns', reportController.getCampaignListStats);
router.get('/campaign/:id', reportController.getDetailedReport);
router.get('/campaign/:id/recipients', reportController.getCampaignRecipients);

export default router;
