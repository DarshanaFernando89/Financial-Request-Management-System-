import { Plus, Trash2 } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { adminApi } from '../../api/adminApi';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import { Textarea } from '../../components/ui/Textarea';

type ManagedRole = {
  _id: string;
  code: string;
  displayName: string;
  description?: string;
  isActive: boolean;
  isSystem?: boolean;
};

export function RoleManagementPage() {
  const [roles, setRoles] = useState<ManagedRole[]>([]);
  const [form, setForm] = useState({ displayName: '', code: '', description: '' });
  const [error, setError] = useState('');

  async function load() {
    setRoles(await adminApi.roles());
  }

  useEffect(() => {
    void load();
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    const requestedCode = String(form.code || form.displayName)
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    if (requestedCode === 'ADMIN') {
      setError('Admin role already exists and cannot be created.');
      return;
    }
    try {
      await adminApi.createRole(form);
      setForm({ displayName: '', code: '', description: '' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create role.');
    }
  }

  async function handleDelete(role: ManagedRole) {
    if (role.code === 'ADMIN') return;
    if (!window.confirm(`Delete role "${role.displayName}"?`)) return;
    try {
      await adminApi.deleteRole(role._id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete role.');
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">Role Management</h1>
      <form onSubmit={(event) => void submit(event)}>
        <Card className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Display name" required value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} />
            <Input label="Role code" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} />
          </div>
          <Textarea label="Description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          {error && <p className="text-sm font-medium text-red-600">{error}</p>}
          <div className="flex justify-end">
            <Button type="submit" icon={<Plus size={16} />}>Create Role</Button>
          </div>
        </Card>
      </form>
      <Table
        rows={roles}
        columns={[
          { key: 'name', header: 'Role', render: (row) => row.displayName },
          { key: 'code', header: 'Code', render: (row) => row.code },
          { key: 'description', header: 'Description', render: (row) => row.description || '-' },
          { key: 'type', header: 'Type', render: (row) => <Badge tone={row.isSystem ? 'blue' : 'gold'}>{row.isSystem ? 'System' : 'Custom'}</Badge> },
          {
            key: 'status',
            header: 'Status',
            render: (row) => (
              <Badge tone={row.isActive ? 'green' : 'gray'}>{row.isActive ? 'Active' : 'Inactive'}</Badge>
            )
          },
          {
            key: 'actions',
            header: 'Actions',
            render: (row) => {
              const isAdminRole = row.code === 'ADMIN';
              return (
                <Button
                  type="button"
                  variant="secondary"
                  icon={<Trash2 size={14} />}
                  disabled={isAdminRole}
                  title={isAdminRole ? 'Admin role cannot be deleted' : 'Delete role'}
                  onClick={() => void handleDelete(row)}
                >
                  Delete
                </Button>
              );
            }
          }
        ]}
      />
    </div>
  );
}
