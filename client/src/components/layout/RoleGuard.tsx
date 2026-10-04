import { Navigate, Outlet } from 'react-router-dom';
import type { Role } from '../../types/auth';
import { useAuth } from '../../hooks/useAuth';

export function RoleGuard({ roles, approvals = false }: { roles?: Role[]; approvals?: boolean }) {
  const { user } = useAuth();
  const allowed = approvals ? user?.approvalRoles || [] : roles || [];
  if (!user?.activeRole || !user.roles.includes(user.activeRole) || !allowed.includes(user.activeRole)) return <Navigate to="/unauthorized" replace />;
  return <Outlet />;
}
