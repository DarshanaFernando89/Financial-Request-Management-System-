import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { approvalApi } from '../../api/approvalApi';
import { RequestTable } from '../../components/request/RequestTable';
import { StatusCard } from '../../components/ui/StatusCard';
import type { FinancialRequest } from '../../types/request';

export function ApproverDashboardPage() {
  const [pending, setPending] = useState<FinancialRequest[]>([]);
  const navigate = useNavigate();
  useEffect(() => {
    approvalApi.pending().then(setPending).catch(() => setPending([]));
  }, []);
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">Approver Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <StatusCard title="Pending Requests" value={pending.length} tone="blue" onClick={() => navigate('/approvals/pending')} />
        <StatusCard title="Clarifications" value={pending.filter((request) => request.status === 'INFO_REQUESTED').length} tone="red" />
        <StatusCard title="Total Value" value={`LKR ${pending.reduce((sum, request) => sum + request.amount, 0).toLocaleString()}`} tone="gold" />
      </div>
      <RequestTable requests={pending} reviewBase="/approvals/review" />
    </div>
  );
}
