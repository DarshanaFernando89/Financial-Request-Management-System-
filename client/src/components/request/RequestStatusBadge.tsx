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
  return <Badge tone={tone}>{statusLabel(status)}</Badge>;
}
