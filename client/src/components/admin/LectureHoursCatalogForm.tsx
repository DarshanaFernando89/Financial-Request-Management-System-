import { Plus, Save, X } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { adminApi } from '../../api/adminApi';
import type { RequestType } from '../../types/request';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';

function configuredOptions(requestType: RequestType, fieldName: string) {
  return requestType.fields.find((field) => field.name === fieldName)?.options || [];
}

function OptionEditor({ label, options, onChange }: { label: string; options: string[]; onChange: (options: string[]) => void }) {
  const [value, setValue] = useState('');
  const add = () => {
    const next = value.trim();
    if (!next || options.some((option) => option.toLocaleLowerCase() === next.toLocaleLowerCase())) return;
    onChange([...options, next]);
    setValue('');
  };

  return (
    <div className="space-y-3 rounded-md border border-slate-200 p-4">
      <p className="font-semibold text-slate-800">{label}</p>
      <div className="flex gap-2">
        <Input aria-label={`Add ${label}`} value={value} placeholder={`Add ${label.toLowerCase()}`} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); add(); } }} />
        <Button type="button" variant="secondary" icon={<Plus size={16} />} onClick={add}>Add</Button>
      </div>
      {options.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {options.map((option) => (
            <span key={option} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
              {option}
              <button type="button" className="rounded-full p-0.5 hover:bg-slate-200" onClick={() => onChange(options.filter((item) => item !== option))} aria-label={`Remove ${option}`}>
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      ) : <p className="text-sm text-slate-500">No options have been added.</p>}
    </div>
  );
}

export function LectureHoursCatalogForm({ requestType, onUpdated }: { requestType: RequestType; onUpdated: (requestType: RequestType) => void }) {
  const [batches, setBatches] = useState(() => configuredOptions(requestType, 'batch'));
  const [modules, setModules] = useState(() => configuredOptions(requestType, 'module'));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fields = useMemo(() => requestType.fields.map((field) => {
    if (field.name === 'batch') return { ...field, type: 'select' as const, options: batches };
    if (field.name === 'module') return { ...field, type: 'select' as const, options: modules };
    return field;
  }), [requestType.fields, batches, modules]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (!batches.length || !modules.length) {
      setError('Add at least one batch and one module before saving.');
      return;
    }
    setSaving(true);
    try {
      const { _id, ...requestTypePayload } = requestType;
      const updated = await adminApi.updateRequestType(_id, { ...requestTypePayload, fields });
      onUpdated(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save lecture-hours options.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)}>
      <Card className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Lecture Hours Claim Setup</h2>
          <p className="mt-1 text-sm text-slate-500">Requesters can only select batches and modules configured here. Lecture hours are calculated from their time slots.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <OptionEditor label="Batches" options={batches} onChange={setBatches} />
          <OptionEditor label="Modules" options={modules} onChange={setModules} />
        </div>
        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        <div className="flex justify-end"><Button type="submit" disabled={saving} icon={<Save size={16} />}>{saving ? 'Saving...' : 'Save batches and modules'}</Button></div>
      </Card>
    </form>
  );
}
