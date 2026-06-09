export type Role =
  | 'REQUESTER'
  | 'LECTURER'
  | 'DEPARTMENT_COORDINATOR'
  | 'HOD'
  | 'ASSOCIATE_DEAN'
  | 'DEAN'
  | 'FINANCE_DIVISION'
  | 'APPROVING_AUTHORITY'
  | 'FINANCE_OFFICER'
  | 'ADMIN';

export type StaffCategory = 'ACADEMIC' | 'NON_ACADEMIC';

export type User = {
  _id: string;
  nameWithInitials: string;
  fullName: string;
  email: string;
  employeeNo?: string;
  indexNo?: string;
  staffCategory: StaffCategory;
  department: string;
  faculty: string;
  contactNo?: string;
  address?: string;
  profileImageUrl?: string;
  roles: Role[];
  activeRole?: Role;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type LoginResponse = {
  token: string;
  requiresRoleSelection: boolean;
  user: User;
};
