import mongoose, { Schema } from 'mongoose';
import { DEFAULT_FILE_TYPES } from '../utils/documentPolicy.js';

const approvalRuleSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    requestTypes: [{ type: Schema.Types.ObjectId, ref: 'RequestType', required: true }],
    requiredDocuments: { type: [String], default: undefined },
    acceptedFileTypes: { type: [{ type: String, enum: DEFAULT_FILE_TYPES }], default: undefined },
    minAmount: { type: Number, required: true, min: 0 },
    maxAmount: { type: Number, default: null },
    workflowRoles: [{ type: String, required: true }],
    includeFinanceReview: { type: Boolean, default: false },
    approvingAuthorityRole: { type: String },
    priority: { type: Number, default: 100 },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

approvalRuleSchema.index({ requestTypes: 1, minAmount: 1, maxAmount: 1, isActive: 1 });

export const ApprovalRuleModel = mongoose.model('ApprovalRule', approvalRuleSchema);
