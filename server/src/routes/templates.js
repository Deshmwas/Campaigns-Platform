import express from 'express';
import * as templateController from '../controllers/templateController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import { storage, hasCloudinary } from '../config/cloudinary.js';

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

// Image upload endpoint with proper error handling
router.post(
    '/email/upload-image',
    authorize('ADMIN', 'MANAGER'),
    (req, res, next) => {
        upload.single('image')(req, res, (err) => {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({ error: 'Image must be smaller than 5MB' });
                }
                return res.status(400).json({ error: `Upload error: ${err.message}` });
            }
            if (err) {
                return res.status(400).json({ error: err.message || 'Upload failed' });
            }
            next();
        });
    },
    (req, res) => {
        if (!req.file) {
            return res.status(400).json({ error: 'No image provided' });
        }

        let imageUrl;
        if (hasCloudinary) {
            // Cloudinary returns secure_url or path as full URL
            imageUrl = req.file.secure_url || req.file.path;
        } else {
            // Disk storage: build a relative URL that the server can serve
            const filename = req.file.filename || path.basename(req.file.path);
            imageUrl = `/uploads/templates/${filename}`;
        }

        res.json({ url: imageUrl, message: 'Image uploaded successfully' });
    }
);

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
