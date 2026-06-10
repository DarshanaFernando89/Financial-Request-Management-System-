import { UploadCloud } from 'lucide-react';
import type { InputHTMLAttributes } from 'react';

type FileUploadProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  description?: string;
};

export function FileUpload({ label = 'Upload document', description, ...props }: FileUploadProps) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-700 hover:border-university-gold">
      <UploadCloud size={22} className="text-university-maroon" />
      <span>
        <span className="block font-medium">{label}</span>
        {description && <span className="block text-xs text-slate-500">{description}</span>}
      </span>
      <input className="sr-only" type="file" {...props} />
    </label>
  );
}
