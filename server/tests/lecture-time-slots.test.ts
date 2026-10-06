import { describe, expect, it } from 'vitest';
import { lectureAmountFromTimeSlots, lectureHoursFromTimeSlots, lectureTimeOptions, lectureTimeSlotDetailsFromData, parseLectureTimeSlotDetails, serializeLectureTimeSlots, validateLectureSlotRates, validateLectureTimeSlots, type LectureTimeSlot } from '../../client/src/utils/lectureHours';
import { lectureHoursClaimKey, prepareLectureHoursClaim } from '../src/utils/lectureHoursClaim.js';

const slot = (date: string, startTime = '08:00', endTime = '10:15', id = date): LectureTimeSlot => ({ id, date, batch: 'E/26', module: 'EE6101', startTime, endTime, ratePerHour: '2000' });

describe('selected lecture time slots', () => {
  it('offers quarter-hour intervals starting at 06:00', () => {
    expect(lectureTimeOptions).toHaveLength(72);
    expect(lectureTimeOptions[0]).toEqual({ label: '06.00', value: '06:00' });
    expect(lectureTimeOptions[71]).toEqual({ label: '23.45', value: '23:45' });
    expect(lectureTimeOptions).toContainEqual({ label: '18.15', value: '18:15' });
  });

  it('calculates matching frontend/backend hours and amount across different dates', () => {
    const slots = [slot('2026-10-05'), slot('2026-10-07', '18:15', '19:45')];
    expect(validateLectureTimeSlots(slots)).toBe('');
    const timeSlots = serializeLectureTimeSlots(slots);
    expect(lectureHoursFromTimeSlots(timeSlots)).toBe(3.75);
    const prepared = prepareLectureHoursClaim('LECTURE_HOURS', 'Lecture Hours Payment', [
      { name: 'batch', type: 'select', options: ['E/26'] },
      { name: 'module', type: 'select', options: ['EE6101'] }
    ], { batch: 'E/26', module: 'EE6101', timeSlots, ratePerHour: 2000, lectureHours: 99 });
    expect(prepared.requestData).toMatchObject({ timeSlots, lectureHours: 3.75 });
    expect(prepared.amount).toBe(7500);
  });

  it('requires every row to have a date and both times, including newly added rows', () => {
    expect(validateLectureTimeSlots([])).toContain('at least one');
    expect(validateLectureTimeSlots([slot('')])).toContain('Select a date');
    expect(validateLectureTimeSlots([slot('2026-10-05'), slot('2026-10-07', '08:00', '')])).toContain('slot 2');
  });

  it('rejects invalid dates, non-quarter-hour times, and zero or negative durations', () => {
    expect(validateLectureTimeSlots([slot('2026-02-30')])).toContain('valid date');
    expect(validateLectureTimeSlots([slot('2026-10-05', '08:05')])).toContain('15-minute');
    expect(validateLectureTimeSlots([slot('2026-10-05', '08:00', '08:00')])).toContain('after start');
    expect(validateLectureTimeSlots([slot('2026-10-05', '10:00', '08:00')])).toContain('after start');
  });

  it('rejects duplicate and overlapping ranges on the same date', () => {
    expect(validateLectureTimeSlots([slot('2026-10-05'), slot('2026-10-05', '09:00', '11:00', 'second')])).toContain('overlaps');
    expect(validateLectureTimeSlots([slot('2026-10-05'), slot('2026-10-05', '08:00', '10:15', 'second')])).toContain('overlaps');
  });

  it('allows adjacent slots and repeated times on different dates', () => {
    expect(validateLectureTimeSlots([slot('2026-10-05'), slot('2026-10-05', '10:15', '11:00', 'second')])).toBe('');
    expect(validateLectureTimeSlots([slot('2026-10-05'), slot('2026-10-06')])).toBe('');
  });

  it('serializes slots chronologically without changing the displayed row order', () => {
    const slots = [slot('2026-10-07'), slot('2026-10-05', '13:00', '14:00'), slot('2026-10-05', '08:00', '10:15', 'third')];
    expect(serializeLectureTimeSlots(slots)).toBe('2026-10-05 08:00-10:15; 2026-10-05 13:00-14:00; 2026-10-07 08:00-10:15');
    expect(slots[0].date).toBe('2026-10-07');
  });
});

