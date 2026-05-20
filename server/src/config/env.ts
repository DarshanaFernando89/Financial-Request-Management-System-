import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: Number(process.env.PORT || 5001),
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/financial_request_system',
  jwtSecret: process.env.JWT_SECRET || 'development_secret_change_me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  enableEmailNotifications: process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true',
  enableSmsNotifications: process.env.ENABLE_SMS_NOTIFICATIONS === 'true'
};
