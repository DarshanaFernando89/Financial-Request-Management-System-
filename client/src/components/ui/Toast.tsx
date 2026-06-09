import { clsx } from 'clsx';

export function Toast({ message, tone = 'blue' }: { message?: string; tone?: 'blue' | 'red' | 'green' }) {
  if (!message) return null;
  return (
    <div
      className={clsx(
        'rounded-md px-4 py-3 text-sm font-medium',
        tone === 'red' && 'bg-red-50 text-red-700',
        tone === 'green' && 'bg-green-50 text-green-700',
        tone === 'blue' && 'bg-blue-50 text-blue-700'
      )}
    >
      {message}
    </div>
  );
}
