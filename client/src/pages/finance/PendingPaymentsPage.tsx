import { useEffect, useState } from 'react';
import { financeApi } from '../../api/financeApi';
import { RequestTable } from '../../components/request/RequestTable';
import type { FinancialRequest } from '../../types/request';

export function PendingPaymentsPage() {
  const [requests, setRequests] = useState<FinancialRequest[]>([]);
  useEffect(() => {
    financeApi.pendingPayments().then(setRequests).catch(() => setRequests([]));
  }, []);
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">Pending Payments</h1>
      <RequestTable requests={requests} reviewBase="/finance/review" />
    </div>
  );
}
