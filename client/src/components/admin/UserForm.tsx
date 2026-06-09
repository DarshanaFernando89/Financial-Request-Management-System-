import { Save } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { ROLES } from '../../utils/constants';
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
    department: initial?.department || 'Department of Electrical and Information Engineering',
    faculty: initial?.faculty || 'Faculty of Engineering, University of Ruhuna',
    contactNo: initial?.contactNo || '',
    address: initial?.address || '',
    roles: initial?.roles || ['REQUESTER']
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

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

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
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
          <Input label="Contact number" value={form.contactNo} onChange={(event) => setValue('contactNo', event.target.value)} />
          <Input label="Department" value={form.department} onChange={(event) => setValue('department', event.target.value)} />
          <Input label="Faculty" value={form.faculty} onChange={(event) => setValue('faculty', event.target.value)} />
        </div>
        <Textarea label="Address" value={form.address} onChange={(event) => setValue('address', event.target.value)} />
        <div>
          <p className="mb-2 text-sm font-semibold text-slate-700">Roles</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {ROLES.map((role) => (
              <label key={role} className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm">
                <input type="checkbox" checked={(form.roles as Role[]).includes(role)} onChange={() => toggleRole(role)} />
                <span>{roleLabel(role)}</span>
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
