import express from 'express';
import * as trackingController from '../controllers/trackingController.js';

const router = express.Router();

// No authentication required for tracking endpoints (they're public by design)
router.get('/open/:recipientId', trackingController.trackOpen);
router.get('/click/:recipientId', trackingController.trackClick);
router.get('/unsubscribe/:recipientId', trackingController.unsubscribe);

export default router;
