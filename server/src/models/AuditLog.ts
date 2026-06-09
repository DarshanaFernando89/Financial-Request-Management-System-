import mongoose, { Schema } from 'mongoose';
import { ROLE_VALUES } from '../utils/constants.js';

const auditLogSchema = new Schema(
  {
    actor: { type: Schema.Types.ObjectId, ref: 'User' },
    actorRole: { type: String, enum: ROLE_VALUES },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: String,
    description: String,
    metadata: Schema.Types.Mixed,
    ipAddress: String
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1, action: 1 });

export const AuditLogModel = mongoose.model('AuditLog', auditLogSchema);
