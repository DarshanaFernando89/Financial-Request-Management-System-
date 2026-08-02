import { Save } from 'lucide-react';
import { FormEvent, useState } from 'react';
import type { Role } from '../../types/auth';
import { ROLES } from '../../utils/constants';
import { roleLabel } from '../../utils/roleLabels';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';

const workflowRoles = ROLES.filter(
  (role) => role !== 'REQUESTER' && role !== 'LECTURER' && role !== 'FINANCE_OFFICER' && role !== 'ADMIN'
);

export type RuleWithTypePayload = {
  name: string;
  description: string;
  requiredDocuments: string;
  minAmount: number;
  maxAmount: number | null;
  workflowRoles: Role[];
};

export function RuleWithTypeForm({
  onSubmit
}: {
  onSubmit: (payload: RuleWithTypePayload) => Promise<void>;
}) {
  const [form, setForm] = useState<RuleWithTypePayload>({
    name: '',
    description: '',
    requiredDocuments: '',
    minAmount: 0,
    maxAmount: null,
    workflowRoles: ['HOD']
  });
  const [error, setError] = useState('');

  function toggleWorkflowRole(role: Role) {
    setForm((current) => {
      const roles = [...current.workflowRoles];
      const index = roles.indexOf(role);
      if (index >= 0) {
        roles.splice(index, 1);
        return { ...current, workflowRoles: roles };
      }

      return { ...current, workflowRoles: [...roles, role] };
    });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      await onSubmit({
        ...form,
        name: form.name.trim(),
        description: form.description.trim(),
        requiredDocuments: form.requiredDocuments.trim(),
        minAmount: Number(form.minAmount),
        maxAmount: form.maxAmount === null ? null : Number(form.maxAmount)
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save rule.');
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)}>
      <Card className="space-y-5">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-700">Rule and request type name</p>
          <Input
            required
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder="Fuel bills"
          />
          <p className="text-xs text-slate-500">This same name will be used for the request type.</p>
        </div>
        <Textarea
          label="Request type description"
          value={form.description}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
        />
        <Input
          label="Required documents"
          value={form.requiredDocuments}
          onChange={(event) => setForm({ ...form, requiredDocuments: event.target.value })}
          placeholder="Fuel receipt, approval note"
        />
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Minimum amount"
            type="number"
            required
            value={form.minAmount}
            onChange={(event) => setForm({ ...form, minAmount: Number(event.target.value) })}
          />
          <Input
            label="Maximum amount"
            type="number"
            value={form.maxAmount ?? ''}
            onChange={(event) => setForm({ ...form, maxAmount: event.target.value === '' ? null : Number(event.target.value) })}
          />
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold text-slate-700">Workflow role sequence</p>
          <p className="mb-3 text-xs text-slate-500">Select roles in the order they should appear in the workflow. The order is shown with numbers automatically.</p>
          <div className="grid gap-2 md:grid-cols-2">
            {workflowRoles.map((role) => {
              const selectedIndex = form.workflowRoles.indexOf(role);
              const isSelected = selectedIndex >= 0;

              return (
                <label key={role} className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm">
                  <input type="checkbox" checked={isSelected} onChange={() => toggleWorkflowRole(role)} />
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
          {form.workflowRoles.length > 0 && (
            <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Selected order</p>
              <ol className="mt-2 space-y-1">
                {form.workflowRoles.map((role, index) => (
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
          <Button type="submit" icon={<Save size={16} />}>Create Rule and Request Type</Button>
        </div>
      </Card>
    </form>
  );
}
