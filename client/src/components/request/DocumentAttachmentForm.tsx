import { Toast } from '../ui/Toast';
import { useEffect, useState } from 'react';
import { requestApi } from '../../api/requestApi';
import type { FinancialRequest } from '../../types/request';
import { validateDocumentFiles, type DocumentPolicy } from '../../utils/documentPolicy';
import { FileUpload } from '../ui/FileUpload';

export function DocumentAttachmentForm({ request, onUploaded }: { request: FinancialRequest; onUploaded: () => void }) {
  const [policy, setPolicy] = useState<DocumentPolicy | null>(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  useEffect(() => {
    requestApi.documentPolicy(request._id).then(setPolicy).catch((err) => setError(err.message));
  }, [request._id]);

  async function upload(file: File | undefined, description: string) {
    if (!file || !policy) return;
    const message = validateDocumentFiles([file], policy.acceptedFileTypes);
    if (message) { setError(message); return; }
    setError('');
    setUploading(true);
    try {
      const payload = new FormData();
      payload.append('file', file);
      payload.append('description', description);
      await requestApi.uploadDocument(request._id, payload);
      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to upload document.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mt-4 space-y-3">
      {policy ? <>
        <p className="text-sm text-slate-600">Required documents: {policy.requiredDocuments.join(', ') || 'None'}. Accepted: {policy.acceptedFileTypes.join(', ')}. Up to 10 MB per file.</p>
        {policy.requiredDocuments.filter((name) => !request.documents.some((document) => document.description === name)).map((name) => (
          <FileUpload key={name} label={`Upload ${name}`} accept={policy.acceptedFileTypes.join(',')} disabled={uploading} onChange={(event) => void upload(event.target.files?.[0], name)} />
        ))}
        <FileUpload label="Add supporting document" description="Optional" accept={policy.acceptedFileTypes.join(',')} disabled={uploading} onChange={(event) => void upload(event.target.files?.[0], 'Additional supporting document')} />
      </> : !error && <p className="text-sm text-slate-500">Loading document requirements...</p>}
      {uploading && <p className="text-sm text-slate-500">Uploading document...</p>}
      {error && <Toast tone="red" message={error} />}
    </div>
  );
}
