import { Check, Clock3, MessageSquare, Minus, X } from 'lucide-react';
import { clsx } from 'clsx';
import { useRoleLabel } from '../../hooks/useRoleLabel';
import { formatDateTime } from '../../utils/formatDateTime';
import type { WorkflowStep } from '../../types/request';
import { Badge } from './Badge';
import { EmptyState } from './EmptyState';

const states = {
  COMPLETED: { label: 'Completed', tone: 'green', icon: Check, style: 'border-green-200 bg-green-50 text-green-700' },
  REJECTED: { label: 'Rejected', tone: 'red', icon: X, style: 'border-red-200 bg-red-50 text-red-700' },
  INFO_REQUESTED: { label: 'Needs information', tone: 'gold', icon: MessageSquare, style: 'border-yellow-300 bg-yellow-50 text-yellow-800' },
  PENDING: { label: 'Current stage', tone: 'blue', icon: Clock3, style: 'border-blue-200 bg-blue-50 text-blue-700' },
  WAITING: { label: 'Upcoming', tone: 'gray', icon: Clock3, style: 'border-slate-200 bg-white text-slate-500' },
  SKIPPED: { label: 'Skipped', tone: 'gray', icon: Minus, style: 'border-slate-200 bg-slate-50 text-slate-500' }
} as const;

const stepLabels = { VERIFICATION: 'Verification', APPROVAL: 'Approval', FINANCE_REVIEW: 'Finance review', PAYMENT: 'Payment' };

export function Timeline({ steps }: { steps: WorkflowStep[] }) {
  const label = useRoleLabel();
  if (!steps.length) return <EmptyState title="Approval has not started" description="The approval stages will appear after this claim is submitted." />;
  const orderedSteps = [...steps].sort((a, b) => a.stepIndex - b.stepIndex);
  const completed = steps.filter((step) => step.status === 'COMPLETED').length;
  return (
    <div>
      <p className="mb-5 text-sm font-medium text-slate-600">{completed} of {steps.length} stages completed</p>
      <ol>
        {orderedSteps.map((step, index) => {
          const state = states[step.status];
          const Icon = state.icon;
          const active = step.status === 'PENDING' || step.status === 'INFO_REQUESTED';
          const actor = typeof step.actedBy === 'object' && step.actedBy ? step.actedBy.fullName || step.actedBy.nameWithInitials : undefined;
          return (
            <li key={step._id || step.stepIndex} aria-current={active ? 'step' : undefined} className="relative flex gap-3 pb-5 last:pb-0">
              {index < orderedSteps.length - 1 && <span aria-hidden="true" className={clsx('absolute bottom-0 left-4 top-8 w-px', step.status === 'COMPLETED' ? 'bg-green-200' : 'bg-slate-200')} />}
              <span className={clsx('relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border', state.style)}>
                <Icon size={16} aria-hidden="true" />
              </span>
              <div className={clsx('min-w-0 flex-1 rounded-lg border p-3', active ? state.style : 'border-slate-200 bg-white')}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">{label(step.role)}</p>
                  <Badge tone={state.tone}>{state.label}</Badge>
                </div>
                <p className="mt-1 text-xs font-medium text-slate-600">Step {index + 1} · {stepLabels[step.stepType]}</p>
                {actor && <p className="mt-2 break-words text-sm font-medium text-slate-700">{actor}</p>}
                {step.actedAt && <time dateTime={step.actedAt} className="mt-1 block text-xs text-slate-600">{formatDateTime(step.actedAt)}</time>}
                {step.remarks && <p className="mt-2 break-words border-t border-slate-200 pt-2 text-sm leading-6 text-slate-700">{step.remarks}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
