import mongoose, { Schema } from 'mongoose';
import {
  DEFAULT_CURRENCY,
  REQUEST_STATUS_VALUES,
  REQUEST_STATUSES,
  ROLE_VALUES,
  STEP_STATUSES,
  STEP_TYPES
} from '../utils/constants.js';

const documentSchema = new Schema(
  {
    filename: String,
    originalName: String,
    fileUrl: String,
    mimeType: String,
    size: Number,
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    uploadedByRole: { type: String, enum: ROLE_VALUES },
    uploadedAt: { type: Date, default: Date.now },
    description: String,
    storageType: { type: String, enum: ['db', 'disk'], default: 'db' },
    fileBuffer: { type: Buffer, default: undefined }
  },
  { _id: true }
);

const workflowStepSchema = new Schema(
  {
    stepIndex: Number,
    role: { type: String, enum: ROLE_VALUES, required: true },
    assignedUser: { type: Schema.Types.ObjectId, ref: 'User' },
    stepType: { type: String, enum: Object.values(STEP_TYPES), required: true },
    status: { type: String, enum: Object.values(STEP_STATUSES), default: STEP_STATUSES.WAITING },
    action: String,
    remarks: String,
    actedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    actedByRole: { type: String, enum: ROLE_VALUES },
    actedAt: Date
  },
  { _id: true }
);

const historySchema = new Schema(
  {
    action: String,
    role: { type: String, enum: ROLE_VALUES },
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    remarks: String,
    fromStatus: String,
    toStatus: String,
    createdAt: { type: Date, default: Date.now }
  },
  { _id: true }
);

const requestSchema = new Schema(
  {
    requestId: { type: String, required: true, unique: true, index: true },
    requester: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    requesterSnapshot: {
      name: String,
      email: String,
      department: String,
      faculty: String,
      staffCategory: String,
      roleAtSubmission: String
    },
    requestType: { type: Schema.Types.ObjectId, ref: 'RequestType', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: DEFAULT_CURRENCY },
    requestData: { type: Schema.Types.Mixed, default: {} },
    documents: [documentSchema],
    status: { type: String, enum: REQUEST_STATUS_VALUES, default: REQUEST_STATUSES.DRAFT },
    currentStepIndex: { type: Number, default: -1 },
    workflowSteps: [workflowStepSchema],
    currentAssignedRole: { type: String, enum: ROLE_VALUES },
    currentAssignedUser: { type: Schema.Types.ObjectId, ref: 'User' },
    previousAssignedRoleWhenInfoRequested: { type: String, enum: ROLE_VALUES },
    approvalHistory: [historySchema],
    clarificationHistory: [historySchema],
    rejectionReason: String,
    payment: {
      paidAt: Date,
      paidBy: { type: Schema.Types.ObjectId, ref: 'User' },
      amount: Number,
      referenceNo: String,
      remarks: String
    },
    revisionNo: { type: Number, default: 0 },
    submittedAt: Date,
    resubmittedAt: Date,
    completedAt: Date
  },
  { timestamps: true }
);

requestSchema.index({ requester: 1, status: 1, createdAt: -1 });
requestSchema.index({ currentAssignedRole: 1, status: 1 });
requestSchema.index({ requestType: 1, amount: 1 });

export const RequestModel = mongoose.model('Request', requestSchema);
