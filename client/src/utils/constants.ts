import type { Role } from '../types/auth';

export const ROLES: Role[] = [
  'REQUESTER',
  'LECTURER',
  'HOD',
  'DEAN',
  'FINANCE_OFFICER',
  'ADMIN'
];

export const REQUESTER_ROLES: Role[] = ['REQUESTER', 'LECTURER'];
export const APPROVER_ROLES: Role[] = ['HOD', 'DEAN'];
export const FINANCE_ROLES: Role[] = ['FINANCE_OFFICER'];
export const ADMIN_ROLES: Role[] = ['ADMIN'];

export function visibleAssignedRoles(roles: Role[] = []) {
  const uniqueRoles = Array.from(new Set(roles.filter(Boolean)));
  if (uniqueRoles.length <= 1) return uniqueRoles;
  return uniqueRoles.filter((role) => role !== 'REQUESTER');
}

export const facultyName = 'Faculty of Engineering, University of Ruhuna';
export const systemTitle = 'Financial Request Management System';
