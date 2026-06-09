import { CheckCircle2, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { adminApi } from '../../api/adminApi';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { roleLabel } from '../../utils/roleLabels';

type AccountRequest = {
  _id: string;
  fullName: string;
  email: string;
  department: string;
  faculty: string;
  requestedRole: string;
  message?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
};

export function AccountRequestsPage() {
  const [items, setItems] = useState<AccountRequest[]>([]);
  async function load() {
    setItems(await adminApi.accountRequests());
  }
  useEffect(() => {
    void load();
  }, []);
  async function approve(id: string) {
    await adminApi.approveAccountRequest(id, { password: 'Password123!' });
    await load();
  }
  async function reject(id: string) {
    await adminApi.rejectAccountRequest(id, 'Rejected by administrator.');
    await load();
  }
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">Account Requests</h1>
      <Table
        rows={items}
        columns={[
          { key: 'name', header: 'Name', render: (row) => row.fullName },
          { key: 'email', header: 'Email', render: (row) => row.email },
          { key: 'department', header: 'Department', render: (row) => row.department },
          { key: 'role', header: 'Requested Role', render: (row) => roleLabel(row.requestedRole) },
          { key: 'message', header: 'Message', render: (row) => <span className="block max-w-sm whitespace-normal text-sm text-slate-600">{row.message || '-'}</span> },
          { key: 'status', header: 'Status', render: (row) => <Badge tone={row.status === 'PENDING' ? 'gold' : row.status === 'APPROVED' ? 'green' : 'red'}>{row.status}</Badge> },
          {
            key: 'actions',
            header: 'Actions',
            render: (row) =>
              row.status === 'PENDING' ? (
                <div className="flex gap-2">
                  <Button className="h-9 min-h-9 px-2" icon={<CheckCircle2 size={16} />} onClick={() => void approve(row._id)} />
                  <Button className="h-9 min-h-9 px-2" variant="danger" icon={<XCircle size={16} />} onClick={() => void reject(row._id)} />
                </div>
              ) : (
                '-'
              )
          }
        ]}
      />
    </div>
  );
}
