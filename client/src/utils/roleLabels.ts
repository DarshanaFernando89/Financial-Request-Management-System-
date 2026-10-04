import type { Role } from '../types/auth';

export const roleLabels: Record<string, string> = {
  REQUESTER: 'Requester / Staff Member',
  LECTURER: 'Lecturer',
  HOD: 'Head of Department',
  DEAN: 'Dean',
  FINANCE_OFFICER: 'Finance Officer',
  ADMIN: 'Admin'
};

export function roleLabel(role?: string) {
  return role ? roleLabels[role as Role] || role : '';
}
