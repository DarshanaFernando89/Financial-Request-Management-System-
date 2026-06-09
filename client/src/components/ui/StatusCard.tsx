import { clsx } from 'clsx';
import type { ReactNode } from 'react';

type StatusCardProps = {
  title: string;
  value: ReactNode;
  caption?: string;
  tone?: 'gold' | 'green' | 'red' | 'blue' | 'gray';
  onClick?: () => void;
};

const tones = {
  gold: 'border-yellow-300 bg-yellow-50',
  green: 'border-green-200 bg-green-50',
  red: 'border-red-200 bg-red-50',
  blue: 'border-blue-200 bg-blue-50',
  gray: 'border-slate-200 bg-white'
};

export function StatusCard({ title, value, caption, tone = 'gray', onClick }: StatusCardProps) {
  const Component = onClick ? 'button' : 'div';
  return (
    <Component
      onClick={onClick}
      className={clsx('rounded-lg border p-4 text-left shadow-soft transition', tones[tone], onClick && 'hover:-translate-y-0.5 hover:shadow-lg')}
    >
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</span>
      <span className="mt-2 block text-2xl font-bold text-slate-900">{value}</span>
      {caption && <span className="mt-1 block text-sm text-slate-500">{caption}</span>}
    </Component>
  );
}
