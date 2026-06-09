import { clsx } from 'clsx';
import type { HTMLAttributes } from 'react';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx('rounded-lg border border-slate-200 bg-white p-5 shadow-soft', className)} {...props} />;
}
