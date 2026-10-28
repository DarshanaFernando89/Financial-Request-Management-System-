import { formatCurrency } from '../../utils/formatCurrency';
import { ClipboardCheck, MessageSquare, Wallet } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
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
      <PageHeader title="Approver Dashboard" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatusCard title="Pending Requests" caption="Assigned to your approval queue" icon={<ClipboardCheck size={20} />} value={pending.length} tone="blue" onClick={() => navigate('/approvals/pending')} />
        <StatusCard title="Clarifications" caption="Additional information requested" icon={<MessageSquare size={20} />} value={pending.filter((request) => request.status === 'INFO_REQUESTED').length} tone="red" />
        <StatusCard title="Total Value" caption="Combined value of queued claims" icon={<Wallet size={20} />} value={formatCurrency(pending.reduce((sum, request) => sum + request.amount, 0))} tone="gold" />
      </div>
      <RequestTable requests={pending} reviewBase="/approvals/review" />
    </div>
  );
}
