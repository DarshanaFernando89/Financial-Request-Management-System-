import { Plus, Trash2 } from 'lucide-react';
import { lectureHoursFromTimeSlots, lectureSlotAmount, lectureTimeOptions, newLectureTimeSlot, type LectureTimeSlot } from '../../utils/lectureHours';
import { formatCurrency } from '../../utils/formatCurrency';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';

function openDatePicker(input: HTMLInputElement) {
  try {
    input.showPicker?.();
  } catch {
    // The browser's calendar icon remains available if showPicker is restricted.
  }
}

export function LectureTimeSlots({ slots, batches, modules, onChange }: {
  slots: LectureTimeSlot[];
  batches: string[];
  modules: string[];
  onChange: (slots: LectureTimeSlot[]) => void;
}) {
  function updateSlot(id: string, changes: Partial<LectureTimeSlot>) {
    onChange(slots.map((slot) => slot.id === id ? { ...slot, ...changes } : slot));
  }

  return (
    <fieldset className="space-y-3 md:col-span-2">
      <legend className="mb-2 text-sm font-medium text-slate-700">Time slots</legend>
      {slots.map((slot, index) => (
        <div key={slot.id} className="rounded-md border border-slate-200 p-3">
          <p className="mb-2 text-xs font-semibold text-slate-500">Slot {index + 1}</p>
          <div className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Input
              label="Date"
              type="date"
              required
              value={slot.date}
              onClick={(event) => openDatePicker(event.currentTarget)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  openDatePicker(event.currentTarget);
                } else if (event.key.length === 1 || event.key === 'Backspace' || event.key === 'Delete') {
                  event.preventDefault();
                }
              }}
              onPaste={(event) => event.preventDefault()}
              onDrop={(event) => event.preventDefault()}
              onChange={(event) => updateSlot(slot.id, { date: event.target.value })}
            />
            <Select
              label="Batch"
              required
              value={slot.batch}
              options={batches.map((batch) => ({ label: batch, value: batch }))}
              onChange={(event) => updateSlot(slot.id, { batch: event.target.value })}
            />
            <Select
              label="Module"
              required
              value={slot.module}
              options={modules.map((module) => ({ label: module, value: module }))}
              onChange={(event) => updateSlot(slot.id, { module: event.target.value })}
            />
            <Select
              label="Start time"
              required
              value={slot.startTime}
              options={lectureTimeOptions.slice(0, -1)}
              onChange={(event) => {
                const startTime = event.target.value;
                updateSlot(slot.id, { startTime, endTime: slot.endTime > startTime ? slot.endTime : '' });
              }}
            />
            <Select
              label="End time"
              required
              disabled={!slot.startTime}
              value={slot.endTime}
              options={lectureTimeOptions.filter((option) => option.value > slot.startTime)}
              onChange={(event) => updateSlot(slot.id, { endTime: event.target.value })}
            />
            <Input
              label="Rate per hour"
              type="number"
              min="0.01"
              step="0.01"
              required
              value={slot.ratePerHour}
              onChange={(event) => updateSlot(slot.id, { ratePerHour: event.target.value })}
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-slate-600" aria-live="polite">
              Lecture hours: {lectureHoursFromTimeSlots(`${slot.startTime}-${slot.endTime}`) ?? '\u2014'}
              {' · '}Slot amount: {lectureSlotAmount(slot) === undefined ? '\u2014' : formatCurrency(lectureSlotAmount(slot))}
            </p>
            <Button
              variant="ghost"
              icon={<Trash2 size={16} />}
              disabled={slots.length === 1}
              aria-label={`Remove time slot ${index + 1}`}
              onClick={() => onChange(slots.filter((item) => item.id !== slot.id))}
            >
              Remove
            </Button>
          </div>
        </div>
      ))}
      <Button variant="outline" icon={<Plus size={16} />} onClick={() => onChange([...slots, newLectureTimeSlot()])}>
        Add time slot
      </Button>
      {(!batches.length || !modules.length) && <p className="text-sm text-red-600">Batches and modules must be configured by the administrator before requesting lecture payments.</p>}
    </fieldset>
  );
}
