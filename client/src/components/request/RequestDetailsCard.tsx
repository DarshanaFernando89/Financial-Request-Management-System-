import { Card } from '../ui/Card';
import { PageHeader } from '../layout/PageHeader';
import { RequestStatusBadge } from './RequestStatusBadge';
import { formatCurrency } from '../../utils/formatCurrency';
import { useRoleLabel } from '../../hooks/useRoleLabel';
import { formatDateTime } from '../../utils/formatDateTime';
import { Link } from 'react-router-dom';
import type { FinancialRequest, RequestType } from '../../types/request';

export function RequestDetailsCard({ request, duplicateWarningBase = '/requests' }: { request: FinancialRequest; duplicateWarningBase?: string }) {
  const label = useRoleLabel();
  const type = request.requestType as RequestType;
  return (
    <Card>
      <PageHeader
        title={request.title}
        eyebrow={request.requestId}
        description={type?.name || 'Request type'}
        actions={<RequestStatusBadge status={request.status} />}
      />
      {request.duplicateWarning && (
        <p role="alert" className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
          {request.duplicateWarning}{' '}
          {request.duplicateWarningRequestId && request.duplicateWarningReference && (
            <>Similar request: <Link className="underline" to={`${duplicateWarningBase}/${request.duplicateWarningRequestId}`}>{request.duplicateWarningReference}</Link>.</>
          )}
        </p>
      )}
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
          <dd className="font-semibold text-slate-900">{formatDateTime(request.submittedAt || request.createdAt)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Current Owner</dt>
          <dd className="font-semibold text-slate-900">{label(request.currentAssignedRole) || '-'}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Staff Category</dt>
          <dd className="font-semibold text-slate-900">{request.requesterSnapshot?.staffCategory?.replace('_', ' ')}</dd>
        </div>
      </dl>
      {request.description && (
        <div className="mt-5 rounded-md bg-slate-50 p-3">
          <h2 className="text-sm font-semibold text-slate-500">Description</h2>
          <p className="mt-1 text-sm text-slate-700">{request.description}</p>
        </div>
      )}
    </Card>
  );
}
