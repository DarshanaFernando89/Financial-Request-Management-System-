import { clsx } from 'clsx';
import type { TextareaHTMLAttributes } from 'react';

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
};

export function Textarea({ label, error, className, id, ...props }: TextareaProps) {
  const inputId = id || props.name;
  return (
    <label className="block text-sm font-medium text-slate-700" htmlFor={inputId}>
      {label && <span className="mb-1 block">{label}</span>}
      <textarea
        id={inputId}
        className={clsx('focus-ring min-h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900', error && 'border-red-500', className)}
        {...props}
      />
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}
