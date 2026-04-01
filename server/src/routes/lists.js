import express from 'express';
import * as listController from '../controllers/listController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/', listController.getLists);
router.post('/', authorize('ADMIN', 'MANAGER'), listController.createList);
router.put('/:id', authorize('ADMIN', 'MANAGER'), listController.updateList);
router.delete('/:id', authorize('ADMIN', 'MANAGER'), listController.deleteList);
router.post('/:id/contacts', authorize('ADMIN', 'MANAGER'), listController.addContactsToList);
router.delete('/:id/contacts', authorize('ADMIN', 'MANAGER'), listController.removeContactsFromList);
router.post('/:targetListId/merge', authorize('ADMIN', 'MANAGER'), listController.mergeLists);

export default router;
