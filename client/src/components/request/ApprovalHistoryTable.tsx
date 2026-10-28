import { Table } from '../ui/Table';
import { EmptyState } from '../ui/EmptyState';
import { useRoleLabel } from '../../hooks/useRoleLabel';
import { formatDateTime } from '../../utils/formatDateTime';
import type { HistoryEntry } from '../../types/request';

export function ApprovalHistoryTable({ history }: { history: HistoryEntry[] }) {
  const label = useRoleLabel();
  if (!history?.length) return <EmptyState title="No approval activity yet" description="Decisions and reviewer remarks will appear here as your claim progresses." />;
  return (
    <Table
      rows={history || []}
      columns={[
        { key: 'date', header: 'Date', render: (row) => formatDateTime(row.createdAt) },
        { key: 'action', header: 'Action', render: (row) => row.action?.replace(/_/g, ' ') },
        { key: 'role', header: 'Role', render: (row) => label(row.role) },
        { key: 'remarks', header: 'Remarks', render: (row) => row.remarks || '-' }
      ]}
    />
  );
}
