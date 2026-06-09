import { clsx } from 'clsx';
import type { SelectHTMLAttributes } from 'react';

type Option = { label: string; value: string };

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  options: Option[];
  error?: string;
};

export function Select({ label, options, error, className, id, ...props }: SelectProps) {
  const inputId = id || props.name;
  return (
    <label className="block text-sm font-medium text-slate-700" htmlFor={inputId}>
      {label && <span className="mb-1 block">{label}</span>}
      <select
        id={inputId}
        className={clsx('focus-ring w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900', error && 'border-red-500', className)}
        {...props}
      >
        <option value="">Select</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}
