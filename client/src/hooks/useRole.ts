import type { Role } from '../types/auth';
import { ADMIN_ROLES, APPROVER_ROLES, FINANCE_ROLES, REQUESTER_ROLES } from '../utils/constants';
import { useAuth } from './useAuth';

export function useRole() {
  const { user } = useAuth();
  const activeRole = user?.activeRole;
  const hasRole = (roles: Role[]) => Boolean(activeRole && roles.includes(activeRole));
  return {
    activeRole,
    isRequester: hasRole(REQUESTER_ROLES),
    isApprover: hasRole(APPROVER_ROLES),
    isFinance: hasRole(FINANCE_ROLES),
    isAdmin: hasRole(ADMIN_ROLES),
    hasRole
  };
}
