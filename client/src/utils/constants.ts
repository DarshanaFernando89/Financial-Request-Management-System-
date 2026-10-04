import type { Role } from '../types/auth';

export const ROLES: Role[] = [
  'LECTURER',
  'HOD',
  'DEAN',
  'FINANCE_OFFICER',
  'ADMIN'
];

export const REQUESTER_ROLES: Role[] = ['LECTURER'];
export const APPROVER_ROLES: Role[] = ['HOD', 'DEAN'];
export const FINANCE_ROLES: Role[] = ['FINANCE_OFFICER'];
export const ADMIN_ROLES: Role[] = ['ADMIN'];

export function visibleAssignedRoles(roles: Role[] = [], availableRoles: Role[] = ROLES) {
  return Array.from(new Set(roles.filter((role) => role !== 'REQUESTER' && availableRoles.includes(role))));
}

export const facultyName = 'Faculty of Engineering, University of Ruhuna';
export const systemTitle = 'Financial Request Management System';
