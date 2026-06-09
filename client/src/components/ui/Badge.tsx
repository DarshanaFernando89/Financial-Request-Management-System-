import { clsx } from 'clsx';
import type { HTMLAttributes } from 'react';

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: 'gray' | 'green' | 'red' | 'blue' | 'gold' | 'maroon';
};

const tones = {
  gray: 'bg-slate-100 text-slate-700',
  green: 'bg-green-100 text-green-800',
  red: 'bg-red-100 text-red-800',
  blue: 'bg-blue-100 text-blue-800',
  gold: 'bg-yellow-100 text-yellow-900',
  maroon: 'bg-red-950 text-white'
};

export function Badge({ className, tone = 'gray', ...props }: BadgeProps) {
  return <span className={clsx('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold', tones[tone], className)} {...props} />;
}
