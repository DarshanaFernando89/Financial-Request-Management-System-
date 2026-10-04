import mongoose, { Schema } from 'mongoose';

const notificationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    role: { type: String },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, default: 'INFO' },
    relatedRequest: { type: Schema.Types.ObjectId, ref: 'Request' },
    relatedAccountRequest: { type: Schema.Types.ObjectId, ref: 'AccountRequest' },
    isRead: { type: Boolean, default: false }
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ role: 1, isRead: 1, createdAt: -1 });

export const NotificationModel = mongoose.model('Notification', notificationSchema);
