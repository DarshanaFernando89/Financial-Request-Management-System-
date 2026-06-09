import mongoose, { Schema } from 'mongoose';

const dynamicFieldSchema = new Schema(
  {
    name: { type: String, required: true },
    label: { type: String, required: true },
    type: { type: String, enum: ['text', 'number', 'date', 'select', 'textarea', 'file'], required: true },
    required: { type: Boolean, default: false },
    options: [{ type: String }],
    placeholder: String,
    validationRules: Schema.Types.Mixed
  },
  { _id: false }
);

const requestTypeSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, trim: true },
    fields: [dynamicFieldSchema],
    requiredDocuments: [{ type: String }],
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const RequestTypeModel = mongoose.model('RequestType', requestTypeSchema);
