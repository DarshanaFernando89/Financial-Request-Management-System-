import type { FinancialRequest } from '../../types/request';
import { isLectureHoursPayment, lectureTimeSlotDetailsFromData } from '../../utils/lectureHours';
import { formatCurrency } from '../../utils/formatCurrency';
import { Card } from '../ui/Card';
import { Table } from '../ui/Table';

const lectureDateFormatter = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC'
});

function formatLectureDate(dateOrDay: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateOrDay)
    ? lectureDateFormatter.format(new Date(`${dateOrDay}T00:00:00Z`))
    : dateOrDay || 'Not specified';
}

function formatValue(value: unknown) {
  if (Array.isArray(value) && value.every((item) => item === null || typeof item !== 'object')) return value.join(', ');
  return typeof value === 'object' && value !== null ? JSON.stringify(value) : value == null ? '\u2014' : String(value);
}

export function RequestDataCard({ request }: { request: FinancialRequest }) {
  const type = typeof request.requestType === 'object' ? request.requestType : undefined;
  const fieldLabels = new Map((type?.fields || []).map((field) => [field.name, field.label]));
  const data = request.requestData || {};
  const lectureSlots = isLectureHoursPayment(type) ? lectureTimeSlotDetailsFromData(data) : undefined;

  return (
    <Card>
      <h2 className="mb-4 font-semibold text-slate-900">Request Data</h2>
      <dl className="grid gap-3 text-sm md:grid-cols-2">
        {Object.entries(data).filter(([key]) => !lectureSlots || !['timeSlots', 'lectureTimeSlots'].includes(key)).map(([key, value]) => (
          <div key={key} className="rounded-md bg-slate-50 p-3">
            <dt className="font-semibold text-slate-500">{fieldLabels.get(key) || key.replace(/([A-Z])/g, ' $1')}</dt>
            <dd className="mt-1 whitespace-pre-wrap break-words text-slate-900">{formatValue(value)}</dd>
          </div>
        ))}
      </dl>
      {lectureSlots && (
        <section className="mt-5" aria-label="Lecture dates and time slots">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Lecture dates and time slots</h3>
          <Table
            rows={lectureSlots}
            columns={[
              { key: 'date', header: 'Date / Day', render: (slot) => formatLectureDate(slot.dateOrDay), className: 'whitespace-nowrap' },
              { key: 'batch', header: 'Batch', render: (slot) => slot.batch || '\u2014' },
              { key: 'module', header: 'Module', render: (slot) => slot.module || '\u2014' },
              { key: 'startTime', header: 'Start time', render: (slot) => slot.startTime },
              { key: 'endTime', header: 'End time', render: (slot) => slot.endTime },
              { key: 'hours', header: 'Lecture hours', render: (slot) => slot.hours },
              { key: 'rate', header: 'Rate per hour', render: (slot) => slot.ratePerHour === undefined ? '\u2014' : formatCurrency(slot.ratePerHour, request.currency), className: 'whitespace-nowrap' },
              { key: 'amount', header: 'Slot amount', render: (slot) => slot.amount === undefined ? '\u2014' : formatCurrency(slot.amount, request.currency), className: 'whitespace-nowrap' }
            ]}
          />
        </section>
      )}
    </Card>
  );
}
