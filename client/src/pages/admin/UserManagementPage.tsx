import { KeyRound, Plus, ToggleLeft, ToggleRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { userApi } from '../../api/userApi';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { SearchInput } from '../../components/ui/SearchInput';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Toast } from '../../components/ui/Toast';
import { roleLabel } from '../../utils/roleLabels';
import { formatDate } from '../../utils/formatDate';
import type { User } from '../../types/auth';

const defaultResetPassword = 'Password123!';

export function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  async function load() {
    const data = await userApi.list({ search });
    setUsers(data.items);
  }

  useEffect(() => {
    void load();
  }, [search]);

  async function toggleActive(user: User) {
    if (user.roles.includes('ADMIN')) return;
    setMessage('');
    setError('');
    if (user.isActive) await userApi.deactivate(user._id);
    else await userApi.activate(user._id);
    await load();
  }

  async function confirmReset() {
    if (!resetUser || isResetting) return;
    setIsResetting(true);
    setMessage('');
    setError('');
    try {
      await userApi.resetPassword(resetUser._id, defaultResetPassword);
      setMessage(`${resetUser.nameWithInitials}'s password was reset to ${defaultResetPassword}.`);
      setResetUser(null);
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'Password reset failed.');
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
        <Link to="/admin/users/create">
          <Button icon={<Plus size={16} />}>Create User</Button>
        </Link>
      </div>
      <Toast message={message} tone="green" />
      <Toast message={error} tone="red" />
      <SearchInput placeholder="Search users" value={search} onChange={(event) => setSearch(event.target.value)} />
      {users.length ? (
        <Table
          rows={users}
          columns={[
            { key: 'name', header: 'Name', render: (row) => <Link className="font-semibold text-university-maroon" to={`/admin/users/${row._id}/edit`}>{row.nameWithInitials}</Link> },
            { key: 'email', header: 'Email', render: (row) => row.email },
            { key: 'category', header: 'Staff Category', render: (row) => row.staffCategory.replace('_', ' ') },
            { key: 'department', header: 'Department', render: (row) => row.department },
            { key: 'roles', header: 'Roles', render: (row) => <div className="flex flex-wrap gap-1">{row.roles.map((role) => <Badge key={role}>{roleLabel(role)}</Badge>)}</div> },
            { key: 'status', header: 'Status', render: (row) => <Badge tone={row.isActive ? 'green' : 'gray'}>{row.isActive ? 'Active' : 'Inactive'}</Badge> },
            { key: 'created', header: 'Created', render: (row) => formatDate(row.createdAt) },
            {
              key: 'actions',
              header: 'Actions',
              render: (row) => {
                const isAdmin = row.roles.includes('ADMIN');
                return (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      className="h-9 min-h-9 px-2"
                      icon={row.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                      disabled={isAdmin}
                      title={isAdmin ? 'Admin accounts cannot be deactivated' : row.isActive ? 'Deactivate user' : 'Activate user'}
                      onClick={() => void toggleActive(row)}
                    />
                    <Button
                      variant="outline"
                      className="h-9 min-h-9 px-2"
                      icon={<KeyRound size={16} />}
                      title={`Reset password to ${defaultResetPassword}`}
                      aria-label={`Reset ${row.nameWithInitials}'s password`}
                      onClick={() => {
                        setMessage('');
                        setError('');
                        setResetUser(row);
                      }}
                    />
                  </div>
                );
              }
            }
          ]}
        />
      ) : (
        <EmptyState title="No users found" />
      )}
      <ConfirmDialog
        open={Boolean(resetUser)}
        title="Reset Password"
        message={
          resetUser
            ? `Reset ${resetUser.nameWithInitials}'s password to ${defaultResetPassword}?`
            : ''
        }
        onConfirm={() => void confirmReset()}
        onClose={() => {
          if (!isResetting) setResetUser(null);
        }}
      />
    </div>
  );
}
