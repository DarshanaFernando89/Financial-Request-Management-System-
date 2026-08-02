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
      if (key === 'requestTypes') {
        const values = [...(current.requestTypes as string[])];
        const index = values.indexOf(value);
        if (index >= 0) values.splice(index, 1);
        else values.push(value);
        return { ...current, requestTypes: values };
      }

      const values = [...(current.workflowRoles as string[])];
      const index = values.indexOf(value);
      if (index >= 0) values.splice(index, 1);
      else values.push(value);
      return { ...current, workflowRoles: values };
    });
  }

  const selectedWorkflowRoles = Array.isArray(form.workflowRoles) ? (form.workflowRoles as Role[]) : [];

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
          <p className="mb-3 text-xs text-slate-500">Select roles in the order they should appear in the workflow. The order is shown with numbers automatically.</p>
          <div className="grid gap-2 md:grid-cols-2">
            {workflowRoles.map((role) => {
              const selectedIndex = selectedWorkflowRoles.indexOf(role);
              const isSelected = selectedIndex >= 0;

              return (
                <label key={role} className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm">
                  <input type="checkbox" checked={isSelected} onChange={() => toggle('workflowRoles', role)} />
                  <span className="flex items-center gap-2">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${
                        isSelected ? 'bg-slate-900 text-white' : 'border border-slate-300 text-slate-400'
                      }`}
                    >
                      {isSelected ? selectedIndex + 1 : '•'}
                    </span>
                    <span>{roleLabel(role)}</span>
                  </span>
                </label>
              );
            })}
          </div>
          {selectedWorkflowRoles.length > 0 && (
            <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Selected order</p>
              <ol className="mt-2 space-y-1">
                {selectedWorkflowRoles.map((role, index) => (
                  <li key={role} className="flex items-center gap-2 text-sm text-slate-700">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white">
                      {index + 1}
                    </span>
                    <span>{roleLabel(role)}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        <div className="flex justify-end">
          <Button type="submit" icon={<Save size={16} />}>Save Rule</Button>
        </div>
      </Card>
    </form>
  );
}
