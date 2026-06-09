import { Save, Send } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { requestApi } from '../../api/requestApi';
import type { RequestField, RequestType } from '../../types/request';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';

function dynamicAmount(data: Record<string, string>) {
  const pairs = [
    ['lectureHours', 'ratePerHour'],
    ['numberOfPapers', 'ratePerPaper'],
    ['sessions', 'rate'],
    ['distanceKm', 'rate']
  ];
  for (const [quantityKey, rateKey] of pairs) {
    const quantity = Number(data[quantityKey]);
    const rate = Number(data[rateKey]);
    if (quantity > 0 && rate > 0) return quantity * rate;
  }
  return Number(data.amount || 0);
}

function FieldControl({ field, value, onChange }: { field: RequestField; value: string; onChange: (value: string) => void }) {
  if (field.type === 'textarea') return <Textarea label={field.label} required={field.required} value={value} onChange={(event) => onChange(event.target.value)} />;
  if (field.type === 'select') {
    return (
      <Select
        label={field.label}
        required={field.required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        options={(field.options || []).map((option) => ({ label: option, value: option }))}
      />
    );
  }
  return <Input label={field.label} type={field.type} required={field.required} value={value} onChange={(event) => onChange(event.target.value)} />;
}

export function RequestForm() {
  const [types, setTypes] = useState<RequestType[]>([]);
  const [requestType, setRequestType] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [requestData, setRequestData] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    requestApi.types().then(setTypes).catch((err) => setError(err.message));
  }, []);

  const selectedType = useMemo(() => types.find((type) => type._id === requestType), [requestType, types]);

  useEffect(() => {
    const calculated = dynamicAmount(requestData);
    if (calculated > 0) setAmount(String(calculated));
  }, [requestData]);

  function updateField(name: string, value: string) {
    setRequestData((current) => ({ ...current, [name]: value }));
  }

  async function submit(event: FormEvent, shouldSubmit: boolean) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const created = await requestApi.create({
        requestType,
        title,
        description,
        amount: Number(amount),
        requestData,
        submit: shouldSubmit
      });
      navigate(`/requests/${created._id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save request.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={(event) => void submit(event, true)}>
      <Card className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Select
            label="Request Type"
            value={requestType}
            required
            onChange={(event) => {
              setRequestType(event.target.value);
              setRequestData({});
            }}
            options={types.map((type) => ({ label: type.name, value: type._id }))}
          />
          <Input label="Amount" type="number" min="0" step="0.01" value={amount} required onChange={(event) => setAmount(event.target.value)} />
        </div>
        <Input label="Title" value={title} required onChange={(event) => setTitle(event.target.value)} />
        <Textarea label="Description" value={description} onChange={(event) => setDescription(event.target.value)} />
      </Card>

      {selectedType && (
        <Card>
          <h2 className="mb-4 text-base font-semibold text-slate-900">{selectedType.name}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {selectedType.fields.map((field) => (
              <FieldControl
                key={field.name}
                field={field}
                value={requestData[field.name] || ''}
                onChange={(value) => updateField(field.name, value)}
              />
            ))}
          </div>
          {selectedType.requiredDocuments?.length > 0 && (
            <div className="mt-4 rounded-md bg-yellow-50 p-3 text-sm text-yellow-900">
              Required documents: {selectedType.requiredDocuments.join(', ')}
            </div>
          )}
        </Card>
      )}

      {error && <p className="rounded-md bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}
      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="outline" icon={<Save size={16} />} disabled={saving} onClick={(event) => void submit(event as unknown as FormEvent, false)}>
          Save as Draft
        </Button>
        <Button type="submit" icon={<Send size={16} />} disabled={saving}>
          Submit Request
        </Button>
      </div>
    </form>
  );
}
