import { AlertTriangle } from 'lucide-react';
import { formatCurrency } from '../../utils/formatCurrency';
import type { FuelDuplicateRequest } from '../../types/request';

export function DuplicateFuelWarning({
  requests,
  audience
}: {
  requests: FuelDuplicateRequest[];
  audience: 'requester' | 'finance';
}) {
  if (!requests.length) return null;

  const message = audience === 'finance'
    ? 'This requester has another non-cancelled fuel request with the same type and amount. Please check whether it is the same bill before processing payment.'
    : 'You have a non-cancelled fuel request with the same type and amount. Please check whether this is the same bill before submitting.';

  return (
    <div role="alert" className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
      <div className="flex items-start gap-3">
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-700" />
        <div className="min-w-0">
          <h2 className="font-semibold">Possible duplicate fuel request</h2>
          <p className="mt-1">{message}</p>
          <ul className="mt-2 space-y-1">
            {requests.map((request) => (
              <li key={request.requestId}>
                <span className="font-semibold">{request.requestId}</span>
                {' · '}{request.title}
                {' · '}{formatCurrency(request.amount)}
                {' · '}{request.status.replace(/_/g, ' ').toLowerCase()}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}