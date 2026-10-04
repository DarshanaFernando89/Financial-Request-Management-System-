import { Save } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import type { RequestType } from '../../types/request';

export function RequestTypeForm({ initial, onSubmit }: { initial?: Partial<RequestType>; onSubmit: (payload: Record<string, unknown>) => Promise<void> }) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    code: initial?.code || '',
    description: initial?.description || '',
    requiredDocuments: initial?.requiredDocuments?.join(', ') || '',
    isActive: initial?.isActive ?? true,
    isVisibleToRequester: initial?.isVisibleToRequester ?? false
  });
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      await onSubmit({
        ...form,
        code: form.code.toUpperCase().replace(/\s+/g, '_'),
        fields: initial?.fields || [],
        requiredDocuments: form.requiredDocuments.split(',').map((value) => value.trim()).filter(Boolean),
        isVisibleToRequester: form.isVisibleToRequester
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save request type.');
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)}>
      <Card className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Name" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <Input label="Code" required value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} />
        </div>
        <Textarea label="Description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
        <Input label="Required documents" value={form.requiredDocuments} onChange={(event) => setForm({ ...form, requiredDocuments: event.target.value })} />
        <label className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.isVisibleToRequester}
            onChange={(event) => setForm({ ...form, isVisibleToRequester: event.target.checked })}
          />
          Show in requester new-request dropdown
        </label>
        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        <div className="flex justify-end">
          <Button type="submit" icon={<Save size={16} />}>Save Request Type</Button>
        </div>
      </Card>
    </form>
  );
}
