import { Plus, Save, X } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { adminApi } from '../../api/adminApi';
import type { RequestField, RequestType } from '../../types/request';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';

function moduleField(requestType: RequestType) {
  return requestType.fields.find((field) => ['module', 'courseName'].includes(field.name));
}

export function PaperMarkingCatalogForm({ requestType, onUpdated }: { requestType: RequestType; onUpdated: (requestType: RequestType) => void }) {
  const initialModuleField = moduleField(requestType);
  const [batches, setBatches] = useState(() => requestType.fields.find((field) => field.name === 'batch')?.options || []);
  const [modules, setModules] = useState(() => initialModuleField?.options || []);
  const [rates, setRates] = useState<Record<string, string>>(() => Object.fromEntries(
    Object.entries(initialModuleField?.validationRules?.ratePerPaperByModule || {}).map(([module, rate]) => [module, String(rate)])
  ));
  const [studentCounts, setStudentCounts] = useState<Record<string, Record<string, string>>>(() => {
    const savedCounts = initialModuleField?.validationRules?.studentCountByBatchAndModule || {};
    return Object.fromEntries(batches.map((batch) => [
      batch,
      Object.fromEntries(modules.map((module) => [module, String(savedCounts[batch]?.[module] ?? '')]))
    ]));
  });
  const [newBatch, setNewBatch] = useState('');
  const [newModule, setNewModule] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function addBatch() {
    const batch = newBatch.trim();
    if (!batch || batches.some((item) => item.toLocaleLowerCase() === batch.toLocaleLowerCase())) return;
    setBatches((current) => [...current, batch]);
    setStudentCounts((current) => ({ ...current, [batch]: Object.fromEntries(modules.map((module) => [module, ''])) }));
    setNewBatch('');
  }

  function addModule() {
    const module = newModule.trim();
    if (!module || modules.some((item) => item.toLocaleLowerCase() === module.toLocaleLowerCase())) return;
    setModules((current) => [...current, module]);
    setRates((current) => ({ ...current, [module]: '' }));
    setStudentCounts((current) => Object.fromEntries(batches.map((batch) => [
      batch,
      { ...(current[batch] || {}), [module]: '' }
    ])));
    setNewModule('');
  }

  function updateStudentCount(batch: string, module: string, value: string) {
    setStudentCounts((current) => ({
      ...current,
      [batch]: { ...(current[batch] || {}), [module]: value }
    }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (!batches.length || !modules.length) {
      setError('Add at least one batch and one module before saving.');
      return;
    }
    for (const module of modules) {
      const rate = Number(rates[module]);
      if (!Number.isFinite(rate) || rate <= 0) {
        setError(`Enter a valid rate per paper for ${module}.`);
        return;
      }
      for (const batch of batches) {
        const count = Number(studentCounts[batch]?.[module]);
        if (!Number.isInteger(count) || count <= 0) {
          setError(`Enter a positive whole-number student count for ${module} in batch ${batch}.`);
          return;
        }
      }
    }

    const fieldName = initialModuleField?.name || 'courseName';
    const ratePerPaperByModule = Object.fromEntries(modules.map((module) => [module, Number(rates[module])]));
    const studentCountByBatchAndModule = Object.fromEntries(batches.map((batch) => [
      batch,
      Object.fromEntries(modules.map((module) => [module, Number(studentCounts[batch]?.[module])]))
    ]));
    const nextFields: RequestField[] = requestType.fields
      .filter((field) => !['examDate', 'module', 'courseName', 'batch'].includes(field.name))
      .map((field) => field.name === 'numberOfPapers'
        ? { ...field, label: 'Total papers', type: 'number', required: true }
        : field);
    const moduleIndex = requestType.fields.findIndex((field) => ['module', 'courseName'].includes(field.name));
    const batchIndex = requestType.fields.findIndex((field) => field.name === 'batch');
    const insertionIndex = Math.min(...[moduleIndex, batchIndex].filter((index) => index >= 0));
    const nextModuleField: RequestField = {
      ...(initialModuleField || { name: fieldName, label: 'Module', type: 'select', required: true }),
      name: fieldName,
      label: 'Module',
      type: 'select',
      required: true,
      options: modules,
      validationRules: { ...initialModuleField?.validationRules, ratePerPaperByModule, studentCountByBatchAndModule }
    };
    const nextBatchField: RequestField = {
      ...(requestType.fields.find((field) => field.name === 'batch') || { name: 'batch', label: 'Batch', type: 'select', required: true }),
      name: 'batch',
      label: 'Batch',
      type: 'select',
      required: true,
      options: batches
    };
    if (insertionIndex >= 0) nextFields.splice(Math.min(insertionIndex, nextFields.length), 0, nextModuleField, nextBatchField);
    else nextFields.unshift(nextModuleField, nextBatchField);
    if (!nextFields.some((field) => field.name === 'numberOfPapers')) {
      nextFields.push({ name: 'numberOfPapers', label: 'Total papers', type: 'number', required: true });
    }

    setSaving(true);
    try {
      const { _id, ...requestTypePayload } = requestType;
      onUpdated(await adminApi.updateRequestType(_id, { ...requestTypePayload, fields: nextFields }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save Paper Marking setup.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)}>
      <Card className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Paper Marking Claim Setup</h2>
          <p className="mt-1 text-sm text-slate-500">Configure batches, modules, rate per paper, and enrolled students for each module in each batch. Requesters cannot claim more papers than the configured student count.</p>
        </div>
        <section className="space-y-3 rounded-md border border-slate-200 p-4">
          <h3 className="font-semibold text-slate-800">Batches</h3>
          <div className="flex gap-2">
            <Input aria-label="Add batch" value={newBatch} placeholder="Add batch" onChange={(event) => setNewBatch(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addBatch(); } }} />
            <Button type="button" variant="secondary" icon={<Plus size={16} />} onClick={addBatch}>Add</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {batches.map((batch) => (
              <span key={batch} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
                {batch}
                <button type="button" className="rounded-full p-0.5 hover:bg-slate-200" aria-label={`Remove ${batch}`} onClick={() => {
                  setBatches((current) => current.filter((item) => item !== batch));
                  setStudentCounts((current) => Object.fromEntries(Object.entries(current).filter(([key]) => key !== batch)));
                }}><X size={14} /></button>
              </span>
            ))}
          </div>
        </section>
        <section className="space-y-3 rounded-md border border-slate-200 p-4">
          <h3 className="font-semibold text-slate-800">Modules, rates, and student counts</h3>
          <div className="flex gap-2">
            <Input aria-label="Add module" value={newModule} placeholder="Add module code or name" onChange={(event) => setNewModule(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addModule(); } }} />
            <Button type="button" variant="secondary" icon={<Plus size={16} />} onClick={addModule}>Add</Button>
          </div>
          {modules.map((module) => (
            <div key={module} className="space-y-3 rounded-md bg-slate-50 p-3">
              <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                <p className="self-center font-semibold text-slate-800">{module}</p>
                <Input label="Rate per paper (LKR)" type="number" min="0.01" step="0.01" required value={rates[module] || ''} onChange={(event) => setRates((current) => ({ ...current, [module]: event.target.value }))} />
                <Button type="button" variant="danger" icon={<X size={16} />} aria-label={`Remove ${module}`} onClick={() => {
                  setModules((current) => current.filter((item) => item !== module));
                  setRates((current) => Object.fromEntries(Object.entries(current).filter(([key]) => key !== module)));
                  setStudentCounts((current) => Object.fromEntries(Object.entries(current).map(([batch, counts]) => [
                    batch,
                    Object.fromEntries(Object.entries(counts).filter(([key]) => key !== module))
                  ])));
                }}>Remove</Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {batches.map((batch) => (
                  <Input
                    key={`${batch}-${module}`}
                    label={`${batch} students enrolled`}
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={studentCounts[batch]?.[module] || ''}
                    onChange={(event) => updateStudentCount(batch, module, event.target.value)}
                  />
                ))}
              </div>
            </div>
          ))}
        </section>
        {error && <p role="alert" className="text-sm font-medium text-red-600">{error}</p>}
        <div className="flex justify-end"><Button type="submit" disabled={saving} icon={<Save size={16} />}>{saving ? 'Saving...' : 'Save Paper Marking setup'}</Button></div>
      </Card>
    </form>
  );
}
