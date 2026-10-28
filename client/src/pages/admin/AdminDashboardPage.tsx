import { StatusCard } from '../../components/ui/StatusCard';
import { ArrowRight, CreditCard, UserPlus, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api/adminApi';
import { PageHeader } from '../../components/layout/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Table } from '../../components/ui/Table';
import type { FinancialRequest } from '../../types/request';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import { statusLabel } from '../../utils/statusLabels';

type RecentClaim = Pick<FinancialRequest,
  '_id' | 'requestId' | 'title' | 'requester' | 'requesterSnapshot' | 'amount' | 'currency' | 'status' | 'createdAt'
>;

type DashboardData = {
  users: number;
  activeUsers?: number;
  pendingAccountRequests: number;
  pendingPayments: number;
  amountSummary?: { pendingPaymentAmount: number };
  recentRequests?: RecentClaim[];
};

export function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError('');
    adminApi.dashboard()
      .then((result: DashboardData) => {
        if (!cancelled) setData(result);
      })
      .catch(() => {
        if (!cancelled) setError('Unable to load the dashboard. Please try again.');
      });
    return () => { cancelled = true; };
  }, [attempt]);

  const summaries = data ? [
    {
      label: 'Pending account requests',
      tone: 'gold' as const,
      icon: <UserPlus size={20} />,
      value: data.pendingAccountRequests,
      detail: data.pendingAccountRequests ? 'Review access requests' : 'No requests awaiting review',
      to: '/admin/users'
    },
    {
      label: 'User accounts',
      tone: 'blue' as const,
      icon: <Users size={20} />,
      value: data.users,
      detail: data.activeUsers === undefined ? 'Manage accounts' : `${data.activeUsers} active`,
      to: '/admin/users'
    },
    {
      label: 'Awaiting payment',
      tone: 'green' as const,
      icon: <CreditCard size={20} />,
      value: data.pendingPayments,
      detail: data.amountSummary ? formatCurrency(data.amountSummary.pendingPaymentAmount) : 'View claims in reports',
      to: '/admin/reports'
    }
  ] : [];
  const recentClaims = data?.recentRequests?.slice(0, 5) || [];

  return (
    <div className="space-y-6">
      <PageHeader title="Admin Dashboard" />

      {error ? (
        <Card className="flex flex-wrap items-center justify-between gap-4">
          <p role="alert" className="text-sm text-red-700">{error}</p>
          <Button variant="outline" onClick={() => setAttempt((value) => value + 1)}>Try again</Button>
        </Card>
      ) : !data ? (
        <div role="status" className="flex items-center gap-3 py-10 text-sm text-slate-500">
          <LoadingSpinner /> Loading dashboard...
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {summaries.map((summary) => (
              <StatusCard key={summary.label} to={summary.to} title={summary.label} value={summary.value} caption={summary.detail} icon={summary.icon} tone={summary.tone} />
            ))}
          </div>

          <Card className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900">Recent claims</h2>
              <Link to="/admin/reports" className="focus-ring inline-flex items-center gap-2 rounded text-sm font-semibold text-university-maroon hover:underline">
                View reports <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
            {recentClaims.length ? (
              <Table
                rows={recentClaims}
                columns={[
                  {
                    key: 'claim', header: 'Claim', render: (row) => (
                      <div className="max-w-xs">
                        <Link to={`/requests/${row._id}`} className="focus-ring rounded font-semibold text-university-maroon hover:underline">{row.requestId}</Link>
                        <p className="mt-1 text-slate-500">{row.title}</p>
                      </div>
                    )
                  },
                  {
                    key: 'requester', header: 'Requested by', render: (row) =>
                      (typeof row.requester === 'object' && row.requester?.nameWithInitials) || row.requesterSnapshot?.name || '-'
                  },
                  { key: 'amount', header: 'Amount', align: 'right', render: (row) => formatCurrency(row.amount, row.currency) },
                  {
                    key: 'status', header: 'Status', render: (row) => (
                      <Badge tone={row.status === 'PAID' ? 'green' : row.status === 'PAYMENT_PENDING' ? 'gold' : 'gray'}>{statusLabel(row.status)}</Badge>
                    )
                  },
                  { key: 'created', header: 'Created', render: (row) => formatDate(row.createdAt) }
                ]}
              />
            ) : <EmptyState title="No claims yet" />}
          </Card>
        </>
      )}
    </div>
  );
}
