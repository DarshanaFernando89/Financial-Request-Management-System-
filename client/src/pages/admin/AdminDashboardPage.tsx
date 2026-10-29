import { ArrowRight, CreditCard, UserPlus, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api/adminApi';
import { PageHeader } from '../../components/layout/PageHeader';
import { RequestStatusBadge } from '../../components/request/RequestStatusBadge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { DashboardSkeleton } from '../../components/ui/DashboardSkeleton';
import { StatusCard } from '../../components/ui/StatusCard';
import { Toast } from '../../components/ui/Toast';
import { useDashboardData } from '../../hooks/useDashboardData';
import { Table } from '../../components/ui/Table';
import type { FinancialRequest } from '../../types/request';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';

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
  const { data, loading, error, retry } = useDashboardData<DashboardData>(adminApi.dashboard);

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
      <PageHeader title="Admin Dashboard" description="An overview of accounts, claims, and payment activity." />

      {loading ? <DashboardSkeleton /> : error ? (
        <Toast tone="red" message={error} action={<Button variant="outline" onClick={retry}>Try again</Button>} />
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
                      <RequestStatusBadge status={row.status} />
                    )
                  },
                  { key: 'created', header: 'Created', render: (row) => formatDate(row.createdAt) }
                ]}
              />
            ) : <EmptyState title="No claims yet" description="Newly submitted claims will appear here with their latest status and payment details." />}
          </Card>
        </>
      )}
    </div>
  );
}
