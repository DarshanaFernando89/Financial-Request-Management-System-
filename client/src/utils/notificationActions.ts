import type { Notification } from '../types/notification';
import type { Role } from '../types/auth';
import { APPROVER_ROLES, FINANCE_ROLES, REQUESTER_ROLES } from './constants';
import { isEmail } from './validation';

type NotificationAction = {
  label: string;
  to: string;
  openDirectly?: boolean;
};

function getTargetId(target: Notification['relatedAccountRequest']) {
  if (!target) return undefined;
  return typeof target === 'string' ? target : target._id;
}

export function getNotificationAction(notification: Notification, activeRole?: Role, approvalRoles: Role[] = APPROVER_ROLES): NotificationAction | undefined {
  const isPasswordReset = notification.type === 'PASSWORD_RESET'
    || notification.title.trim().toLowerCase() === 'password reset requested';
  if (isPasswordReset) {
    if (activeRole !== 'ADMIN') return undefined;
    const userId = typeof notification.relatedUser === 'string' ? notification.relatedUser : notification.relatedUser?._id;
    if (userId) {
      return { label: 'Reset Password', to: `/admin/users?resetPassword=${encodeURIComponent(userId)}`, openDirectly: true };
    }
    // Older notifications have only the original message. Resolve the exact email
    // through the admin API before displaying a confirmation; never reset on navigation.
    const email = notification.message.match(/^(.+) requested a password reset\.$/)?.[1]?.trim().toLowerCase();
    if (email && isEmail(email)) {
      return { label: 'Reset Password', to: `/admin/users?resetPasswordEmail=${encodeURIComponent(email)}`, openDirectly: true };
    }
    return { label: 'View Users', to: '/admin/users' };
  }
  if (notification.relatedRequest?._id) {
    const request = notification.relatedRequest;

    if (
      activeRole &&
      approvalRoles.includes(activeRole) &&
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
        to: `/requests/${request._id}`,
        openDirectly: true
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
    label: 'Review Account Request',
    to: accountRequestId ? `/admin/users?accountRequest=${accountRequestId}` : '/admin/users'
  };
}
