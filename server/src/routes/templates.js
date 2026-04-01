import express from 'express';
import * as templateController from '../controllers/templateController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import multer from 'multer';
import { storage } from '../config/cloudinary.js';

const router = express.Router();

router.use(authenticate);

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype?.startsWith('image/')) {
            return cb(null, true);
        }
        cb(new Error('Only image uploads are allowed'));
    },
});

router.post('/email/upload-image', authorize('ADMIN', 'MANAGER'), upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No image provided' });
    const imageUrl = req.file.secure_url || req.file.path;
    res.json({ url: imageUrl, path: imageUrl, message: 'Image uploaded successfully' });
});

// Email templates
router.get('/email', templateController.getEmailTemplates);
router.get('/email/:id', templateController.getEmailTemplate);
router.post('/email', authorize('ADMIN', 'MANAGER'), templateController.createEmailTemplate);
router.post('/email/:id/duplicate', authorize('ADMIN', 'MANAGER'), templateController.duplicateEmailTemplate);
router.put('/email/:id', authorize('ADMIN', 'MANAGER'), templateController.updateEmailTemplate);
router.delete('/email/:id', authorize('ADMIN', 'MANAGER'), templateController.deleteEmailTemplate);

// SMS templates
router.get('/sms', templateController.getSmsTemplates);
router.get('/sms/:id', templateController.getSmsTemplate);
router.post('/sms', authorize('ADMIN', 'MANAGER'), templateController.createSmsTemplate);
router.put('/sms/:id', authorize('ADMIN', 'MANAGER'), templateController.updateSmsTemplate);
router.delete('/sms/:id', authorize('ADMIN', 'MANAGER'), templateController.deleteSmsTemplate);

export default router;
