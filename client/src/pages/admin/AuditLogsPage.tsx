import { useEffect, useState } from 'react';
import { auditApi } from '../../api/auditApi';
import { Table } from '../../components/ui/Table';
import { formatDate } from '../../utils/formatDate';
import type { AuditLog } from '../../types/audit';

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  useEffect(() => {
    auditApi.list().then(setLogs).catch(() => setLogs([]));
  }, []);
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">Audit Logs</h1>
      <Table
        rows={logs}
        columns={[
          { key: 'date', header: 'Date', render: (row) => formatDate(row.createdAt) },
          { key: 'action', header: 'Action', render: (row) => row.action },
          { key: 'entity', header: 'Entity', render: (row) => row.entityType },
          { key: 'role', header: 'Role', render: (row) => row.actorRole || '-' },
          { key: 'description', header: 'Description', render: (row) => row.description || '-' }
        ]}
      />
    </div>
  );
}
