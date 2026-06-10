import mongoose, { Schema } from 'mongoose';
import { ROLE_VALUES, STAFF_CATEGORIES } from '../utils/constants.js';

const userSchema = new Schema(
  {
    nameWithInitials: { type: String, required: true, trim: true },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    employeeNo: { type: String, trim: true },
    indexNo: { type: String, trim: true },
    staffCategory: { type: String, enum: Object.values(STAFF_CATEGORIES), required: true },
    department: { type: String, required: true, trim: true },
    faculty: { type: String, required: true, trim: true },
    contactNo: {
      type: String,
      trim: true,
      validate: {
        validator(value: unknown) {
          if (!value) return true;
          const normalized = String(value).trim();
          const digits = (normalized.match(/\d/g) || []).length;
          return digits >= 7 && digits <= 15 && /^[+]?[-()\s\d]+$/.test(normalized);
        },
        message: 'Contact number must be a valid phone number.'
      }
    },
    address: { type: String, trim: true },
    profileImageUrl: { type: String, trim: true },
    roles: [{ type: String, required: true }],
    isActive: { type: Boolean, default: true }
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      }
    }
  }
);

userSchema.index({ roles: 1, isActive: 1 });

export const UserModel = mongoose.model('User', userSchema);
