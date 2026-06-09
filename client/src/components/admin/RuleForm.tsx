import { Save } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { ROLES } from '../../utils/constants';
import { roleLabel } from '../../utils/roleLabels';
import type { ApprovalRule } from '../../types/rule';
import type { RequestType } from '../../types/request';
import type { Role } from '../../types/auth';

const workflowRoles = ROLES.filter((role) => role !== 'REQUESTER' && role !== 'LECTURER' && role !== 'FINANCE_OFFICER' && role !== 'ADMIN');

export function RuleForm({
  requestTypes,
  initial,
  onSubmit
}: {
  requestTypes: RequestType[];
  initial?: Partial<ApprovalRule>;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const [form, setForm] = useState<Record<string, any>>({
    name: initial?.name || '',
    requestTypes: initial?.requestTypes?.map((type) => type._id) || [],
    minAmount: initial?.minAmount || 0,
    maxAmount: initial?.maxAmount ?? '',
    workflowRoles: initial?.workflowRoles || ['HOD'],
    priority: initial?.priority || 100,
    isActive: initial?.isActive ?? true
  });
  const [error, setError] = useState('');

  function toggle(key: 'requestTypes' | 'workflowRoles', value: string) {
    setForm((current) => {
      const values = new Set(current[key] as string[]);
      if (values.has(value)) values.delete(value);
      else values.add(value);
      return { ...current, [key]: Array.from(values) };
    });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      await onSubmit({
        ...form,
        minAmount: Number(form.minAmount),
        maxAmount: form.maxAmount === '' ? null : Number(form.maxAmount),
        priority: Number(form.priority)
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save rule.');
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)}>
      <Card className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <Input label="Rule name" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <Input label="Minimum amount" type="number" required value={form.minAmount} onChange={(event) => setForm({ ...form, minAmount: event.target.value })} />
          <Input label="Maximum amount" type="number" value={form.maxAmount} onChange={(event) => setForm({ ...form, maxAmount: event.target.value })} />
          <Input label="Priority" type="number" value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })} />
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold text-slate-700">Request types</p>
          <div className="grid gap-2 md:grid-cols-2">
            {requestTypes.map((type) => (
              <label key={type._id} className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm">
                <input type="checkbox" checked={(form.requestTypes as string[]).includes(type._id)} onChange={() => toggle('requestTypes', type._id)} />
                <span>{type.name}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold text-slate-700">Workflow role sequence</p>
          <div className="grid gap-2 md:grid-cols-2">
            {workflowRoles.map((role) => (
              <label key={role} className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm">
                <input type="checkbox" checked={(form.workflowRoles as Role[]).includes(role)} onChange={() => toggle('workflowRoles', role)} />
                <span>{roleLabel(role)}</span>
              </label>
            ))}
          </div>
        </div>
        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        <div className="flex justify-end">
          <Button type="submit" icon={<Save size={16} />}>Save Rule</Button>
        </div>
      </Card>
    </form>
  );
}
