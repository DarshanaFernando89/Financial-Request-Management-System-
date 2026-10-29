import { CheckCircle2, Clock3, FilePenLine, FilePlus2, MessageSquare } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { requestApi } from '../../api/requestApi';
import { Button } from '../../components/ui/Button';
import { StatusCard } from '../../components/ui/StatusCard';
import { RequestTable } from '../../components/request/RequestTable';
import type { RequestStatus } from '../../types/request';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { DashboardSkeleton } from '../../components/ui/DashboardSkeleton';
import { Toast } from '../../components/ui/Toast';
import { useDashboardData } from '../../hooks/useDashboardData';

const cards: { status: RequestStatus; title: string; caption: string; icon: ReactNode; tone: 'gold' | 'green' | 'red' | 'blue' | 'gray' }[] = [
  { status: 'DRAFT', title: 'Drafts', caption: 'Continue your saved claims', icon: <FilePenLine size={20} />, tone: 'gray' },
  { status: 'UNDER_REVIEW', title: 'Under Review', caption: 'Claims awaiting a decision', icon: <Clock3 size={20} />, tone: 'blue' },
  { status: 'INFO_REQUESTED', title: 'Clarification', caption: 'Claims needing your response', icon: <MessageSquare size={20} />, tone: 'red' },
  { status: 'PAID', title: 'Paid', caption: 'Payments completed', icon: <CheckCircle2 size={20} />, tone: 'green' }
];

export function RequesterDashboardPage() {
  const { data, loading, error, retry } = useDashboardData(requestApi.mine);
  const requests = data || [];
  const navigate = useNavigate();

  const counts = useMemo(() => {
    return requests.reduce<Record<string, number>>((acc, request) => {
      acc[request.status] = (acc[request.status] || 0) + 1;
      return acc;
    }, {});
  }, [requests]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Requester Dashboard"
        description="Financial and examination-related claims"
        actions={<Button icon={<FilePlus2 size={16} />} onClick={() => navigate('/requests/new')}>New Request</Button>}
      />
      {loading ? <DashboardSkeleton cards={4} /> : error ? <Toast tone="red" message={error} action={<Button variant="outline" onClick={retry}>Try again</Button>} /> : <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <StatusCard key={card.status} title={card.title} caption={card.caption} icon={card.icon} value={counts[card.status] || 0} tone={card.tone} onClick={() => navigate(`/requests/my?status=${card.status}`)} />
        ))}
      </div>
      <Card className="space-y-4">
        <div><h2>Recent requests</h2><p className="mt-1 text-sm text-slate-600">Follow the latest progress on your claims.</p></div>
        {requests.length ? <RequestTable requests={requests.slice(0, 8)} /> : <EmptyState title="Your first claim starts here" description="Create a request to submit your claim and follow its approval progress." action={<Button icon={<FilePlus2 size={16} />} onClick={() => navigate('/requests/new')}>New Request</Button>} />}
      </Card>
      </>}
    </div>
  );
}
