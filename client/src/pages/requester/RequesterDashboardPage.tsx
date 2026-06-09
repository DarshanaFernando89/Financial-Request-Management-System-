import { FilePlus2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { requestApi } from '../../api/requestApi';
import { Button } from '../../components/ui/Button';
import { StatusCard } from '../../components/ui/StatusCard';
import { RequestTable } from '../../components/request/RequestTable';
import type { FinancialRequest, RequestStatus } from '../../types/request';

const cards: { status: RequestStatus; title: string; tone: 'gold' | 'green' | 'red' | 'blue' | 'gray' }[] = [
  { status: 'DRAFT', title: 'Drafts', tone: 'gray' },
  { status: 'UNDER_REVIEW', title: 'Under Review', tone: 'blue' },
  { status: 'INFO_REQUESTED', title: 'Clarification', tone: 'red' },
  { status: 'PAID', title: 'Paid', tone: 'green' }
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Requester Dashboard</h1>
          <p className="text-sm text-slate-500">Financial and examination-related claims</p>
        </div>
        <Button icon={<FilePlus2 size={16} />} onClick={() => navigate('/requests/new')}>New Request</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {cards.map((card) => (
          <StatusCard key={card.status} title={card.title} value={counts[card.status] || 0} tone={card.tone} onClick={() => navigate(`/requests/my?status=${card.status}`)} />
        ))}
      </div>
      <RequestTable requests={requests.slice(0, 8)} />
    </div>
  );
}
