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
      <h1 className="text-2xl font-bold text-slate-900">Finance Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <StatusCard title="Pending Payments" value={pending.length} tone="blue" onClick={() => navigate('/finance/pending-payments')} />
        <StatusCard title="Total Value" value={formatCurrency(pending.reduce((sum, request) => sum + request.amount, 0))} tone="gold" />
        <StatusCard title="Ready Today" value={pending.filter((request) => request.status === 'PAYMENT_PENDING').length} tone="green" />
      </div>
      <RequestTable requests={pending} reviewBase="/finance/review" />
    </div>
  );
}
