import mongoose, { Schema } from 'mongoose';

const approvalSchema = new Schema(
  {
    request: { type: Schema.Types.ObjectId, ref: 'Request', required: true },
    action: { type: String, required: true },
    role: { type: String, required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    remarks: String
  },
  { timestamps: true }
);

export const ApprovalModel = mongoose.model('Approval', approvalSchema);
