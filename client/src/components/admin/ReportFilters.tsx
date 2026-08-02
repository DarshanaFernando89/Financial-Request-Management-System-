import { Search } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { adminApi } from '../../api/adminApi';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { DateInput } from '../ui/DateInput';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import type { RequestType } from '../../types/request';

export function ReportFilters({ onApply }: { onApply: (filters: Record<string, string>) => void }) {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [requestTypes, setRequestTypes] = useState<RequestType[]>([]);

  useEffect(() => {
    adminApi.requestTypes().then(setRequestTypes).catch(() => setRequestTypes([]));
  }, []);

  function setValue(key: string, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    onApply(Object.fromEntries(Object.entries(filters).filter(([, value]) => value)));
  }
  return (
    <form onSubmit={submit}>
      <Card>
        <div className="grid gap-4 md:grid-cols-5">
          <DateInput label="Start date" value={filters.startDate || ''} onChange={(event) => setValue('startDate', event.target.value)} />
          <DateInput label="End date" value={filters.endDate || ''} onChange={(event) => setValue('endDate', event.target.value)} />
          <Select
            label="Request type"
            value={filters.requestType || ''}
            onChange={(event) => setValue('requestType', event.target.value)}
            options={requestTypes.map((type) => ({ label: `${type.name} (${type.code})`, value: type._id }))}
          />
          <Select
            label="Status"
            value={filters.status || ''}
            onChange={(event) => setValue('status', event.target.value)}
            options={[
              { label: 'Draft', value: 'DRAFT' },
              { label: 'Under Review', value: 'UNDER_REVIEW' },
              { label: 'Pending Payment', value: 'PAYMENT_PENDING' },
              { label: 'Paid', value: 'PAID' },
              { label: 'Rejected', value: 'REJECTED' }
            ]}
          />
          <Input label="Department" value={filters.department || ''} onChange={(event) => setValue('department', event.target.value)} />
        </div>
        <div className="mt-4 flex justify-end">
          <Button type="submit" icon={<Search size={16} />}>Filter</Button>
        </div>
      </Card>
    </form>
  );
}
