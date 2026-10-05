import { FileText, Save, Send, X } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { requestApi } from '../../api/requestApi';
import type { FuelDuplicateRequest, RequestField } from '../../types/request';
import type { RequestRuleOption } from '../../types/rule';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { DuplicateFuelWarning } from './DuplicateFuelWarning';
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
  const [rules, setRules] = useState<RequestRuleOption[]>([]);
  const [approvalRule, setApprovalRule] = useState('');
  const [loadingRules, setLoadingRules] = useState(true);
  const [requestType, setRequestType] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [requestData, setRequestData] = useState<Record<string, string>>({});
  const [fuelDuplicates, setFuelDuplicates] = useState<FuelDuplicateRequest[]>([]);
  const [checkingFuelDuplicates, setCheckingFuelDuplicates] = useState(false);
  const [requiredFiles, setRequiredFiles] = useState<Record<number, File | undefined>>({});
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    requestApi.rules().then(setRules).catch((err) => setError(err.message)).finally(() => setLoadingRules(false));
  }, []);

  const selectedRule = useMemo(() => rules.find((rule) => rule._id === approvalRule), [approvalRule, rules]);
  const selectedType = useMemo(() => selectedRule?.requestTypes.find((type) => type._id === requestType), [requestType, selectedRule]);

  useEffect(() => {
    const calculated = dynamicAmount(requestData);
    if (calculated > 0) setAmount(String(calculated));
  }, [requestData]);

  useEffect(() => {
    const requestAmount = Number(amount);
    if (selectedType?.code !== 'TRAVEL_FUEL' || !Number.isFinite(requestAmount) || requestAmount <= 0) {
      setFuelDuplicates([]);
      setCheckingFuelDuplicates(false);
      return;
    }

    let active = true;
    setFuelDuplicates([]);
    setCheckingFuelDuplicates(true);
    const timeout = window.setTimeout(() => {
      requestApi.fuelDuplicates(requestType, requestAmount)
        .then((duplicates) => {
          if (active) setFuelDuplicates(duplicates);
        })
        .catch(() => {
          if (active) setFuelDuplicates([]);
        })
        .finally(() => {
          if (active) setCheckingFuelDuplicates(false);
        });
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [amount, requestType, selectedType?.code]);

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
        approvalRule,
        title,
        description,
        amount: Number(amount),
        requestData,
        submit: shouldSubmit
      };
    }

    const formData = new FormData();
    formData.append('requestType', requestType);
    formData.append('approvalRule', approvalRule);
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
    if (shouldSubmit && checkingFuelDuplicates) {
      setError('Please wait while we check for possible duplicate fuel requests.');
      return;
    }
    if (!selectedRule || !selectedType) {
      setError('Please select a claim type and its request type.');
      return;
    }
    const requestAmount = Number(amount);
    if (!Number.isFinite(requestAmount) || requestAmount <= 0) {
      setError('Amount must be positive.');
      return;
    }
    if (requestAmount < selectedRule.minAmount || (selectedRule.maxAmount != null && requestAmount > selectedRule.maxAmount)) {
      setError(`Amount must be within the range for ${selectedRule.name}: ${selectedRule.minAmount} - ${selectedRule.maxAmount ?? 'No upper limit'}.`);
      return;
    }
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
            label="Claim Type"
            value={approvalRule}
            required
            disabled={loadingRules || !rules.length}
            onChange={(event) => {
              const rule = rules.find((item) => item._id === event.target.value);
              setApprovalRule(event.target.value);
              setRequestType(rule?.requestTypes.length === 1 ? rule.requestTypes[0]._id : '');
              setRequestData({});
              setRequiredFiles({});
              setAdditionalFiles([]);
            }}
            options={rules.map((rule) => ({ label: rule.name, value: rule._id }))}
          />
          <Input label="Amount" type="number" min={Math.max(selectedRule?.minAmount ?? 0, 0.01)} max={selectedRule?.maxAmount ?? undefined} step="0.01" value={amount} required onChange={(event) => setAmount(event.target.value)} />
        </div>
        {loadingRules && <p className="text-sm text-slate-500">Loading claim types...</p>}
        {!loadingRules && !rules.length && !error && <p className="text-sm text-slate-500">No active claim types are available. Please contact the administrator.</p>}
        {selectedRule && (
          <p className="text-sm text-slate-500">Amount range: {selectedRule.minAmount} - {selectedRule.maxAmount ?? 'No upper limit'}</p>
        )}
        {selectedRule && selectedRule.requestTypes.length > 1 && (
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
            options={selectedRule.requestTypes.map((type) => ({ label: type.name, value: type._id }))}
          />
        )}
        <Input label="Title" value={title} required onChange={(event) => setTitle(event.target.value)} />
        <Textarea label="Description" value={description} onChange={(event) => setDescription(event.target.value)} />
      </Card>

      {selectedType?.code === 'TRAVEL_FUEL' && Number(amount) > 0 && (
        <>
          {checkingFuelDuplicates && <p className="text-sm text-slate-500">Checking for similar fuel requests...</p>}
          <DuplicateFuelWarning requests={fuelDuplicates} audience="requester" />
        </>
      )}

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
        <Button variant="outline" icon={<Save size={16} />} disabled={saving || loadingRules || !rules.length} onClick={(event) => void submit(event as unknown as FormEvent, false)}>
          Save as Draft
        </Button>
        <Button type="submit" icon={<Send size={16} />} disabled={saving || loadingRules || !rules.length || checkingFuelDuplicates}>
          Submit Request
        </Button>
      </div>
    </form>
  );
}
