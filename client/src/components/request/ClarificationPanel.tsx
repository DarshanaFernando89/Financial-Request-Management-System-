import { FileText, RefreshCcw, Send, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { requestApi } from '../../api/requestApi';
import type { RequestDocument } from '../../types/request';
import { Button } from '../ui/Button';
import { FileUpload } from '../ui/FileUpload';
import { Input } from '../ui/Input';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Textarea } from '../ui/Textarea';

type PendingDocument = {
  key: string;
  file: File;
  description: string;
  replacementFor?: string;
};

function documentUrl(document: RequestDocument) {
  return document.fileUrl.startsWith('http')
    ? document.fileUrl
    : `${import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:5000'}${document.fileUrl}`;
}

export function ClarificationPanel({ requestId, onDone }: { requestId: string; onDone: () => void }) {
  const [remarks, setRemarks] = useState('');
  const [documents, setDocuments] = useState<RequestDocument[]>([]);
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [pendingDocuments, setPendingDocuments] = useState<PendingDocument[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    requestApi.get(requestId)
      .then((request) => {
        if (active) setDocuments(request.documents || []);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Unable to load attached documents.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [requestId]);

  function markRemoved(documentId: string) {
    setRemovedIds((current) => {
      const next = new Set(current);
      if (next.has(documentId)) {
        next.delete(documentId);
        setPendingDocuments((items) => items.filter((item) => item.replacementFor !== documentId));
      } else {
        next.add(documentId);
      }
      return next;
    });
  }

  function replaceDocument(document: RequestDocument, file?: File) {
    if (!file || !document._id) return;
    setRemovedIds((current) => new Set(current).add(document._id!));
    setPendingDocuments((items) => [
      ...items.filter((item) => item.replacementFor !== document._id),
      {
        key: `${document._id}-${file.name}-${file.lastModified}`,
        file,
        description: document.description || `Replacement for ${document.originalName}`,
        replacementFor: document._id
      }
    ]);
  }

  function addDocuments(files: FileList | null) {
    if (!files) return;
    const added = Array.from(files).map((file, index) => ({
      key: `${file.name}-${file.lastModified}-${Date.now()}-${index}`,
      file,
      description: 'Additional supporting document'
    }));
    setPendingDocuments((items) => [...items, ...added]);
  }

  function updateDescription(key: string, description: string) {
    setPendingDocuments((items) => items.map((item) => item.key === key ? { ...item, description } : item));
  }

  async function submit() {
    setError('');
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('remarks', remarks);
      formData.append('removeDocumentIds', JSON.stringify([...removedIds]));
      pendingDocuments.forEach((document) => {
        formData.append('files', document.file);
        formData.append('documentDescriptions', document.description);
      });
      await requestApi.respondClarification(requestId, formData);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to respond.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <Textarea label="Remarks" value={remarks} onChange={(event) => setRemarks(event.target.value)} />

      <section className="space-y-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Current documents</h3>
          <p className="text-xs text-slate-500">Replace an unclear file, or remove it if it is no longer needed.</p>
        </div>
        {loading ? <LoadingSpinner /> : documents.length === 0 ? (
          <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-500">No documents are currently attached.</p>
        ) : documents.map((document) => {
          const id = document._id;
          const removed = Boolean(id && removedIds.has(id));
          const replacement = pendingDocuments.find((item) => item.replacementFor === id);
          return (
            <div key={id || document.filename} className={`rounded-md border p-3 ${removed ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <a className="flex min-w-0 items-center gap-2 text-sm font-medium text-slate-700 hover:underline" href={documentUrl(document)} target="_blank" rel="noreferrer">
                  <FileText size={17} className="shrink-0 text-university-maroon" />
                  <span className="truncate">{document.originalName}</span>
                </a>
                {id && (
                  <div className="flex items-center gap-2">
                    <label className="focus-ring inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                      <RefreshCcw size={14} /> Replace
                      <input className="sr-only" type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx" onChange={(event) => { replaceDocument(document, event.target.files?.[0]); event.target.value = ''; }} />
                    </label>
                    <Button className="min-h-9 px-3 py-1.5 text-xs" variant={removed ? 'outline' : 'danger'} icon={removed ? <RefreshCcw size={14} /> : <Trash2 size={14} />} onClick={() => markRemoved(id)}>
                      {removed ? 'Keep' : 'Remove'}
                    </Button>
                  </div>
                )}
              </div>
              {removed && <p className="mt-2 text-xs font-medium text-red-700">{replacement ? `Will be replaced by ${replacement.file.name}` : 'Will be removed when you submit.'}</p>}
            </div>
          );
        })}
      </section>

      <section className="space-y-3">
        <FileUpload label="Add other documents" description="Select one or more files requested by the approving authority." multiple accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx" onChange={(event) => { addDocuments(event.target.files); event.target.value = ''; }} />
        {pendingDocuments.map((document) => (
          <div key={document.key} className="grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 md:grid-cols-[minmax(0,1fr)_minmax(220px,1fr)_auto] md:items-end">
            <div className="min-w-0 text-sm">
              <span className="block text-xs font-medium text-slate-500">{document.replacementFor ? 'Replacement file' : 'New document'}</span>
              <span className="block truncate font-medium text-slate-800">{document.file.name}</span>
            </div>
            <Input label="Document description" value={document.description} onChange={(event) => updateDescription(document.key, event.target.value)} />
            <Button variant="ghost" aria-label={`Remove ${document.file.name}`} icon={<X size={16} />} onClick={() => setPendingDocuments((items) => items.filter((item) => item.key !== document.key))}>Remove</Button>
          </div>
        ))}
      </section>

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}
      <Button icon={<Send size={16} />} disabled={saving || loading} onClick={() => void submit()}>
        Submit Response
      </Button>
    </div>
  );
}
