import { Navigate, Outlet } from 'react-router-dom';
import type { Role } from '../../types/auth';
import { useAuth } from '../../hooks/useAuth';

export function RoleGuard({ roles }: { roles: Role[] }) {
  const { user } = useAuth();
  if (!user?.activeRole || !roles.includes(user.activeRole)) return <Navigate to="/unauthorized" replace />;
  return <Outlet />;
}
