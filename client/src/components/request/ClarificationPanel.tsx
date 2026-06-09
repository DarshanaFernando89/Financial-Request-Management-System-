import { Send } from 'lucide-react';
import { useState } from 'react';
import { requestApi } from '../../api/requestApi';
import { Button } from '../ui/Button';
import { FileUpload } from '../ui/FileUpload';
import { Textarea } from '../ui/Textarea';

export function ClarificationPanel({ requestId, onDone }: { requestId: string; onDone: () => void }) {
  const [remarks, setRemarks] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit() {
    setError('');
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('remarks', remarks);
      if (file) formData.append('file', file);
      await requestApi.respondClarification(requestId, formData);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to respond.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <Textarea label="Remarks" value={remarks} onChange={(event) => setRemarks(event.target.value)} />
      <FileUpload onChange={(event) => setFile(event.target.files?.[0] || null)} />
      {file && <p className="text-sm text-slate-500">{file.name}</p>}
      {error && <p className="text-sm font-medium text-red-600">{error}</p>}
      <Button icon={<Send size={16} />} disabled={saving} onClick={() => void submit()}>
        Submit Response
      </Button>
    </div>
  );
}
