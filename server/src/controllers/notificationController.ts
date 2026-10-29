import { NotificationModel } from '../models/Notification.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { notificationForUser, notificationRecipientFilter, unreadNotificationFilter } from '../services/notificationReadService.js';

export const listNotifications = asyncHandler(async (req, res) => {
  const session = (req as any).user;
  const recipientFilter = notificationRecipientFilter(session);
  const loadItems = (filter: object, limit: number) => NotificationModel.find(filter)
    .populate('relatedRequest', 'requestId status currentAssignedRole')
    .populate('relatedAccountRequest', 'status')
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit);
  const unread = await loadItems({ ...recipientFilter, ...unreadNotificationFilter(session) }, 100);
  const read = unread.length < 100 ? await loadItems({
    _id: { $nin: unread.map((item) => item._id) },
    $and: [recipientFilter, { $or: [{ isRead: true }, { readBy: session.userId }] }]
  }, 100 - unread.length) : [];
  res.json({ items: [...unread, ...read].map((item) => notificationForUser(item, session.userId)) });
});

export const getNotification = asyncHandler(async (req, res) => {
  const session = (req as any).user;
  const item = await NotificationModel.findOne({ _id: req.params.id, ...notificationRecipientFilter(session) })
    .populate('relatedRequest', 'requestId status currentAssignedRole')
    .populate('relatedAccountRequest', 'status');
  if (!item) throw new ApiError(404, 'Notification not found.');
  res.json(notificationForUser(item, session.userId));
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  const session = (req as any).user;
  const item = await NotificationModel.findOneAndUpdate(
    { _id: req.params.id, ...notificationRecipientFilter(session) },
    { $addToSet: { readBy: session.userId } },
    { new: true }
  );
  if (!item) throw new ApiError(404, 'Notification not found.');
  res.json(notificationForUser(item, session.userId));
});

export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  const session = (req as any).user;
  await NotificationModel.updateMany(
    { ...notificationRecipientFilter(session), ...unreadNotificationFilter(session) },
    { $addToSet: { readBy: session.userId } }
  );
  res.json({ message: 'Notifications marked as read.' });
});