describe('lecture slots in request details', () => {
  it('shows each structured slot with its own rate and amount', () => {
    expect(lectureTimeSlotDetailsFromData({ lectureTimeSlots: [
      { date: '2026-10-04', startTime: '08:00', endTime: '10:00', ratePerHour: 1500 },
      { date: '2026-10-07', startTime: '18:15', endTime: '19:45', ratePerHour: 2500 }
    ] })).toEqual([
      { dateOrDay: '2026-10-04', startTime: '08:00', endTime: '10:00', hours: 2, ratePerHour: 1500, amount: 3000 },
      { dateOrDay: '2026-10-07', startTime: '18:15', endTime: '19:45', hours: 1.5, ratePerHour: 2500, amount: 3750 }
    ]);
  });

  it('uses the shared rate for older claims', () => {
    expect(lectureTimeSlotDetailsFromData({ timeSlots: 'Monday 08:00-10:00', ratePerHour: 1200 })).toEqual([
      { dateOrDay: 'Monday', startTime: '08:00', endTime: '10:00', hours: 2, ratePerHour: 1200, amount: 2400 }
    ]);
  });
  it('keeps each claimed date with its matching time range and duration', () => {
    expect(parseLectureTimeSlotDetails('2026-10-04 04:00-08:00; 2026-10-07 07:30-08:30')).toEqual([
      { dateOrDay: '2026-10-04', startTime: '04:00', endTime: '08:00', hours: 4 },
      { dateOrDay: '2026-10-07', startTime: '07:30', endTime: '08:30', hours: 1 }
    ]);
  });

  it('handles multiple slots on a date and preserves quarter-hour durations', () => {
    expect(parseLectureTimeSlotDetails('2026-10-04 08:00-08:15\n2026-10-04 18:15-19:45')?.map((slot) => slot.hours)).toEqual([0.25, 1.5]);
  });

  it('preserves weekday labels on older claims without inventing dates', () => {
    expect(parseLectureTimeSlotDetails('Monday 8:00-10:00; Wednesday 13:00 to 15:30')).toEqual([
      { dateOrDay: 'Monday', startTime: '08:00', endTime: '10:00', hours: 2 },
      { dateOrDay: 'Wednesday', startTime: '13:00', endTime: '15:30', hours: 2.5 }
    ]);
  });

  it('allows the original value to be displayed if any entry cannot be safely parsed', () => {
    expect(parseLectureTimeSlotDetails('2026-10-04 08:00-10:00; additional notes')).toBeUndefined();
    expect(parseLectureTimeSlotDetails('2026-02-30 08:00-10:00')).toBeUndefined();
    expect(parseLectureTimeSlotDetails('Monday 10:00-08:00')).toBeUndefined();
    expect(parseLectureTimeSlotDetails('')).toBeUndefined();
  });
});

