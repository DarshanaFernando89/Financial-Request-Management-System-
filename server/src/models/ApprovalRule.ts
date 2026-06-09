import mongoose, { Schema } from 'mongoose';
import { ROLE_VALUES } from '../utils/constants.js';

const approvalRuleSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    requestTypes: [{ type: Schema.Types.ObjectId, ref: 'RequestType', required: true }],
    minAmount: { type: Number, required: true, min: 0 },
    maxAmount: { type: Number, default: null },
    workflowRoles: [{ type: String, enum: ROLE_VALUES, required: true }],
    includeFinanceReview: { type: Boolean, default: false },
    approvingAuthorityRole: { type: String, enum: ROLE_VALUES },
    priority: { type: Number, default: 100 },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

approvalRuleSchema.index({ requestTypes: 1, minAmount: 1, maxAmount: 1, isActive: 1 });

export const ApprovalRuleModel = mongoose.model('ApprovalRule', approvalRuleSchema);
