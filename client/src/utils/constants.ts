import type { Role } from '../types/auth';

export const ROLES: Role[] = [
  'REQUESTER',
  'LECTURER',
  'DEPARTMENT_COORDINATOR',
  'HOD',
  'ASSOCIATE_DEAN',
  'DEAN',
  'FINANCE_DIVISION',
  'APPROVING_AUTHORITY',
  'FINANCE_OFFICER',
  'ADMIN'
];

export const REQUESTER_ROLES: Role[] = ['REQUESTER', 'LECTURER'];
export const APPROVER_ROLES: Role[] = ['DEPARTMENT_COORDINATOR', 'HOD', 'ASSOCIATE_DEAN', 'DEAN', 'FINANCE_DIVISION', 'APPROVING_AUTHORITY'];
export const FINANCE_ROLES: Role[] = ['FINANCE_OFFICER'];
export const ADMIN_ROLES: Role[] = ['ADMIN'];

export const facultyName = 'Faculty of Engineering, University of Ruhuna';
export const systemTitle = 'Financial Request Management System';
