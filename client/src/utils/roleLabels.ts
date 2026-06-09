import type { Role } from '../types/auth';

export const roleLabels: Record<Role, string> = {
  REQUESTER: 'Requester / Staff Member',
  LECTURER: 'Lecturer',
  DEPARTMENT_COORDINATOR: 'Department Coordinator',
  HOD: 'Head of Department',
  ASSOCIATE_DEAN: 'Associate Dean',
  DEAN: 'Dean',
  FINANCE_DIVISION: 'Financial Division',
  APPROVING_AUTHORITY: 'Approving Authority',
  FINANCE_OFFICER: 'Finance Officer',
  ADMIN: 'Admin'
};

export function roleLabel(role?: string) {
  return role ? roleLabels[role as Role] || role : '';
}
