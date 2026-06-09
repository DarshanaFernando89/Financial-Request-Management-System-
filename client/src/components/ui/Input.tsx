import { clsx } from 'clsx';
import type { InputHTMLAttributes } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export function Input({ label, error, className, id, ...props }: InputProps) {
  const inputId = id || props.name;
  return (
    <label className="block text-sm font-medium text-slate-700" htmlFor={inputId}>
      {label && <span className="mb-1 block">{label}</span>}
      <input
        id={inputId}
        className={clsx(
          'focus-ring w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400',
          error && 'border-red-500',
          className
        )}
        {...props}
      />
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}
