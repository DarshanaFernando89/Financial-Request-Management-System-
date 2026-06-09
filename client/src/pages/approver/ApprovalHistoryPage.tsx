import { useEffect, useState } from 'react';
import { approvalApi } from '../../api/approvalApi';
import { RequestTable } from '../../components/request/RequestTable';
import type { FinancialRequest } from '../../types/request';

export function ApprovalHistoryPage() {
  const [requests, setRequests] = useState<FinancialRequest[]>([]);
  useEffect(() => {
    approvalApi.history().then(setRequests).catch(() => setRequests([]));
  }, []);
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">Approval History</h1>
      <RequestTable requests={requests} reviewBase="/requests" />
    </div>
  );
}
