import type { Role } from '../types/auth';

export const roleLabels: Record<string, string> = {
  LECTURER: 'Lecturer',
  HOD: 'Head of Department',
  DEAN: 'Dean',
  FINANCE_OFFICER: 'Finance Officer',
  ADMIN: 'Admin'
};

export function roleLabel(role?: string, labels?: Record<string, string>) {
  return role && role !== 'REQUESTER' ? labels?.[role] || roleLabels[role as Role] || '' : '';
}
