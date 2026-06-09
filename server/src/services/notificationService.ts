import { NotificationModel } from '../models/Notification.js';
import { UserModel } from '../models/User.js';
import { ROLES } from '../utils/constants.js';

export async function notifyUser(input: {
  user: string;
  title: string;
  message: string;
  type?: string;
  relatedRequest?: string;
}) {
  return NotificationModel.create(input);
}

export async function notifyRole(input: { role: string; title: string; message: string; type?: string; relatedRequest?: string }) {
  return NotificationModel.create(input);
}

export async function notifyAdmins(title: string, message: string) {
  const admins = await UserModel.find({ roles: ROLES.ADMIN, isActive: true }).select('_id');
  await NotificationModel.insertMany(
    admins.map((admin) => ({
      user: admin._id,
      title,
      message,
      type: 'ADMIN'
    }))
  );
}
