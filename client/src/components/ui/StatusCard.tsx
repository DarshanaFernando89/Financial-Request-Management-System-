import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

type StatusCardProps = {
  title: string;
  value: ReactNode;
  caption?: string;
  tone?: 'gold' | 'green' | 'red' | 'blue' | 'gray';
  onClick?: () => void;
  to?: string;
  icon?: ReactNode;
};

const tones = {
  gold: 'border-yellow-300 bg-yellow-50',
  green: 'border-green-200 bg-green-50',
  red: 'border-red-200 bg-red-50',
  blue: 'border-blue-200 bg-blue-50',
  gray: 'border-slate-200 bg-white'
};

const iconTones = {
  gold: 'bg-yellow-100 text-yellow-800',
  green: 'bg-green-100 text-green-800',
  red: 'bg-red-100 text-red-800',
  blue: 'bg-blue-100 text-blue-800',
  gray: 'bg-slate-100 text-slate-700'
};

export function StatusCard({ title, value, caption, tone = 'gray', onClick, to, icon }: StatusCardProps) {
  const className = clsx('min-w-0 rounded-xl border p-5 text-left shadow-sm transition', tones[tone], (onClick || to) && 'focus-ring');
  const content = (
    <>
      <span className="flex min-h-10 items-center justify-between gap-3">
        <span className="text-sm font-semibold leading-5 text-slate-700">{title}</span>
        {icon && <span aria-hidden="true" className={clsx('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', iconTones[tone])}>{icon}</span>}
      </span>
      <span className="mt-4 block break-words text-3xl font-bold tracking-tight text-slate-900 tabular-nums">{value}</span>
      {caption && <span className="mt-2 block text-sm leading-5 text-slate-600">{caption}</span>}
    </>
  );
  if (to) return <Link to={to} className={clsx('button-hover', className)}>{content}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className={className}>{content}</button>;
  return <div className={className}>{content}</div>;
}
