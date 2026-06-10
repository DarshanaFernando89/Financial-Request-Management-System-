import { NotificationModel } from '../models/Notification.js';
import { UserModel } from '../models/User.js';
import { ROLES } from '../utils/constants.js';

type NotificationInput = {
  user: string;
  title: string;
  message: string;
  type?: string;
  relatedRequest?: string;
  relatedAccountRequest?: string;
};

type RoleNotificationInput = Omit<NotificationInput, 'user'> & {
  role: string;
};

type AdminNotificationOptions = {
  type?: string;
  relatedRequest?: string;
  relatedAccountRequest?: string;
};

export async function notifyUser(input: NotificationInput) {
  return NotificationModel.create(input);
}

export async function notifyRole(input: RoleNotificationInput) {
  return NotificationModel.create(input);
}

export async function notifyAdmins(title: string, message: string, options: AdminNotificationOptions = {}) {
  const admins = await UserModel.find({ roles: ROLES.ADMIN, isActive: true }).select('_id');
  await NotificationModel.insertMany(
    admins.map((admin) => ({
      user: admin._id,
      title,
      message,
      type: options.type || 'ADMIN',
      relatedRequest: options.relatedRequest,
      relatedAccountRequest: options.relatedAccountRequest
    }))
  );
}
