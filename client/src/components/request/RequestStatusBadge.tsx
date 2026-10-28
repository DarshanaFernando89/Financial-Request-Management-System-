import { Badge } from '../ui/Badge';
import { statusLabel } from '../../utils/statusLabels';
import type { RequestStatus } from '../../types/request';

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  const tone =
    status === 'PAID' || status === 'APPROVED'
      ? 'green'
      : status === 'REJECTED' || status === 'INFO_REQUESTED'
        ? 'red'
        : status === 'PAYMENT_PENDING' || status === 'UNDER_REVIEW' || status === 'UNDER_VERIFICATION'
          ? 'blue'
          : status === 'DRAFT'
            ? 'gray'
            : 'gold';
  return <Badge tone={tone}><span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />{statusLabel(status)}</Badge>;
}
