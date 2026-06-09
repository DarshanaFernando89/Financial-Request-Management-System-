import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import path from 'path';
import accountRequestRoutes from './routes/accountRequestRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import approvalRoutes from './routes/approvalRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import authRoutes from './routes/authRoutes.js';
import demoRoutes from './routes/demoRoutes.js';
import financeRoutes from './routes/financeRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import requestRoutes from './routes/requestRoutes.js';
import userRoutes from './routes/userRoutes.js';
import { env } from './config/env.js';
import { errorMiddleware, notFoundMiddleware } from './middleware/errorMiddleware.js';

const app = express();

app.use(
  cors({
    origin: env.clientUrl,
    credentials: true
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false
  })
);

app.get('/', (_req, res) => {
  res.send('FRMS Server Setup Active');
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'financial-request-management-system' });
});

app.use('/uploads', express.static(path.resolve(env.uploadDir)));

app.use('/api', demoRoutes);

app.use('/api/auth', authRoutes);
app.use('/api/account-requests', accountRequestRoutes);
app.use('/api/users', userRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/audit-logs', auditRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
