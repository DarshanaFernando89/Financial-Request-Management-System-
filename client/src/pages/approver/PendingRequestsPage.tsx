import { useEffect, useState } from 'react';
import { approvalApi } from '../../api/approvalApi';
import { RequestTable } from '../../components/request/RequestTable';
import type { FinancialRequest } from '../../types/request';

export function PendingRequestsPage() {
  const [requests, setRequests] = useState<FinancialRequest[]>([]);
  useEffect(() => {
    approvalApi.pending().then(setRequests).catch(() => setRequests([]));
  }, []);
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">Pending Requests</h1>
      <RequestTable requests={requests} reviewBase="/approvals/review" />
    </div>
  );
}
