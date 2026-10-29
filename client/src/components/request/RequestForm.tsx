import { Toast } from '../ui/Toast';
import { FileText, Save, Send, X } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { requestApi } from '../../api/requestApi';
import type { RequestField } from '../../types/request';
import type { RequestRuleOption } from '../../types/rule';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { FileUpload } from '../ui/FileUpload';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { isLectureHoursPayment, lectureAmountFromTimeSlots, lectureHoursFromTimeSlots, newLectureTimeSlot, serializeLectureTimeSlots, validateLectureSlotRates, validateLectureTimeSlots } from '../../utils/lectureHours';
import { LectureTimeSlots } from './LectureTimeSlots';
import { DEFAULT_FILE_TYPES, validateDocumentFiles } from '../../utils/documentPolicy';

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

function FieldControl({ field, value, onChange, readOnly = false, max }: { field: RequestField; value: string; onChange: (value: string) => void; readOnly?: boolean; max?: number }) {
  if (field.type === 'textarea') return <Textarea label={field.label} required={field.required} placeholder={field.placeholder} value={value} onChange={(event) => onChange(event.target.value)} />;
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
  return <Input label={field.label} type={field.type} required={field.required} readOnly={readOnly} max={max} className={readOnly ? 'bg-slate-100' : undefined} value={value} onChange={(event) => onChange(event.target.value)} />;
}

