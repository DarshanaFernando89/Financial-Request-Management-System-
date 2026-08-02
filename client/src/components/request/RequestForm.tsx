import { FileText, Save, Send, X } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { requestApi } from '../../api/requestApi';
import type { RequestField, RequestType } from '../../types/request';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { FileUpload } from '../ui/FileUpload';
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
  const [requiredFiles, setRequiredFiles] = useState<Record<number, File | undefined>>({});
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);
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

  function updateRequiredFile(index: number, file?: File) {
    setRequiredFiles((current) => ({ ...current, [index]: file }));
  }

  function buildPayload(shouldSubmit: boolean) {
    const requiredDocuments = selectedType?.requiredDocuments || [];
    const files = [
      ...requiredDocuments
        .map((documentName, index) => ({ file: requiredFiles[index], description: documentName }))
        .filter((item): item is { file: File; description: string } => Boolean(item.file)),
      ...additionalFiles.map((file) => ({ file, description: 'Additional supporting document' }))
    ];

    if (!files.length) {
      return {
        requestType,
        title,
        description,
        amount: Number(amount),
        requestData,
        submit: shouldSubmit
      };
    }

    const formData = new FormData();
    formData.append('requestType', requestType);
    formData.append('title', title);
    formData.append('description', description);
    formData.append('amount', String(Number(amount)));
    formData.append('requestData', JSON.stringify(requestData));
    formData.append('submit', String(shouldSubmit));
    files.forEach(({ file, description }) => {
      formData.append('files', file);
      formData.append('documentDescriptions', description);
    });
    return formData;
  }

  async function submit(event: FormEvent, shouldSubmit: boolean) {
    event.preventDefault();
    setError('');
    if (shouldSubmit && selectedType?.requiredDocuments?.length) {
      const missingDocuments = selectedType.requiredDocuments.filter((_, index) => !requiredFiles[index]);
      if (missingDocuments.length) {
        setError(`Please upload required documents: ${missingDocuments.join(', ')}.`);
        return;
      }
    }
    setSaving(true);
    try {
      const created = await requestApi.create(buildPayload(shouldSubmit));
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
              setRequiredFiles({});
              setAdditionalFiles([]);
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
            <div className="mt-5 space-y-3">
              <div className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-900">
                Required documents: {selectedType.requiredDocuments.join(', ')}
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {selectedType.requiredDocuments.map((documentName, index) => (
                  <div key={`${documentName}-${index}`} className="rounded-md border border-slate-200 p-3">
                    <div className="mb-3 flex min-h-9 items-start gap-2">
                      <FileText size={18} className="mt-0.5 shrink-0 text-university-maroon" />
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{documentName}</p>
                        {requiredFiles[index] && <p className="text-xs text-slate-500">{requiredFiles[index]?.name}</p>}
                      </div>
                    </div>
                    <FileUpload
                      label={requiredFiles[index] ? 'Replace file' : 'Choose file'}
                      description="PDF, image, Word, or Excel up to 10 MB"
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
                      onChange={(event) => updateRequiredFile(index, event.target.files?.[0])}
                    />
                  </div>
                ))}
              </div>
              <FileUpload
                label="Add other supporting documents"
                description="Optional"
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
                multiple
                onChange={(event) => setAdditionalFiles(Array.from(event.target.files || []))}
              />
              {additionalFiles.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {additionalFiles.map((file) => (
                    <span key={`${file.name}-${file.lastModified}`} className="inline-flex max-w-full items-center gap-2 rounded-md bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                      <span className="truncate">{file.name}</span>
                      <button type="button" className="text-slate-500 hover:text-slate-900" onClick={() => setAdditionalFiles((current) => current.filter((item) => item !== file))} aria-label={`Remove ${file.name}`}>
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
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
