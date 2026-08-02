import { ShieldCheck } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { PasswordInput } from '../../components/ui/PasswordInput';
import { useAuth } from '../../hooks/useAuth';
import { APPROVER_ROLES } from '../../utils/constants';
import { roleLabel } from '../../utils/roleLabels';
import type { Role } from '../../types/auth';

export function RoleSelectionPage() {
  const { user, selectRole } = useAuth();
  const navigate = useNavigate();
  const [pendingRole, setPendingRole] = useState<Role | null>(null);
  const [approvalRolePassword, setApprovalRolePassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  if (!user) return <Navigate to="/auth/login" replace />;

  function needsApprovalPassword(role: Role) {
    return Boolean(user && user.roles.length > 1 && APPROVER_ROLES.includes(role));
  }

  async function choose(role: Role, password?: string) {
    await selectRole(role, password);
    navigate('/', { replace: true });
  }

  function startChoose(role: Role) {
    setError('');
    if (needsApprovalPassword(role)) {
      setApprovalRolePassword('');
      setPendingRole(role);
      return;
    }
    void choose(role);
  }

  async function submitApprovalPassword(event: FormEvent) {
    event.preventDefault();
    if (!pendingRole) return;
    setError('');
    setSubmitting(true);
    try {
      await choose(pendingRole, approvalRolePassword);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to select role.');
    } finally {
      setSubmitting(false);
    }
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
            <Button onClick={() => startChoose(role)}>Continue</Button>
          </Card>
        ))}
      </div>
      <Modal
        open={Boolean(pendingRole)}
        title={`${roleLabel(pendingRole || '')} Password`}
        onClose={() => {
          setPendingRole(null);
          setError('');
        }}
      >
        <form className="space-y-4" onSubmit={(event) => void submitApprovalPassword(event)}>
          <PasswordInput
            label="Approval password"
            required
            autoFocus
            value={approvalRolePassword}
            onChange={(event) => setApprovalRolePassword(event.target.value)}
          />
          {error && <p className="text-sm font-medium text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setPendingRole(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              Continue
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
