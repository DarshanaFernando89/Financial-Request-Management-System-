import { useState, type FormEvent } from 'react';
import { LockKeyhole } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { userApi } from '../../api/userApi';
import { setAuthToken } from '../../api/apiClient';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { PasswordInput } from '../ui/PasswordInput';
import { Toast } from '../ui/Toast';

const emptyForm = { currentPassword: '', newPassword: '', confirmPassword: '' };

export function ChangePasswordForm({ email }: { email: string }) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { refreshUser } = useAuth();
  const navigate = useNavigate();
  const passwordsDoNotMatch = Boolean(form.confirmPassword) && form.newPassword !== form.confirmPassword;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if ([...form.newPassword].length < 8) {
      setError('New password must contain at least 8 characters.');
      return;
    }
    if (new TextEncoder().encode(form.newPassword).length > 72) {
      setError('New password is too long. Please choose a shorter password.');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }
    if (form.currentPassword === form.newPassword) {
      setError('Choose a new password different from your current password.');
      return;
    }
    setSaving(true);
    try {
      const response = await userApi.changePassword(form);
      setForm(emptyForm);
      setAuthToken(undefined);
      await refreshUser();
      navigate('/auth/login', { replace: true, state: { passwordChangedMessage: response.message } });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to change password. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="space-y-4">
      <div>
        <h2>Change Password</h2>
        <p id="password-help" className="mt-1 text-sm text-slate-600">
          Choose a password with at least 8 characters. After changing it, sign in again on each device.
        </p>
      </div>
      <form className="space-y-4" onSubmit={(event) => void submit(event)}>
        <input type="text" name="username" autoComplete="username" value={email} readOnly hidden />
        <div className="grid gap-4 md:grid-cols-3">
          <PasswordInput label="Current password" name="currentPassword" autoComplete="current-password" required disabled={saving}
            value={form.currentPassword} onChange={(event) => setForm({ ...form, currentPassword: event.target.value })} />
          <PasswordInput label="New password" name="newPassword" autoComplete="new-password" required disabled={saving}
            aria-describedby="password-help" minLength={8} maxLength={72}
            value={form.newPassword} onChange={(event) => setForm({ ...form, newPassword: event.target.value })} />
          <PasswordInput label="Confirm new password" name="confirmPassword" autoComplete="new-password" required disabled={saving}
            minLength={8} maxLength={72} aria-invalid={passwordsDoNotMatch}
            aria-describedby={passwordsDoNotMatch ? 'password-confirm-error' : undefined}
            value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} />
        </div>
        {passwordsDoNotMatch && <p id="password-confirm-error" role="alert" className="text-sm text-red-600">New password and confirmation do not match.</p>}
        {error && <Toast tone="red" message={error} />}
        <Button type="submit" disabled={saving || passwordsDoNotMatch} icon={<LockKeyhole size={16} />}>
          {saving ? 'Changing password...' : 'Change Password'}
        </Button>
      </form>
    </Card>
  );
}
