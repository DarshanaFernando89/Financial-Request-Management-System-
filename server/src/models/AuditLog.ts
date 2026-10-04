import mongoose, { Schema } from 'mongoose';

const auditLogSchema = new Schema(
  {
    actor: { type: Schema.Types.ObjectId, ref: 'User' },
    actorRole: { type: String },
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
