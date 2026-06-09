import { AuditLogModel } from '../models/AuditLog.js';

type AuditInput = {
  actor?: string;
  actorRole?: string;
  action: string;
  entityType: string;
  entityId?: string;
  description?: string;
  metadata?: unknown;
  ipAddress?: string;
};

export async function writeAuditLog(input: AuditInput) {
  return AuditLogModel.create(input);
}
