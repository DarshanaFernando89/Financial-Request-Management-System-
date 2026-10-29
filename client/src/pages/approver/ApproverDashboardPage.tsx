import { PageHeader } from '../../components/layout/PageHeader';
import { ClipboardCheck, MessageSquare, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { approvalApi } from '../../api/approvalApi';
import { RequestTable } from '../../components/request/RequestTable';
import { StatusCard } from '../../components/ui/StatusCard';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { DashboardSkeleton } from '../../components/ui/DashboardSkeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Toast } from '../../components/ui/Toast';
import { useDashboardData } from '../../hooks/useDashboardData';
import { formatCurrency } from '../../utils/formatCurrency';

export function ApproverDashboardPage() {
  const { data, loading, error, retry } = useDashboardData(approvalApi.pending, 30000);
  const pending = data || [];
  const navigate = useNavigate();
  return (
    <div className="space-y-5">
      <PageHeader title="Approver Dashboard" description="Review assigned claims and keep approvals moving." />
      {loading ? <DashboardSkeleton /> : error ? <Toast tone="red" message={error} action={<Button variant="outline" onClick={retry}>Try again</Button>} /> : <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatusCard title="Pending Requests" caption="Assigned to your approval queue" icon={<ClipboardCheck size={20} />} value={pending.length} tone="blue" onClick={() => navigate('/approvals/pending')} />
        <StatusCard title="Clarifications" caption="Additional information requested" icon={<MessageSquare size={20} />} value={pending.filter((request) => request.status === 'INFO_REQUESTED').length} tone="red" />
        <StatusCard title="Total Value" caption="Combined value of queued claims" icon={<Wallet size={20} />} value={formatCurrency(pending.reduce((sum, request) => sum + request.amount, 0))} tone="gold" />
      </div>
      <Card className="space-y-4">
        <div><h2>Review queue</h2><p className="mt-1 text-sm text-slate-600">Open a claim to review its details and supporting documents.</p></div>
        {pending.length ? <RequestTable requests={pending} reviewBase="/approvals/review" /> : <EmptyState title="You're all caught up" description="Claims assigned to your role will appear here when they need review." />}
      </Card>
      </>}
    </div>
  );
}
