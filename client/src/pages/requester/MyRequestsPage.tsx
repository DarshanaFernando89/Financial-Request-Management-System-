import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { requestApi } from '../../api/requestApi';
import { RequestTable } from '../../components/request/RequestTable';
import { SearchInput } from '../../components/ui/SearchInput';
import { Select } from '../../components/ui/Select';
import type { FinancialRequest } from '../../types/request';

export function MyRequestsPage() {
  const [params, setParams] = useSearchParams();
  const [requests, setRequests] = useState<FinancialRequest[]>([]);
  const [search, setSearch] = useState(params.get('search') || '');
  const [status, setStatus] = useState(params.get('status') || '');

  useEffect(() => {
    requestApi.mine({ search, status }).then(setRequests).catch(() => setRequests([]));
  }, [search, status]);

  function updateStatus(value: string) {
    setStatus(value);
    setParams(value ? { status: value } : {});
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">My Requests</h1>
      <div className="grid gap-3 md:grid-cols-3">
        <SearchInput placeholder="Search requests" value={search} onChange={(event) => setSearch(event.target.value)} />
        <Select
          value={status}
          onChange={(event) => updateStatus(event.target.value)}
          options={[
            { label: 'Draft', value: 'DRAFT' },
            { label: 'Under Review', value: 'UNDER_REVIEW' },
            { label: 'Clarification Requested', value: 'INFO_REQUESTED' },
            { label: 'Rejected', value: 'REJECTED' },
            { label: 'Pending Payment', value: 'PAYMENT_PENDING' },
            { label: 'Paid', value: 'PAID' }
          ]}
        />
      </div>
      <RequestTable requests={requests} />
    </div>
  );
}
