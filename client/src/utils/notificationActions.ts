import type { Notification } from '../types/notification';

type NotificationAction = {
  label: string;
  to: string;
};

function getTargetId(target: Notification['relatedAccountRequest']) {
  if (!target) return undefined;
  return typeof target === 'string' ? target : target._id;
}

export function getNotificationAction(notification: Notification): NotificationAction | undefined {
  if (notification.relatedRequest?._id) {
    return {
      label: 'Open Request',
      to: `/requests/${notification.relatedRequest._id}`
    };
  }

  const accountRequestId = getTargetId(notification.relatedAccountRequest);
  const isAccountRequest =
    notification.type === 'ACCOUNT_REQUEST' ||
    Boolean(accountRequestId) ||
    notification.title.toLowerCase().includes('account request');

  if (!isAccountRequest) return undefined;

  return {
    label: 'Review Account Request',
    to: accountRequestId ? `/admin/account-requests?focus=${accountRequestId}` : '/admin/account-requests'
  };
}
