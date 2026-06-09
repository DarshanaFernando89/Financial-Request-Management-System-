import { Table } from '../ui/Table';
import { roleLabel } from '../../utils/roleLabels';
import { formatDate } from '../../utils/formatDate';
import type { HistoryEntry } from '../../types/request';

export function ApprovalHistoryTable({ history }: { history: HistoryEntry[] }) {
  return (
    <Table
      rows={history || []}
      columns={[
        { key: 'date', header: 'Date', render: (row) => formatDate(row.createdAt) },
        { key: 'action', header: 'Action', render: (row) => row.action?.replace(/_/g, ' ') },
        { key: 'role', header: 'Role', render: (row) => roleLabel(row.role) },
        { key: 'remarks', header: 'Remarks', render: (row) => row.remarks || '-' }
      ]}
    />
  );
}
