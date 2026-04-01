import express from 'express';
import multer from 'multer';
import * as organizationController from '../controllers/organizationController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { logoStorage } from '../config/cloudinary.js';

const router = express.Router();

const upload = multer({ 
    storage: logoStorage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            return cb(null, true);
        }
        cb(new Error('Only images (jpg, png, svg, webp) are allowed'));
    }
});

// Public branding endpoint (no auth) for login/landing pages
router.get('/branding', organizationController.getPublicBranding);

router.use(authenticate);

router.get('/settings', organizationController.getSettings);
router.put('/settings', authorize('ADMIN'), organizationController.updateSettings);
router.post('/upload-logo', authorize('ADMIN'), upload.single('logo'), organizationController.uploadLogo);

export default router;
