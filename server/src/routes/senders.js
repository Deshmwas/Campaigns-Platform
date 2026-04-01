import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
    getSenders, getSender, createSender, updateSender,
    deleteSender, testSender, sendTestEmail
} from '../controllers/senderController.js';

const router = express.Router();
router.use(authenticate, authorize('ADMIN', 'MANAGER'));

router.get('/', getSenders);
router.get('/:id', getSender);
router.post('/', createSender);
router.put('/:id', updateSender);
router.delete('/:id', deleteSender);
router.post('/:id/test', testSender);
router.post('/:id/send-test', sendTestEmail);

export default router;
