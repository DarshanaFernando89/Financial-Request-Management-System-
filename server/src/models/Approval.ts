import mongoose, { Schema } from 'mongoose';
import { ROLE_VALUES } from '../utils/constants.js';

const approvalSchema = new Schema(
  {
    request: { type: Schema.Types.ObjectId, ref: 'Request', required: true },
    action: { type: String, required: true },
    role: { type: String, enum: ROLE_VALUES, required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    remarks: String
  },
  { timestamps: true }
);

export const ApprovalModel = mongoose.model('Approval', approvalSchema);
