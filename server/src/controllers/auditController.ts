import { AuditLogModel } from '../models/AuditLog.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listAuditLogs = asyncHandler(async (req, res) => {
  const filter: any = {};
  if (req.query.action) filter.action = req.query.action;
  if (req.query.entityType) filter.entityType = req.query.entityType;
  const items = await AuditLogModel.find(filter).populate('actor', 'nameWithInitials fullName email').sort({ createdAt: -1 }).limit(200);
  res.json({ items });
});
