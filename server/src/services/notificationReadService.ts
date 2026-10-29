import { NotificationModel } from '../models/Notification.js';

type NotificationSession = { userId: string; roles: string[] };

export function notificationRecipientFilter(session: NotificationSession) {
  return {
    $or: [{ user: session.userId }, { user: null, role: { $in: session.roles } }]
  };
}

export function unreadNotificationFilter(session: NotificationSession) {
  // Preserve legacy read status; new reads are recorded separately for each recipient.
  return { isRead: { $ne: true }, readBy: { $ne: session.userId } };
}

export function notificationForUser(item: any, userId: string) {
  const { readBy, ...notification } = item.toObject ? item.toObject() : item;
  return {
    ...notification,
    isRead: Boolean(notification.isRead || readBy?.some((id: any) => String(id) === userId))
  };
}

export async function markRequestNotificationsRead(
  session: NotificationSession,
  requestId: string,
  openedAt: Date
) {
  await NotificationModel.updateMany({
    ...notificationRecipientFilter(session),
    ...unreadNotificationFilter(session),
    relatedRequest: requestId,
    createdAt: { $lte: openedAt }
  }, { $addToSet: { readBy: session.userId } });
}
