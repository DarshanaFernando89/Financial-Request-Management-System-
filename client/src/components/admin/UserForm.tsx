import { Save } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { adminApi } from '../../api/adminApi';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { APPROVER_ROLES, ROLES, visibleAssignedRoles } from '../../utils/constants';
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
    roles: initial ? visibleAssignedRoles(initial.roles, Object.keys(initial.roleLabels || Object.fromEntries(ROLES.map((code) => [code, code])))) : ['LECTURER'],
    approvalRolePasswords: {}
  });
  const [availableRoles, setAvailableRoles] = useState<Array<{ code: string; displayName: string; isActive: boolean }>>(
    []
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [rolesError, setRolesError] = useState('');
  const approvalRoles = availableRoles.filter((role) => APPROVER_ROLES.includes(role.code) || !ROLES.includes(role.code)).map((role) => role.code);
  const roleName = (code: string) => availableRoles.find((role) => role.code === code)?.displayName || roleLabel(code, initial?.roleLabels);

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
    if (rolesLoading || rolesError || !selectedRoles.length || selectedRoles.some((code) => !availableRoles.some((role) => role.code === code))) {
      setError('Select at least one available role.');
      return;
    }
    if (selectedRoles.length > 1) {
      const missingApprovalRole = selectedRoles.find(
        (role) =>
          approvalRoles.includes(role) &&
          !initial?.approvalRolePasswordConfiguredRoles?.includes(role) &&
          !String(form.approvalRolePasswords?.[role] || '').trim()
      );
      if (missingApprovalRole) {
        setError(`Approval password is required for ${roleName(missingApprovalRole)}.`);
        return;
      }
    }
    setSaving(true);
    try {
      const payload = { ...form };
      if (!includePassword) delete payload.password;
      payload.approvalRolePasswords = Object.fromEntries(
        Object.entries(form.approvalRolePasswords || {}).filter(([, value]) => String(value || '').trim())
      );
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
          {!rolesLoading && (form.roles as Role[]).filter((code) => !availableRoles.some((role) => role.code === code)).map((code) => (
            <div key={code} className="mt-2 flex items-center gap-2 text-sm text-slate-600">
              <span>{roleName(code) || 'Unavailable role'}</span>
              <Button variant="ghost" onClick={() => toggleRole(code)}>Remove</Button>
            </div>
          ))}
        </div>
        {rolesLoading && <p className="text-sm text-slate-500">Loading roles...</p>}
        {rolesError && <p className="text-sm font-medium text-red-600">{rolesError}</p>}
        {(form.roles as Role[]).some((role) => approvalRoles.includes(role)) && (
          <div>
            <p className="mb-2 text-sm font-semibold text-slate-700">Approving role passwords</p>
            <div className="grid gap-4 md:grid-cols-2">
              {(form.roles as Role[])
                .filter((role) => approvalRoles.includes(role))
                .map((role) => {
                  const configured = initial?.approvalRolePasswordConfiguredRoles?.includes(role);
                  return (
                    <PasswordInput
                      key={role}
                      label={`${roleName(role)} password${configured ? ' (set)' : ''}`}
                      placeholder={configured ? 'Leave blank to keep current' : 'Required for multi-role users'}
                      value={form.approvalRolePasswords[role] || ''}
                      onChange={(event) => setApprovalRolePassword(role, event.target.value)}
                    />
                  );
                })}
            </div>
          </div>
        )}
        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        <div className="flex justify-end">
          <Button type="submit" icon={<Save size={16} />} disabled={saving || rolesLoading || Boolean(rolesError)}>Save User</Button>
        </div>
      </Card>
    </form>
  );
}
