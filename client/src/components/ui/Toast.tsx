import { clsx } from 'clsx';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import type { ReactNode } from 'react';

export function Toast({ message, tone = 'blue', action }: { message?: string; tone?: 'blue' | 'red' | 'green'; action?: ReactNode }) {
  if (!message) return null;
  const Icon = tone === 'red' ? AlertCircle : tone === 'green' ? CheckCircle2 : Info;
  return (
    <div
      role={tone === 'red' ? 'alert' : 'status'}
      className={clsx(
        'flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium leading-6',
        tone === 'red' && 'border-red-200 bg-red-50 text-red-800',
        tone === 'green' && 'border-green-200 bg-green-50 text-green-800',
        tone === 'blue' && 'border-blue-200 bg-blue-50 text-blue-800'
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3"><Icon size={20} className="mt-0.5 shrink-0" aria-hidden="true" /><span>{message}</span></div>
      {action}
    </div>
  );
}
