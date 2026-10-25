import type { RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';

const options = {
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please wait a few minutes and try again.' }
};

const generalLimiter = rateLimit(options);
const notificationPollingLimiter = rateLimit(options);

// Polling has its own bounded budget; it must not lock users out of their profile.
// Notification writes and detail requests still use the general request budget.
export const apiRateLimiter: RequestHandler = (req, res, next) => {
  const isNotificationPoll = req.method === 'GET' && /^\/api\/notifications\/?$/i.test(req.path);
  return (isNotificationPoll ? notificationPollingLimiter : generalLimiter)(req, res, next);
};
