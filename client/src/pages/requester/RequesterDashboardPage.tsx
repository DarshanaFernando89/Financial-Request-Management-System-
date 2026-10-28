import { CheckCircle2, Clock3, FilePenLine, FilePlus2, MessageSquare } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { requestApi } from '../../api/requestApi';
import { Button } from '../../components/ui/Button';
import { StatusCard } from '../../components/ui/StatusCard';
import { RequestTable } from '../../components/request/RequestTable';
import type { FinancialRequest, RequestStatus } from '../../types/request';

const cards: { status: RequestStatus; title: string; caption: string; icon: ReactNode; tone: 'gold' | 'green' | 'red' | 'blue' | 'gray' }[] = [
  { status: 'DRAFT', title: 'Drafts', caption: 'Continue your saved claims', icon: <FilePenLine size={20} />, tone: 'gray' },
  { status: 'UNDER_REVIEW', title: 'Under Review', caption: 'Claims awaiting a decision', icon: <Clock3 size={20} />, tone: 'blue' },
  { status: 'INFO_REQUESTED', title: 'Clarification', caption: 'Claims needing your response', icon: <MessageSquare size={20} />, tone: 'red' },
  { status: 'PAID', title: 'Paid', caption: 'Payments completed', icon: <CheckCircle2 size={20} />, tone: 'green' }
];

export function RequesterDashboardPage() {
  const [requests, setRequests] = useState<FinancialRequest[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    requestApi.mine().then(setRequests).catch(() => setRequests([]));
  }, []);

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
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <StatusCard key={card.status} title={card.title} caption={card.caption} icon={card.icon} value={counts[card.status] || 0} tone={card.tone} onClick={() => navigate(`/requests/my?status=${card.status}`)} />
        ))}
      </div>
      <RequestTable requests={requests.slice(0, 8)} />
    </div>
  );
}
