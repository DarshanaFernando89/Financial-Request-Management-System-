import { NotificationModel } from '../models/Notification.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

export const listNotifications = asyncHandler(async (req, res) => {
  const session = (req as any).user;
  const items = await NotificationModel.find({
    $or: [{ user: session.userId }, { role: { $in: session.roles } }]
  })
    .populate('relatedRequest')
    .populate('relatedAccountRequest')
    .sort({ createdAt: -1 })
    .limit(100);
  res.json({ items });
});

export const getNotification = asyncHandler(async (req, res) => {
  const item = await NotificationModel.findById(req.params.id).populate('relatedRequest').populate('relatedAccountRequest');
  if (!item) throw new ApiError(404, 'Notification not found.');
  res.json(item);
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  const item = await NotificationModel.findByIdAndUpdate(req.params.id, { isRead: true }, { new: true });
  if (!item) throw new ApiError(404, 'Notification not found.');
  res.json(item);
});

export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  const session = (req as any).user;
  await NotificationModel.updateMany(
    { $or: [{ user: session.userId }, { role: { $in: session.roles } }] },
    { isRead: true }
  );
  res.json({ message: 'Notifications marked as read.' });
});
