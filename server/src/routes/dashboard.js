import express from 'express';
import * as dashboardController from '../controllers/dashboardController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/', dashboardController.getDashboard);
router.get('/analytics', dashboardController.getAnalytics);

export default router;
