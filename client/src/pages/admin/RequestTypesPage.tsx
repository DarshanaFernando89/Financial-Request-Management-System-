import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { adminApi } from '../../api/adminApi';
import { RequestTypeForm } from '../../components/admin/RequestTypeForm';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import type { RequestType } from '../../types/request';

export function RequestTypesPage() {
  const [types, setTypes] = useState<RequestType[]>([]);
  const [open, setOpen] = useState(false);
  async function load() {
    setTypes(await adminApi.requestTypes());
  }
  useEffect(() => {
    void load();
  }, []);
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Request Types</h1>
        <Button icon={<Plus size={16} />} onClick={() => setOpen(true)}>Create Request Type</Button>
      </div>
      <Table
        rows={types}
        columns={[
          { key: 'name', header: 'Name', render: (row) => row.name },
          { key: 'code', header: 'Code', render: (row) => row.code },
          { key: 'docs', header: 'Required Documents', render: (row) => row.requiredDocuments?.join(', ') || '-' },
          { key: 'status', header: 'Status', render: (row) => <Badge tone={row.isActive ? 'green' : 'gray'}>{row.isActive ? 'Active' : 'Inactive'}</Badge> }
        ]}
      />
      <Modal open={open} title="Create Request Type" onClose={() => setOpen(false)}>
        <RequestTypeForm onSubmit={async (payload) => {
          await adminApi.createRequestType(payload);
          setOpen(false);
          await load();
        }} />
      </Modal>
    </div>
  );
}
