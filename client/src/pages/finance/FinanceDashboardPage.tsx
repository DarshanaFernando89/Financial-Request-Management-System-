import { BadgeCheck, CreditCard, Wallet } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { financeApi } from '../../api/financeApi';
import { RequestTable } from '../../components/request/RequestTable';
import { StatusCard } from '../../components/ui/StatusCard';
import { formatCurrency } from '../../utils/formatCurrency';
import type { FinancialRequest } from '../../types/request';

export function FinanceDashboardPage() {
  const [pending, setPending] = useState<FinancialRequest[]>([]);
  const navigate = useNavigate();
  useEffect(() => {
    financeApi.pendingPayments().then(setPending).catch(() => setPending([]));
  }, []);
  return (
    <div className="space-y-5">
      <PageHeader title="Finance Dashboard" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatusCard title="Pending Payments" caption="Claims in your payment queue" icon={<CreditCard size={20} />} value={pending.length} tone="blue" onClick={() => navigate('/finance/pending-payments')} />
        <StatusCard title="Total Value" caption="Combined value awaiting payment" icon={<Wallet size={20} />} value={formatCurrency(pending.reduce((sum, request) => sum + request.amount, 0))} tone="gold" />
        <StatusCard title="Ready for Payment" caption="Approved and ready to process" icon={<BadgeCheck size={20} />} value={pending.filter((request) => request.status === 'PAYMENT_PENDING').length} tone="green" />
      </div>
      <RequestTable requests={pending} reviewBase="/finance/review" />
    </div>
  );
}
