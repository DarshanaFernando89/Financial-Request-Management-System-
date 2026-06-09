import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

export function Pagination({ page, pages, onPage }: { page: number; pages: number; onPage: (page: number) => void }) {
  return (
    <div className="flex items-center justify-end gap-2">
      <Button variant="outline" icon={<ChevronLeft size={16} />} disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</Button>
      <span className="text-sm text-slate-500">
        {page} / {pages}
      </span>
      <Button variant="outline" icon={<ChevronRight size={16} />} disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</Button>
    </div>
  );
}