export function RequestForm() {
  const [rules, setRules] = useState<RequestRuleOption[]>([]);
  const [approvalRule, setApprovalRule] = useState('');
  const [loadingRules, setLoadingRules] = useState(true);
  const [requestType, setRequestType] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [fuelDuplicateWarning, setFuelDuplicateWarning] = useState<{
    warning?: string;
    duplicateRequestId?: string;
    duplicateRequestReference?: string;
  }>({});
  const [fuelDuplicateCheckError, setFuelDuplicateCheckError] = useState('');
  const [requestData, setRequestData] = useState<Record<string, string>>({});
  const [lectureTimeSlots, setLectureTimeSlots] = useState(() => [newLectureTimeSlot()]);
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
  const requiredDocuments = selectedRule?.requiredDocuments ?? selectedType?.requiredDocuments ?? [];
  const acceptedFileTypes = selectedRule?.acceptedFileTypes ?? DEFAULT_FILE_TYPES;
  const uploadDescription = `Accepted: ${acceptedFileTypes.join(', ')}. Up to 10 MB per file.`;
  const lectureHoursRequest = isLectureHoursPayment(selectedType);
  const paperMarkingRequest = selectedType?.code === 'PAPER_MARKING' || selectedType?.name.trim().toLocaleLowerCase() === 'paper marking';
  const fuelRequest = selectedType?.code === 'TRAVEL_FUEL' || selectedType?.name.trim().toLocaleLowerCase() === 'travel / fuel claims';
  const paperModuleField = selectedType?.fields.find((field) => ['module', 'courseName'].includes(field.name));
  const paperRatesByModule = paperModuleField?.validationRules?.ratePerPaperByModule || {};
  const selectedPaperRate = paperMarkingRequest && paperModuleField
    ? paperRatesByModule[requestData[paperModuleField.name]] || ''
    : '';
  const paperStudentLimit = paperMarkingRequest && paperModuleField
    ? paperModuleField.validationRules?.studentCountByBatchAndModule?.[requestData.batch]?.[requestData[paperModuleField.name]]
    : undefined;
  const lectureBatches = selectedType?.fields.find((field) => field.name === 'batch')?.options || [];
  const lectureModules = selectedType?.fields.find((field) => field.name === 'module')?.options || [];
  const timeSlotsError = lectureHoursRequest ? validateLectureTimeSlots(lectureTimeSlots) : '';
  const calculatedLectureHours = lectureHoursRequest && !timeSlotsError
    ? lectureHoursFromTimeSlots(serializeLectureTimeSlots(lectureTimeSlots))
    : undefined;
  const slotRatesError = lectureHoursRequest ? validateLectureSlotRates(lectureTimeSlots) : '';
  const calculatedLectureAmount = lectureHoursRequest ? lectureAmountFromTimeSlots(lectureTimeSlots) : undefined;

  useEffect(() => {
    if (lectureHoursRequest) {
      setAmount(calculatedLectureAmount !== undefined && calculatedLectureAmount > 0 ? calculatedLectureAmount.toFixed(2) : '');
      return;
    }
    const calculated = dynamicAmount(requestData);
    if (paperMarkingRequest) {
      setAmount(calculated > 0 ? String(calculated) : '');
      return;
    }
    if (calculated > 0) setAmount(String(calculated));
  }, [requestData, lectureHoursRequest, paperMarkingRequest, calculatedLectureAmount]);

  useEffect(() => {
    if (!lectureHoursRequest) return;
    const value = calculatedLectureHours === undefined ? '' : String(calculatedLectureHours);
    if (requestData.lectureHours !== value) setRequestData((current) => ({ ...current, lectureHours: value }));
  }, [lectureHoursRequest, calculatedLectureHours, requestData.lectureHours]);

  useEffect(() => {
    if (!paperMarkingRequest || !paperModuleField) return;
    const value = selectedPaperRate === '' ? '' : String(selectedPaperRate);
    if (requestData.ratePerPaper !== value) {
      setRequestData((current) => ({ ...current, ratePerPaper: value }));
    }
  }, [paperMarkingRequest, paperModuleField?.name, selectedPaperRate, requestData.ratePerPaper]);

  useEffect(() => {
    setFuelDuplicateWarning({});
    setFuelDuplicateCheckError('');
    const requestAmount = Number(amount);
    const travelDate = requestData.travelDate;
    if (!fuelRequest || !selectedType?._id || !Number.isFinite(requestAmount) || requestAmount <= 0 || !travelDate) return;
    let active = true;
    const timeout = window.setTimeout(() => {
      requestApi.duplicateFuelWarning(selectedType._id, requestAmount, travelDate)
        .then((warning) => {
          if (active) setFuelDuplicateWarning(warning);
        })
        .catch((err) => {
          if (active) setFuelDuplicateCheckError(err instanceof Error ? err.message : 'Unable to check for similar fuel claims.');
        });
    }, 300);
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [fuelRequest, selectedType?._id, amount, requestData.travelDate]);

  function updateField(name: string, value: string) {
    setRequestData((current) => ({ ...current, [name]: value }));
  }

  function updateRequiredFile(index: number, file?: File) {
    const message = validateDocumentFiles(file ? [file] : [], acceptedFileTypes);
    if (message) { setError(message); return; }
    setError('');
    setRequiredFiles((current) => ({ ...current, [index]: file }));
  }

  function updateAdditionalFiles(files: File[]) {
    const message = validateDocumentFiles(files, acceptedFileTypes);
    if (message) { setError(message); return; }
    setError('');
    setAdditionalFiles(files);
  }

  function buildPayload(shouldSubmit: boolean) {
    const claimData = lectureHoursRequest
      ? {
          ...requestData,
          timeSlots: serializeLectureTimeSlots(lectureTimeSlots),
          lectureHours: String(calculatedLectureHours),
          lectureTimeSlots: lectureTimeSlots.map(({ date, batch, module, startTime, endTime, ratePerHour }) => ({ date, batch, module, startTime, endTime, ratePerHour: Number(ratePerHour) }))
        }
      : requestData;
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
        requestData: claimData,
        submit: shouldSubmit
      };
    }

    const formData = new FormData();
    formData.append('requestType', requestType);
    formData.append('approvalRule', approvalRule);
    formData.append('title', title);
    formData.append('description', description);
    formData.append('amount', String(Number(amount)));
    formData.append('requestData', JSON.stringify(claimData));
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
    if (!selectedRule || !selectedType) {
      setError('Please select a claim type and its request type.');
      return;
    }
    if (timeSlotsError || slotRatesError) {
      setError(timeSlotsError || slotRatesError);
      return;
    }
    if (lectureHoursRequest && lectureTimeSlots.some((slot) => !lectureBatches.includes(slot.batch) || !lectureModules.includes(slot.module))) {
      setError('Select an available batch and module for every lecture time slot.');
      return;
    }
    if (paperMarkingRequest) {
      const paperCount = Number(requestData.numberOfPapers);
      if (typeof paperStudentLimit !== 'number' || !Number.isInteger(paperStudentLimit) || paperStudentLimit <= 0) {
        setError('The student count for this module and batch has not been configured. Please contact an administrator.');
        return;
      }
      if (paperCount > paperStudentLimit) {
        setError(`Total papers cannot exceed the ${paperStudentLimit} students enrolled in this module and batch.`);
        return;
      }
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
    const fileError = validateDocumentFiles([...Object.values(requiredFiles).filter((file): file is File => Boolean(file)), ...additionalFiles], acceptedFileTypes);
    if (fileError) { setError(fileError); return; }
    if (shouldSubmit && requiredDocuments.length) {
      const missingDocuments = requiredDocuments.filter((_, index) => !requiredFiles[index]);
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
              setLectureTimeSlots([newLectureTimeSlot()]);
              setRequiredFiles({});
              setAdditionalFiles([]);
            }}
            options={rules.map((rule) => ({ label: rule.name, value: rule._id }))}
          />
          <Input label="Amount" type="number" min={Math.max(selectedRule?.minAmount ?? 0, 0.01)} max={selectedRule?.maxAmount ?? undefined} step="0.01" readOnly={lectureHoursRequest || paperMarkingRequest} className={lectureHoursRequest || paperMarkingRequest ? 'bg-slate-100' : undefined} value={amount} required onChange={(event) => setAmount(event.target.value)} />
        </div>
        {loadingRules && <p className="text-sm text-slate-500">Loading claim types...</p>}
        {!loadingRules && !rules.length && !error && <p className="text-sm text-slate-500">No active claim types are available. Please contact the administrator.</p>}
        {selectedRule && (
          <p className="text-sm text-slate-500">Amount range: {selectedRule.minAmount} - {selectedRule.maxAmount ?? 'No upper limit'}</p>
        )}
        {fuelDuplicateWarning.warning && (
          <p role="alert" className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
            {fuelDuplicateWarning.warning}{' '}
            {fuelDuplicateWarning.duplicateRequestId && fuelDuplicateWarning.duplicateRequestReference && (
              <>Similar request: <Link className="underline" to={`/requests/${fuelDuplicateWarning.duplicateRequestId}`}>{fuelDuplicateWarning.duplicateRequestReference}</Link>.</>
            )}
          </p>
        )}
        {fuelDuplicateCheckError && (
          <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
            Could not check for duplicate fuel claims: {fuelDuplicateCheckError}
          </p>
        )}
        {selectedRule && selectedRule.requestTypes.length > 1 && (
          <Select
            label="Request Type"
            value={requestType}
            required
            onChange={(event) => {
              setRequestType(event.target.value);
              setRequestData({});
              setLectureTimeSlots([newLectureTimeSlot()]);
              setRequiredFiles({});
              setAdditionalFiles([]);
            }}
            options={selectedRule.requestTypes.map((type) => ({ label: type.name, value: type._id }))}
          />
        )}
        <Input label="Title" value={title} required onChange={(event) => setTitle(event.target.value)} />
        <Textarea label="Description" value={description} onChange={(event) => setDescription(event.target.value)} />
      </Card>

      {selectedType && (
        <Card>
          <h2 className="mb-4 text-base font-semibold text-slate-900">{selectedType.name}</h2>
          {lectureHoursRequest && (
            <p className="mb-4 rounded-md bg-slate-50 p-3 text-sm text-slate-600">
              For each slot, select the date, batch, module, start time, and end time, then enter its rate per hour. Times use 15-minute intervals. Add slots for different lectures, batches, modules, or rates. Total lecture hours and claim amount are calculated automatically.
            </p>
          )}
          {paperMarkingRequest && (
            <p className="mb-4 rounded-md bg-slate-50 p-3 text-sm text-slate-600">
              Select a batch and module, then enter the total papers marked. The amount is calculated using the configured rate per paper. Only one paper-marking claim is allowed for each module and batch, and the paper count cannot exceed the number of students enrolled.
            </p>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            {selectedType.fields.filter((field) => !lectureHoursRequest || !['batch', 'module', 'ratePerHour'].includes(field.name)).map((field) => lectureHoursRequest && field.name === 'timeSlots' ? (
              <LectureTimeSlots key={field.name} slots={lectureTimeSlots} batches={lectureBatches} modules={lectureModules} onChange={setLectureTimeSlots} />
            ) : (
              <FieldControl
                key={field.name}
                field={field}
                value={requestData[field.name] || ''}
                onChange={(value) => updateField(field.name, value)}
                readOnly={(lectureHoursRequest && field.name === 'lectureHours') || (paperMarkingRequest && field.name === 'ratePerPaper')}
                max={paperMarkingRequest && field.name === 'numberOfPapers' ? paperStudentLimit : undefined}
              />
            ))}
          </div>
          {paperMarkingRequest && requestData.batch && requestData[paperModuleField?.name || ''] && (
            <p className="mt-3 text-sm text-slate-600">
              {paperStudentLimit
                ? `Students enrolled in ${requestData[paperModuleField?.name || '']} (${requestData.batch}): ${paperStudentLimit}.`
                : 'Student count has not been configured for this module and batch.'}
            </p>
          )}
          {lectureHoursRequest && timeSlotsError && lectureTimeSlots.some((slot) => slot.date || slot.startTime || slot.endTime) && (
            <p className="mt-3 text-sm font-medium text-red-600">{timeSlotsError}</p>
          )}
          <div className="mt-5 space-y-3">
              <h3 className="text-sm font-semibold text-slate-800">Supporting documents</h3>
              {requiredDocuments.length > 0 && (
              <div className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-900">
                Required documents: {requiredDocuments.join(', ')}
              </div>
              )}
              <div className="grid gap-3 md:grid-cols-2">
                {requiredDocuments.map((documentName, index) => (
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
                      description={uploadDescription}
                      accept={acceptedFileTypes.join(',')}
                      onChange={(event) => updateRequiredFile(index, event.target.files?.[0])}
                    />
                  </div>
                ))}
              </div>
              <FileUpload
                label="Add other supporting documents"
                description={`Optional. ${uploadDescription}`}
                accept={acceptedFileTypes.join(',')}
                multiple
                onChange={(event) => updateAdditionalFiles(Array.from(event.target.files || []))}
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
        </Card>
      )}

      {error && <Toast tone="red" message={error} />}
      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="outline" icon={<Save size={16} />} disabled={saving || loadingRules || !rules.length} onClick={(event) => void submit(event as unknown as FormEvent, false)}>
          Save as Draft
        </Button>
        <Button type="submit" icon={<Send size={16} />} disabled={saving || loadingRules || !rules.length}>
          Submit Request
        </Button>
      </div>
    </form>
  );
}
