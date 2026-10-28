import { PageHeader } from '../../components/layout/PageHeader';
import { BadgeCheck, CreditCard, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { financeApi } from '../../api/financeApi';
import { RequestTable } from '../../components/request/RequestTable';
import { StatusCard } from '../../components/ui/StatusCard';
import { formatCurrency } from '../../utils/formatCurrency';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { DashboardSkeleton } from '../../components/ui/DashboardSkeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Toast } from '../../components/ui/Toast';
import { useDashboardData } from '../../hooks/useDashboardData';

export function FinanceDashboardPage() {
  const { data, loading, error, retry } = useDashboardData(financeApi.pendingPayments);
  const pending = data || [];
  const navigate = useNavigate();
  return (
    <div className="space-y-5">
      <PageHeader title="Finance Dashboard" description="Track approved claims and manage outstanding payments." />
      {loading ? <DashboardSkeleton /> : error ? <Toast tone="red" message={error} action={<Button variant="outline" onClick={retry}>Try again</Button>} /> : <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatusCard title="Pending Payments" caption="Claims in your payment queue" icon={<CreditCard size={20} />} value={pending.length} tone="blue" onClick={() => navigate('/finance/pending-payments')} />
        <StatusCard title="Total Value" caption="Combined value awaiting payment" icon={<Wallet size={20} />} value={formatCurrency(pending.reduce((sum, request) => sum + request.amount, 0))} tone="gold" />
        <StatusCard title="Ready for Payment" caption="Approved and ready to process" icon={<BadgeCheck size={20} />} value={pending.filter((request) => request.status === 'PAYMENT_PENDING').length} tone="green" />
      </div>
      <Card className="space-y-4">
        <div><h2>Payment queue</h2><p className="mt-1 text-sm text-slate-600">Review payment details before completing a claim.</p></div>
        {pending.length ? <RequestTable requests={pending} reviewBase="/finance/review" /> : <EmptyState title="No payments waiting" description="Approved claims will appear here when they are ready for payment." />}
      </Card>
      </>}
    </div>
  );
}
