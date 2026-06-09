import { CheckCircle2, Circle, Clock, XCircle } from 'lucide-react';
import { roleLabel } from '../../utils/roleLabels';
import type { WorkflowStep } from '../../types/request';

function iconFor(status: WorkflowStep['status']) {
  if (status === 'COMPLETED') return <CheckCircle2 className="text-green-600" size={18} />;
  if (status === 'REJECTED') return <XCircle className="text-red-600" size={18} />;
  if (status === 'PENDING' || status === 'INFO_REQUESTED') return <Clock className="text-blue-600" size={18} />;
  return <Circle className="text-slate-400" size={18} />;
}

export function Timeline({ steps }: { steps: WorkflowStep[] }) {
  return (
    <ol className="space-y-3">
      {steps.map((step) => (
        <li key={step.stepIndex} className="flex gap-3">
          <div className="mt-0.5">{iconFor(step.status)}</div>
          <div>
            <p className="text-sm font-semibold text-slate-900">{roleLabel(step.role)}</p>
            <p className="text-xs uppercase tracking-wide text-slate-500">{step.stepType.replace('_', ' ')} - {step.status.replace('_', ' ')}</p>
            {step.remarks && <p className="mt-1 text-sm text-slate-600">{step.remarks}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
