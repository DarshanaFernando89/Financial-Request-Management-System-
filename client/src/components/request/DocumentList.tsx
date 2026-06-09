import { FileText } from 'lucide-react';
import type { RequestDocument } from '../../types/request';
import { EmptyState } from '../ui/EmptyState';
import { formatDate } from '../../utils/formatDate';

export function DocumentList({ documents }: { documents: RequestDocument[] }) {
  if (!documents?.length) return <EmptyState title="No documents attached" />;
  return (
    <div className="space-y-2">
      {documents.map((document) => (
        <a
          key={document._id || document.filename}
          className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50"
          href={document.fileUrl.startsWith('http') ? document.fileUrl : `${import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:5000'}${document.fileUrl}`}
          target="_blank"
          rel="noreferrer"
        >
          <span className="flex min-w-0 items-center gap-2">
            <FileText size={17} className="shrink-0 text-university-maroon" />
            <span className="truncate font-medium text-slate-700">{document.originalName}</span>
          </span>
          <span className="shrink-0 text-xs text-slate-500">{formatDate(document.uploadedAt)}</span>
        </a>
      ))}
    </div>
  );
}
