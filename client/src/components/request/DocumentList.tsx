import { FileText } from 'lucide-react';
import type { RequestDocument } from '../../types/request';
import { EmptyState } from '../ui/EmptyState';
import { formatDate } from '../../utils/formatDate';
import { Badge } from '../ui/Badge';

export function DocumentList({ documents }: { documents: RequestDocument[] }) {
  if (!documents?.length) return <EmptyState title="No documents attached" />;
  const orderedDocuments = [...documents].sort((first, second) => {
    if (first.source === 'CLARIFICATION_RESPONSE' && second.source !== 'CLARIFICATION_RESPONSE') return -1;
    if (first.source !== 'CLARIFICATION_RESPONSE' && second.source === 'CLARIFICATION_RESPONSE') return 1;
    return new Date(second.uploadedAt || 0).getTime() - new Date(first.uploadedAt || 0).getTime();
  });

  return (
    <div className="space-y-2">
      {orderedDocuments.map((document) => (
        <a
          key={document._id || document.filename}
          className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm hover:bg-slate-50 ${
            document.source === 'CLARIFICATION_RESPONSE' ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white'
          }`}
          href={document.fileUrl.startsWith('http') ? document.fileUrl : `${import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:5000'}${document.fileUrl}`}
          target="_blank"
          rel="noreferrer"
        >
          <span className="flex min-w-0 items-center gap-2">
            <FileText size={17} className="shrink-0 text-university-maroon" />
            <span className="min-w-0">
              <span className="block truncate font-medium text-slate-700">{document.originalName}</span>
              {document.description && <span className="block truncate text-xs text-slate-500">{document.description}</span>}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            {document.source === 'CLARIFICATION_RESPONSE' && (
              <Badge tone="blue">New clarification document{document.clarificationRound ? ` ${document.clarificationRound}` : ''}</Badge>
            )}
            <span className="text-xs text-slate-500">{formatDate(document.clarificationRespondedAt || document.uploadedAt)}</span>
          </span>
        </a>
      ))}
    </div>
  );
}
