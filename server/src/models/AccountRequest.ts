import mongoose, { Schema } from 'mongoose';
import { ACCOUNT_REQUEST_STATUSES, ROLE_VALUES } from '../utils/constants.js';

const accountRequestSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    department: { type: String, required: true, trim: true },
    faculty: { type: String, required: true, trim: true },
    requestedRole: { type: String, enum: ROLE_VALUES, required: true },
    message: { type: String, trim: true },
    status: {
      type: String,
      enum: Object.values(ACCOUNT_REQUEST_STATUSES),
      default: ACCOUNT_REQUEST_STATUSES.PENDING
    },
    adminRemarks: String
  },
  { timestamps: true }
);

accountRequestSchema.index({ status: 1, createdAt: -1 });

export const AccountRequestModel = mongoose.model('AccountRequest', accountRequestSchema);
