import { CheckCircle2, KeyRound, Plus, ToggleLeft, ToggleRight, Trash2, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { adminApi } from '../../api/adminApi';
import { userApi } from '../../api/userApi';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { SearchInput } from '../../components/ui/SearchInput';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Toast } from '../../components/ui/Toast';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { roleLabel } from '../../utils/roleLabels';
import { formatDate } from '../../utils/formatDate';
import type { User } from '../../types/auth';
import { visibleAssignedRoles } from '../../utils/constants';

const defaultResetPassword = 'Password123!';

type AccountRequest = {
  _id: string;
  fullName: string;
  nameWithInitials: string;
  email: string;
  employeeNo?: string;
  indexNo?: string;
  staffCategory: 'ACADEMIC' | 'NON_ACADEMIC';
  department: string;
  faculty: string;
  contactNo?: string;
  address?: string;
  requestedRole: string;
  message?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt?: string;
};

export function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [accountRequests, setAccountRequests] = useState<AccountRequest[]>([]);
  const [search, setSearch] = useState('');
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [approveRequest, setApproveRequest] = useState<AccountRequest | null>(null);
  const [approvalRole, setApprovalRole] = useState('');
  const [availableRoles, setAvailableRoles] = useState<Array<{ code: string; displayName: string; isActive: boolean }>>([]);
  const availableCodes = availableRoles.map((role) => role.code);
  const roleNames = Object.fromEntries(availableRoles.map((role) => [role.code, role.displayName]));
  const [rejectRequest, setRejectRequest] = useState<AccountRequest | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isProcessingAccountRequest, setIsProcessingAccountRequest] = useState(false);
  const [searchParams] = useSearchParams();

  async function load() {
    const data = await userApi.list({ search });
    setUsers(data.items);
  }

  async function loadAccountRequests() {
    setAccountRequests(await adminApi.accountRequests({ status: 'PENDING' }));
  }

  useEffect(() => {
    void load();
  }, [search]);

  useEffect(() => {
    void loadAccountRequests();
    adminApi.roles().then((roles) => setAvailableRoles(roles.filter((role) => role.isActive && role.code !== 'REQUESTER'))).catch(() => setError('Unable to load available roles.'));
  }, []);

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

  async function confirmDelete() {
    if (!deleteUser || isDeleting) return;
    if (deleteUser.roles.includes('ADMIN')) {
      setError('Admin accounts cannot be deleted.');
      setDeleteUser(null);
      return;
    }
    setIsDeleting(true);
    setMessage('');
    setError('');
    try {
      await userApi.delete(deleteUser._id);
      setMessage(`${deleteUser.nameWithInitials} was deleted.`);
      setDeleteUser(null);
      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'User delete failed.');
    } finally {
      setIsDeleting(false);
    }
  }

  async function confirmApproveAccountRequest() {
    if (!approveRequest || isProcessingAccountRequest) return;
    if (!availableCodes.includes(approvalRole)) {
      setError('Choose an available role before approving this account request.');
      return;
    }
    setIsProcessingAccountRequest(true);
    setMessage('');
    setError('');
    try {
      await adminApi.approveAccountRequest(approveRequest._id, {
        password: defaultResetPassword,
        requestedRole: approvalRole,
        adminRemarks: 'Approved by admin from User Management.'
      });
      setMessage(`${approveRequest.fullName}'s account was approved. Default password: ${defaultResetPassword}.`);
      setApproveRequest(null);
      await Promise.all([load(), loadAccountRequests()]);
    } catch (approveError) {
      setError(approveError instanceof Error ? approveError.message : 'Account request approval failed.');
    } finally {
      setIsProcessingAccountRequest(false);
    }
  }

  async function confirmRejectAccountRequest() {
    if (!rejectRequest || isProcessingAccountRequest) return;
    setIsProcessingAccountRequest(true);
    setMessage('');
    setError('');
    try {
      await adminApi.rejectAccountRequest(rejectRequest._id, 'Rejected by admin from User Management.');
      setMessage(`${rejectRequest.fullName}'s account request was rejected.`);
      setRejectRequest(null);
      await loadAccountRequests();
    } catch (rejectError) {
      setError(rejectError instanceof Error ? rejectError.message : 'Account request rejection failed.');
    } finally {
      setIsProcessingAccountRequest(false);
    }
  }

  const focusedAccountRequestId = searchParams.get('accountRequest');

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
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Pending Account Access Requests</h2>
            <p className="text-sm text-slate-500">Approve new users directly from the admin user area.</p>
          </div>
          <Badge tone={accountRequests.length ? 'gold' : 'green'}>{accountRequests.length} pending</Badge>
        </div>
        {accountRequests.length ? (
          <Table
            rows={accountRequests}
            columns={[
              {
                key: 'name',
                header: 'Name',
                render: (row) => (
                  <div>
                    <span className={row._id === focusedAccountRequestId ? 'font-bold text-university-maroon' : 'font-semibold text-slate-900'}>
                      {row.fullName}
                    </span>
                    <p className="mt-1 text-xs text-slate-500">{row.nameWithInitials}</p>
                  </div>
                )
              },
              { key: 'email', header: 'Email', render: (row) => row.email },
              {
                key: 'details',
                header: 'Details',
                render: (row) => (
                  <div className="space-y-1 text-sm text-slate-600">
                    <p>{row.department}</p>
                    <p>{row.staffCategory.replace('_', ' ')}</p>
                    {row.employeeNo && <p>Emp: {row.employeeNo}</p>}
                    {row.indexNo && <p>Index: {row.indexNo}</p>}
                    {row.contactNo && <p>Contact: {row.contactNo}</p>}
                  </div>
                )
              },
              { key: 'role', header: 'Requested Role', render: (row) => <Badge>{roleLabel(row.requestedRole, roleNames) || 'Role assignment required'}</Badge> },
              { key: 'created', header: 'Requested', render: (row) => formatDate(row.createdAt) },
              {
                key: 'message',
                header: 'Message',
                render: (row) => (
                  <div className="max-w-xs space-y-1 text-sm text-slate-600">
                    {row.address && <p>{row.address}</p>}
                    <p>{row.message || '-'}</p>
                  </div>
                )
              },
              {
                key: 'actions',
                header: 'Actions',
                render: (row) => (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      className="h-9 min-h-9 border-green-200 px-2 text-green-700 hover:bg-green-50"
                      icon={<CheckCircle2 size={16} />}
                      onClick={() => {
                        setMessage('');
                        setError('');
                        setApproveRequest(row);
                        setApprovalRole(availableCodes.includes(row.requestedRole) ? row.requestedRole : '');
                      }}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      className="h-9 min-h-9 border-red-200 px-2 text-red-700 hover:bg-red-50"
                      icon={<XCircle size={16} />}
                      onClick={() => {
                        setMessage('');
                        setError('');
                        setRejectRequest(row);
                      }}
                    >
                      Reject
                    </Button>
                  </div>
                )
              }
            ]}
          />
        ) : (
          <EmptyState title="No pending account requests" />
        )}
      </Card>
      <SearchInput placeholder="Search users" value={search} onChange={(event) => setSearch(event.target.value)} />
      {users.length ? (
        <Table
          rows={users}
          columns={[
            { key: 'name', header: 'Name', render: (row) => <Link className="font-semibold text-university-maroon" to={`/admin/users/${row._id}/edit`}>{row.nameWithInitials}</Link> },
            { key: 'email', header: 'Email', render: (row) => row.email },
            { key: 'category', header: 'Staff Category', render: (row) => row.staffCategory.replace('_', ' ') },
            { key: 'department', header: 'Department', render: (row) => row.department },
            { key: 'roles', header: 'Roles', render: (row) => <div className="flex flex-wrap gap-1">{visibleAssignedRoles(row.roles, Object.keys(row.roleLabels || {})).map((role) => <Badge key={role}>{roleLabel(role, row.roleLabels)}</Badge>)}{!visibleAssignedRoles(row.roles, Object.keys(row.roleLabels || {})).length && <Badge>Role assignment required</Badge>}</div> },
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
                    <Button
                      variant="outline"
                      className="h-9 min-h-9 px-2 border-red-200 text-red-700 hover:bg-red-50"
                      icon={<Trash2 size={16} />}
                      disabled={isAdmin}
                      title={isAdmin ? 'Admin accounts cannot be deleted' : 'Delete user'}
                      aria-label={`Delete ${row.nameWithInitials}`}
                      onClick={() => {
                        setMessage('');
                        setError('');
                        setDeleteUser(row);
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
      <ConfirmDialog
        open={Boolean(deleteUser)}
        title="Delete User"
        message={
          deleteUser
            ? `Delete ${deleteUser.nameWithInitials}? This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        tone="danger"
        onConfirm={() => void confirmDelete()}
        onClose={() => {
          if (!isDeleting) setDeleteUser(null);
        }}
      />
      <Modal
        open={Boolean(approveRequest)}
        title="Approve Account Request"
        onClose={() => {
          if (!isProcessingAccountRequest) setApproveRequest(null);
        }}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Create an account for {approveRequest?.fullName}. The default password will be {defaultResetPassword}.</p>
          <Select label="Assigned role" required value={approvalRole} disabled={isProcessingAccountRequest} onChange={(event) => setApprovalRole(event.target.value)} options={availableRoles.map((role) => ({ value: role.code, label: role.displayName }))} />
          {error && <p className="text-sm font-medium text-red-600">{error}</p>}
          <div className="flex justify-end gap-3">
            <Button variant="outline" disabled={isProcessingAccountRequest} onClick={() => setApproveRequest(null)}>Cancel</Button>
            <Button disabled={isProcessingAccountRequest || !availableCodes.includes(approvalRole)} onClick={() => void confirmApproveAccountRequest()}>Approve</Button>
          </div>
        </div>
      </Modal>
      <ConfirmDialog
        open={Boolean(rejectRequest)}
        title="Reject Account Request"
        message={
          rejectRequest
            ? `Reject ${rejectRequest.fullName}'s account request?`
            : ''
        }
        confirmLabel="Reject"
        tone="danger"
        onConfirm={() => void confirmRejectAccountRequest()}
        onClose={() => {
          if (!isProcessingAccountRequest) setRejectRequest(null);
        }}
      />
    </div>
  );
}