describe('lecture slot payments', () => {
  const fields = [
    { name: 'batch', type: 'select', options: ['E/26', 'E/21'] },
    { name: 'module', type: 'select', options: ['EE6101', 'EE6102'] }
  ];
  const prepare = (slots: unknown) => prepareLectureHoursClaim('LECTURE_HOURS', 'Lecture Hours Payment', fields, {
    batch: 'E/26', module: 'EE6101', lectureTimeSlots: slots, lectureHours: 99, ratePerHour: 999,
    timeSlots: 'untrusted time-slot text'
  });
  const payloadSlot = { date: '2026-10-04', startTime: '08:00', endTime: '10:00', ratePerHour: 1500 };

  it('accepts different configured batches and modules for each slot without shared selections', () => {
    const lectureTimeSlots = [
      { ...payloadSlot, batch: 'E/26', module: 'EE6101' },
      { ...payloadSlot, date: '2026-10-07', batch: 'E/21', module: 'EE6102', ratePerHour: 2500 }
    ];
    const prepared = prepareLectureHoursClaim('LECTURE_HOURS', 'Lecture Hours Payment', fields, { lectureTimeSlots });
    expect(prepared.amount).toBe(8000);
    expect(prepared.requestData).not.toHaveProperty('batch');
    expect(prepared.requestData).not.toHaveProperty('module');
    expect((prepared.requestData.lectureTimeSlots as any[]).map(({ batch, module }) => ({ batch, module }))).toEqual([
      { batch: 'E/26', module: 'EE6101' }, { batch: 'E/21', module: 'EE6102' }
    ]);
    const key = lectureHoursClaimKey('LECTURE_HOURS', prepared.requestData);
    expect(lectureHoursClaimKey('LECTURE_HOURS', { lectureTimeSlots: [...lectureTimeSlots].reverse().map((slot) => ({ ...slot, ratePerHour: 100 })) })).toBe(key);
    expect(lectureHoursClaimKey('LECTURE_HOURS', { lectureTimeSlots: lectureTimeSlots.map((slot) => ({ ...slot, module: 'EE6101' })) })).not.toBe(key);
  });

  it('validates batch and module on each slot and preserves older structured claims', () => {
    expect(() => prepare([{ ...payloadSlot, batch: '', module: 'EE6101' }])).toThrow('Select an available batch');
    expect(() => prepare([{ ...payloadSlot, batch: 'E/26', module: 'missing' }])).toThrow('Select an available module');
    const prepared = prepare([payloadSlot]);
    expect(prepared.requestData.lectureTimeSlots).toEqual([{ ...payloadSlot, batch: 'E/26', module: 'EE6101', hours: 2, amount: 3000 }]);
    expect(lectureHoursClaimKey('LECTURE_HOURS', prepared.requestData)).toBe('e/26|ee6101|2026-10-04 08:00-10:00');
  });

  it('calculates matching frontend and backend totals from different rates and ignores supplied totals', () => {
    const slots = [
      { ...slot('2026-10-04', '08:00', '10:00'), ratePerHour: '1500' },
      { ...slot('2026-10-07', '18:15', '19:45'), ratePerHour: '2500' }
    ];
    expect(lectureAmountFromTimeSlots(slots)).toBe(6750);
    const prepared = prepare(slots.map(({ id, ...slot }) => ({ ...slot, hours: 99, amount: 1 })));
    expect(prepared.amount).toBe(6750);
    expect(prepared.requestData).toMatchObject({ lectureHours: 3.5, timeSlots: '2026-10-04 08:00-10:00; 2026-10-07 18:15-19:45' });
    expect(prepared.requestData).not.toHaveProperty('ratePerHour');
    expect((prepared.requestData.lectureTimeSlots as any[]).map(({ ratePerHour, hours, amount }) => ({ ratePerHour, hours, amount }))).toEqual([
      { ratePerHour: 1500, hours: 2, amount: 3000 }, { ratePerHour: 2500, hours: 1.5, amount: 3750 }
    ]);
  });

  it('sums amounts rounded to cents per slot consistently', () => {
    const slots = [
      { ...slot('2026-10-04', '08:00', '08:15'), ratePerHour: '100.03' },
      { ...slot('2026-10-04', '08:15', '08:30', 'second'), ratePerHour: '100.03' }
    ];
    expect(lectureAmountFromTimeSlots(slots)).toBe(50.02);
    expect(prepare(slots).amount).toBe(50.02);
  });

  it.each(['', '0', '-1', 'NaN', 'Infinity'])('rejects an invalid individual rate %j', (ratePerHour) => {
    const slots = [{ ...slot('2026-10-04'), ratePerHour }];
    expect(validateLectureSlotRates(slots)).toContain('positive rate');
    expect(lectureAmountFromTimeSlots(slots)).toBeUndefined();
    expect(() => prepare([{ ...payloadSlot, ratePerHour }])).toThrow('positive rate');
  });

  it('rejects incomplete, invalid, non-quarter-hour, and overlapping slots on the backend', () => {
    expect(() => prepare([])).toThrow('at least one');
    expect(() => prepare([{ ...payloadSlot, date: '2026-02-30' }])).toThrow('valid date');
    expect(() => prepare([{ ...payloadSlot, startTime: '08:05' }])).toThrow('15-minute');
    expect(() => prepare([{ ...payloadSlot, endTime: '08:00' }])).toThrow('end after');
    expect(() => prepare([payloadSlot, { ...payloadSlot, startTime: '09:00' }])).toThrow('must not overlap');
  });
});
