import { Timeline } from '../ui/Timeline';
import type { WorkflowStep } from '../../types/request';

export function RequestTimeline({ steps }: { steps: WorkflowStep[] }) {
  return <Timeline steps={steps || []} />;
}
