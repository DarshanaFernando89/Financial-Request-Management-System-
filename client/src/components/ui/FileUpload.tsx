import { UploadCloud } from 'lucide-react';
import type { InputHTMLAttributes } from 'react';

export function FileUpload(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-700 hover:border-university-gold">
      <UploadCloud size={22} className="text-university-maroon" />
      <span className="font-medium">Upload document</span>
      <input className="sr-only" type="file" {...props} />
    </label>
  );
}
