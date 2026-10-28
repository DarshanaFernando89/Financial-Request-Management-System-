import { Save } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { adminApi } from '../../api/adminApi';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { ROLES, visibleAssignedRoles } from '../../utils/constants';
import { isPhoneNumber } from '../../utils/validation';
import { roleLabel } from '../../utils/roleLabels';
import type { Role, User } from '../../types/auth';

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
    department: initial?.department || '',
    faculty: initial?.faculty || 'Faculty of Engineering, University of Ruhuna',
    contactNo: initial?.contactNo || '',
    address: initial?.address || '',
    roles: initial ? visibleAssignedRoles(initial.roles, Object.keys(initial.roleLabels || Object.fromEntries(ROLES.map((code) => [code, code])))).slice(0, 1) : ['LECTURER']
  });
  const [availableRoles, setAvailableRoles] = useState<Array<{ code: string; displayName: string; isActive: boolean }>>(
    []
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [rolesError, setRolesError] = useState('');

  useEffect(() => {
    adminApi
      .roles()
      .then((roles) => setAvailableRoles(roles.filter((role) => role.isActive && role.code !== 'REQUESTER')))
      .catch(() => setRolesError('Unable to load roles. Reopen this page to try again.'))
      .finally(() => setRolesLoading(false));
  }, []);

  function setValue(key: string, value: unknown) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (form.contactNo && !isPhoneNumber(form.contactNo)) {
      setError('Contact number must be a valid phone number.');
      return;
    }
    const selectedRoles = form.roles as Role[];
    if (rolesLoading || rolesError || selectedRoles.length !== 1 || selectedRoles.some((code) => !availableRoles.some((role) => role.code === code))) {
      setError('Select one available role.');
      return;
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
          <Select label="Account role" required value={form.roles[0] || ''} disabled={rolesLoading || Boolean(rolesError)}
            onChange={(event) => setValue('roles', [event.target.value])}
            options={availableRoles.map((role) => ({ value: role.code, label: role.displayName || roleLabel(role.code) }))} />
          <p className="mt-2 text-sm text-slate-500">Each account has one role. Create a separate authority account for approvals and use a Lecturer account to request claims.</p>
        </div>
        {rolesLoading && <p className="text-sm text-slate-500">Loading roles...</p>}
        {rolesError && <p className="text-sm font-medium text-red-600">{rolesError}</p>}
        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        <div className="flex justify-end">
          <Button type="submit" icon={<Save size={16} />} disabled={saving || rolesLoading || Boolean(rolesError)}>Save User</Button>
        </div>
      </Card>
    </form>
  );
}
