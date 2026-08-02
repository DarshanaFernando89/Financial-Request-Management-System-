import { Save } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { adminApi } from '../../api/adminApi';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { APPROVER_ROLES, ROLES } from '../../utils/constants';
import { isPhoneNumber } from '../../utils/validation';
import { roleLabel } from '../../utils/roleLabels';
import type { Role, User } from '../../types/auth';
import { PasswordInput } from '../ui/PasswordInput';

type UserFormProps = {
  initial?: Partial<User>;
  includePassword?: boolean;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
};

export function UserForm({ initial, includePassword = false, onSubmit }: UserFormProps) {
  const [form, setForm] = useState<Record<string, any>>({
    nameWithInitials: initial?.nameWithInitials || '',
    fullName: initial?.fullName || '',
    email: initial?.email || '',
    password: '',
    employeeNo: initial?.employeeNo || '',
    indexNo: initial?.indexNo || '',
    staffCategory: initial?.staffCategory || 'ACADEMIC',
    department: initial?.department || 'Department of Electrical and Information Engineering',
    faculty: initial?.faculty || 'Faculty of Engineering, University of Ruhuna',
    contactNo: initial?.contactNo || '',
    address: initial?.address || '',
    roles: initial?.roles || ['REQUESTER'],
    approvalRolePasswords: {}
  });
  const [availableRoles, setAvailableRoles] = useState<Array<{ code: string; displayName: string; isActive: boolean }>>(
    ROLES.map((role) => ({ code: role, displayName: roleLabel(role), isActive: true }))
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminApi
      .roles()
      .then((roles) => setAvailableRoles(roles.filter((role) => role.isActive)))
      .catch(() => setAvailableRoles(ROLES.map((role) => ({ code: role, displayName: roleLabel(role), isActive: true }))));
  }, []);

  function setValue(key: string, value: unknown) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleRole(role: Role) {
    setForm((current) => {
      const roles = new Set(current.roles as Role[]);
      if (roles.has(role)) roles.delete(role);
      else roles.add(role);
      return { ...current, roles: Array.from(roles) };
    });
  }
  function setApprovalRolePassword(role: Role, value: string) {
    setForm((current) => ({
      ...current,
      approvalRolePasswords: {
        ...(current.approvalRolePasswords || {}),
        [role]: value
      }
    }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (form.contactNo && !isPhoneNumber(form.contactNo)) {
      setError('Contact number must be a valid phone number.');
      return;
    }
    const selectedRoles = form.roles as Role[];
    if (selectedRoles.length > 1) {
      const missingApprovalRole = selectedRoles.find(
        (role) =>
          APPROVER_ROLES.includes(role) &&
          !initial?.approvalRolePasswordConfiguredRoles?.includes(role) &&
          !String(form.approvalRolePasswords?.[role] || '').trim()
      );
      if (missingApprovalRole) {
        setError(`Approval password is required for ${roleLabel(missingApprovalRole)}.`);
        return;
      }
    }
    setSaving(true);
    try {
      const payload = { ...form };
      if (!includePassword) delete payload.password;
      await onSubmit(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save user.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)}>
      <Card className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Name with initials" required value={form.nameWithInitials} onChange={(event) => setValue('nameWithInitials', event.target.value)} />
          <Input label="Full name" required value={form.fullName} onChange={(event) => setValue('fullName', event.target.value)} />
          <Input label="Email" type="email" required value={form.email} onChange={(event) => setValue('email', event.target.value)} />
          {includePassword && <Input label="Password" type="password" required value={form.password} onChange={(event) => setValue('password', event.target.value)} />}
          <Input label="Employee number" value={form.employeeNo} onChange={(event) => setValue('employeeNo', event.target.value)} />
          <Input label="Index number" value={form.indexNo} onChange={(event) => setValue('indexNo', event.target.value)} />
          <Select
            label="Staff category"
            value={form.staffCategory}
            onChange={(event) => setValue('staffCategory', event.target.value)}
            options={[
              { label: 'Academic', value: 'ACADEMIC' },
              { label: 'Non-academic', value: 'NON_ACADEMIC' }
            ]}
          />
          <Input
            label="Contact number"
            type="tel"
            inputMode="tel"
            pattern="\+?[0-9\s\-()]{7,25}"
            value={form.contactNo}
            onChange={(event) => setValue('contactNo', event.target.value)}
          />
          <Input label="Department" value={form.department} onChange={(event) => setValue('department', event.target.value)} />
          <Input label="Faculty" value={form.faculty} onChange={(event) => setValue('faculty', event.target.value)} />
        </div>
        <Textarea label="Address" value={form.address} onChange={(event) => setValue('address', event.target.value)} />
        <div>
          <p className="mb-2 text-sm font-semibold text-slate-700">Roles</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {availableRoles.map((role) => (
              <label key={role.code} className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm">
                <input type="checkbox" checked={(form.roles as Role[]).includes(role.code)} onChange={() => toggleRole(role.code)} />
                <span>{role.displayName || roleLabel(role.code)}</span>
              </label>
            ))}
          </div>
        </div>
        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        <div className="flex justify-end">
          <Button type="submit" icon={<Save size={16} />} disabled={saving}>Save User</Button>
        </div>
      </Card>
    </form>
  );
}
