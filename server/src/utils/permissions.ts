import { ADMIN_ROLES, APPROVER_ROLES, FINANCE_ROLES, ROLES, SUBMITTER_ROLES } from './constants.js';

export function canSubmit(role?: string) {
  return Boolean(role && SUBMITTER_ROLES.includes(role as any));
}

export function canApprove(role?: string) {
  return Boolean(role && APPROVER_ROLES.includes(role as any));
}

export function canProcessFinance(role?: string) {
  return Boolean(role && FINANCE_ROLES.includes(role as any));
}

export function canAdmin(role?: string) {
  return Boolean(role && ADMIN_ROLES.includes(role as any));
}

export function isPrivilegedReader(role?: string) {
  return Boolean(role && [...ADMIN_ROLES, ...APPROVER_ROLES, ...FINANCE_ROLES].includes(role as any));
}

export function normalizeRole(role?: string) {
  return role && Object.values(ROLES).includes(role as any) ? role : undefined;
}
