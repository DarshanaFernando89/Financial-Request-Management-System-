import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const defaultUploadDir = path.resolve(process.cwd(), 'uploads');

export const env = {
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGO_URI || '',
  dnsServers: (process.env.DNS_SERVERS || '').split(',').map((server) => server.trim()).filter(Boolean),
  jwtSecret: process.env.JWT_SECRET || 'development_secret_change_me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  uploadDir: process.env.UPLOAD_DIR ? path.resolve(process.cwd(), process.env.UPLOAD_DIR) : defaultUploadDir,
  enableEmailNotifications: process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true',
  enableSmsNotifications: process.env.ENABLE_SMS_NOTIFICATIONS === 'true'
};
