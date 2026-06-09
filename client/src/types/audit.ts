export type AuditLog = {
  _id: string;
  action: string;
  entityType: string;
  entityId?: string;
  description?: string;
  actorRole?: string;
  createdAt: string;
};
