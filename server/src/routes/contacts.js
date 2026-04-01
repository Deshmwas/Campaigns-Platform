import express from 'express';
import * as contactController from '../controllers/contactController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/', contactController.getContacts);
router.post('/', authorize('ADMIN', 'MANAGER'), contactController.createContact);
router.put('/:id', authorize('ADMIN', 'MANAGER'), contactController.updateContact);
router.delete('/:id', authorize('ADMIN', 'MANAGER'), contactController.deleteContact);
router.post('/import', authorize('ADMIN', 'MANAGER'), contactController.importContacts);

export default router;
