import mongoose, { Schema } from 'mongoose';

const customRoleSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    displayName: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const CustomRoleModel = mongoose.model('CustomRole', customRoleSchema);
