import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  database: {
    url: process.env.DATABASE_URL,
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'change-this-secret',
    expiresIn: '7d',
  },

  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    from: {
      email: process.env.SMTP_FROM_EMAIL,
      name: process.env.SMTP_FROM_NAME || 'Campaigns System',
    },
  },

  app: {
    url: process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000',
    apiUrl: process.env.API_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:5000',
  },

  tracking: {
    domain: process.env.TRACKING_DOMAIN || process.env.RENDER_EXTERNAL_URL || 'http://localhost:5000',
  },

  rateLimits: {
    email: parseInt(process.env.EMAIL_RATE_LIMIT) || 100, // per minute
    sms: parseInt(process.env.SMS_RATE_LIMIT) || 50,     // per minute
  },
  
  cloudinary: {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  },
};
