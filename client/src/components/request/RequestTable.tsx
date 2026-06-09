import { Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../ui/EmptyState';
import { Table } from '../ui/Table';
import { RequestStatusBadge } from './RequestStatusBadge';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import { roleLabel } from '../../utils/roleLabels';
import type { FinancialRequest, RequestType } from '../../types/request';

export function RequestTable({ requests, reviewBase = '/requests' }: { requests: FinancialRequest[]; reviewBase?: string }) {
  if (!requests.length) return <EmptyState title="No requests found" />;
  return (
    <Table
      rows={requests}
      columns={[
        { key: 'id', header: 'Request ID', render: (row) => <span className="font-semibold text-university-maroon">{row.requestId}</span> },
        { key: 'type', header: 'Type', render: (row) => (row.requestType as RequestType)?.name || '-' },
        { key: 'requester', header: 'Requester', render: (row) => row.requesterSnapshot?.name || '-' },
        { key: 'amount', header: 'Amount', render: (row) => formatCurrency(row.amount, row.currency) },
        { key: 'date', header: 'Submitted', render: (row) => formatDate(row.submittedAt || row.createdAt) },
        { key: 'status', header: 'Status', render: (row) => <RequestStatusBadge status={row.status} /> },
        { key: 'owner', header: 'Current Owner', render: (row) => roleLabel(row.currentAssignedRole) || '-' },
        {
          key: 'actions',
          header: 'Actions',
          render: (row) => (
            <Link
              className="inline-flex min-h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              to={`${reviewBase}/${row._id}`}
            >
              <Eye size={15} />
              View
            </Link>
          )
        }
      ]}
    />
  );
}
