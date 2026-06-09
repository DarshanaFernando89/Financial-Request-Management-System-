import { Card } from '../ui/Card';
import { RequestStatusBadge } from './RequestStatusBadge';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import { roleLabel } from '../../utils/roleLabels';
import type { FinancialRequest, RequestType } from '../../types/request';

export function RequestDetailsCard({ request }: { request: FinancialRequest }) {
  const type = request.requestType as RequestType;
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-university-maroon">{request.requestId}</p>
          <h1 className="mt-1 text-xl font-bold text-slate-900">{request.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{type?.name || 'Request type'}</p>
        </div>
        <RequestStatusBadge status={request.status} />
      </div>
      <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-slate-500">Requester</dt>
          <dd className="font-semibold text-slate-900">{request.requesterSnapshot?.name}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Department</dt>
          <dd className="font-semibold text-slate-900">{request.requesterSnapshot?.department}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Amount</dt>
          <dd className="font-semibold text-slate-900">{formatCurrency(request.amount, request.currency)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Date</dt>
          <dd className="font-semibold text-slate-900">{formatDate(request.submittedAt || request.createdAt)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Current Owner</dt>
          <dd className="font-semibold text-slate-900">{roleLabel(request.currentAssignedRole) || '-'}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Staff Category</dt>
          <dd className="font-semibold text-slate-900">{request.requesterSnapshot?.staffCategory?.replace('_', ' ')}</dd>
        </div>
      </dl>
      {request.description && <p className="mt-5 rounded-md bg-slate-50 p-3 text-sm text-slate-700">{request.description}</p>}
    </Card>
  );
}
