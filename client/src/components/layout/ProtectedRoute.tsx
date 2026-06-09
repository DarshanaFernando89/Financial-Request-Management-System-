import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useAuth } from '../../hooks/useAuth';

export function ProtectedRoute() {
  const { user, token, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <LoadingSpinner />
      </div>
    );
  }

  if (!token || !user) return <Navigate to="/auth/login" replace state={{ from: location }} />;
  if (user.roles.length > 1 && !user.activeRole) return <Navigate to="/auth/select-role" replace />;
  return <Outlet />;
}
