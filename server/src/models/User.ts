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
    contactNo: { type: String, trim: true },
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
