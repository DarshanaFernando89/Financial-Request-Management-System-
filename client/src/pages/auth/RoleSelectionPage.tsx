import { ShieldCheck } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useAuth } from '../../hooks/useAuth';
import { roleLabel } from '../../utils/roleLabels';
import type { Role } from '../../types/auth';

export function RoleSelectionPage() {
  const { user, selectRole } = useAuth();
  const navigate = useNavigate();
  if (!user) return <Navigate to="/auth/login" replace />;

  async function choose(role: Role) {
    await selectRole(role);
    navigate('/', { replace: true });
  }

  return (
    <div className="w-full max-w-3xl">
      <h2 className="mb-5 text-center text-xl font-bold text-slate-900">Select Active Role</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {user.roles.map((role) => (
          <Card key={role} className="flex flex-col gap-4">
            <ShieldCheck className="text-university-maroon" size={28} />
            <div>
              <h3 className="font-bold text-slate-900">Continue as {roleLabel(role)}</h3>
              <p className="mt-1 text-sm text-slate-500">{user.department}</p>
            </div>
            <Button onClick={() => void choose(role)}>Continue</Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
