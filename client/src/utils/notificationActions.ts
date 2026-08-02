import type { Notification } from '../types/notification';
import type { Role } from '../types/auth';
import { APPROVER_ROLES, FINANCE_ROLES, REQUESTER_ROLES } from './constants';

type NotificationAction = {
  label: string;
  to: string;
};

function getTargetId(target: Notification['relatedAccountRequest']) {
  if (!target) return undefined;
  return typeof target === 'string' ? target : target._id;
}

export function getNotificationAction(notification: Notification, activeRole?: Role): NotificationAction | undefined {
  if (notification.relatedRequest?._id) {
    const request = notification.relatedRequest;

    if (
      activeRole &&
      APPROVER_ROLES.includes(activeRole) &&
      request.currentAssignedRole === activeRole &&
      ['SUBMITTED', 'UNDER_VERIFICATION', 'UNDER_REVIEW'].includes(request.status)
    ) {
      return {
        label: 'Review Request',
        to: `/approvals/review/${request._id}`
      };
    }

    if (
      activeRole &&
      FINANCE_ROLES.includes(activeRole) &&
      request.currentAssignedRole === activeRole &&
      request.status === 'PAYMENT_PENDING'
    ) {
      return {
        label: 'Process Payment',
        to: `/finance/review/${request._id}`
      };
    }

    if (activeRole && REQUESTER_ROLES.includes(activeRole) && request.status === 'INFO_REQUESTED') {
      return {
        label: 'Respond to Clarification',
        to: `/requests/${request._id}/respond-clarification`
      };
    }

    return {
      label: 'View Request',
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
    label: 'Open Admin Dashboard',
    to: '/'
  };
}
