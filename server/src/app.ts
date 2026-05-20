import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';

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

export default app;
