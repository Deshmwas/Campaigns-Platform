import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { config } from './index.js';

cloudinary.config({
  cloud_name: config.cloudinary.cloud_name,
  api_key: config.cloudinary.api_key,
  api_secret: config.cloudinary.api_secret,
});

const hasCloudinary =
  !!config.cloudinary.cloud_name &&
  !!config.cloudinary.api_key &&
  !!config.cloudinary.api_secret;

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'campaigns/templates',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    public_id: (req, file) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        return 'template-img-' + uniqueSuffix;
    },
  },
});

let logoStorage;
if (hasCloudinary) {
  logoStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'campaigns/logos',
      allowed_formats: ['jpg', 'jpeg', 'png', 'svg', 'webp'],
      public_id: () => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        return 'logo-' + uniqueSuffix;
      },
    },
  });
} else {
  const uploadsDir = path.join(process.cwd(), 'uploads', 'logos');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  logoStorage = multer.diskStorage({
    destination: uploadsDir,
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname) || '';
      cb(null, `logo-${uniqueSuffix}${ext}`);
    },
  });
}

export { cloudinary, storage, logoStorage };
