export function lectureHoursFromTimeSlots(timeSlots: string) {
  const matches = [...timeSlots.matchAll(/\b([01]?\d|2[0-3]):([0-5]\d)\s*(?:-|–|to)\s*([01]?\d|2[0-3]):([0-5]\d)\b/gi)];
  if (!matches.length) return undefined;

  let minutes = 0;
  for (const match of matches) {
    const start = Number(match[1]) * 60 + Number(match[2]);
    const end = Number(match[3]) * 60 + Number(match[4]);
    if (end <= start) return undefined;
    minutes += end - start;
  }
  return Number((minutes / 60).toFixed(2));
}

export function isLectureHoursPayment(type?: { code?: string; name?: string }) {
  return type?.code === 'LECTURE_HOURS' || type?.name?.trim().toLocaleLowerCase() === 'lecture hours payment';
}

export type LectureTimeSlot = {
  id: string;
  date: string;
  batch: string;
  module: string;
  startTime: string;
  endTime: string;
  ratePerHour: string;
};

export const lectureTimeOptions = Array.from({ length: 72 }, (_, index) => {
  const hour = String(6 + Math.floor(index / 4)).padStart(2, '0');
  const minute = String((index % 4) * 15).padStart(2, '0');
  return { value: `${hour}:${minute}`, label: `${hour}.${minute}` };
});

let nextLectureSlotId = 0;

export function newLectureTimeSlot(): LectureTimeSlot {
  return { id: `lecture-slot-${++nextLectureSlotId}`, date: '', batch: '', module: '', startTime: '', endTime: '', ratePerHour: '' };
}

export function validateLectureTimeSlots(slots: LectureTimeSlot[]) {
  if (!slots.length) return 'Add at least one lecture time slot.';
  for (const [index, slot] of slots.entries()) {
    if (!slot.date || !slot.startTime || !slot.endTime) {
      return `Select a date, start time, and end time for slot ${index + 1}.`;
    }
    const date = new Date(`${slot.date}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(slot.date) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== slot.date) {
      return `Select a valid date for slot ${index + 1}.`;
    }
    if (![slot.startTime, slot.endTime].every((time) => lectureTimeOptions.some((option) => option.value === time))) {
      return `Select times in 15-minute intervals for slot ${index + 1}.`;
    }
    if (slot.endTime <= slot.startTime) return `End time must be after start time for slot ${index + 1}.`;
    if (slots.slice(0, index).some((other) => other.date === slot.date && slot.startTime < other.endTime && slot.endTime > other.startTime)) {
      return `Slot ${index + 1} overlaps another slot on the same date.`;
    }
  }
  return '';
}

export function serializeLectureTimeSlots(slots: LectureTimeSlot[]) {
  return [...slots]
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
    .map((slot) => `${slot.date} ${slot.startTime}-${slot.endTime}`)
    .join('; ');
}

export function validateLectureSlotRates(slots: LectureTimeSlot[]) {
  const index = slots.findIndex((slot) => !Number.isFinite(Number(slot.ratePerHour)) || Number(slot.ratePerHour) <= 0);
  return index < 0 ? '' : `Enter a positive rate per hour for slot ${index + 1}.`;
}

export function lectureSlotAmount(slot: Pick<LectureTimeSlot, 'startTime' | 'endTime' | 'ratePerHour'>) {
  const hours = lectureHoursFromTimeSlots(`${slot.startTime}-${slot.endTime}`);
  const rate = Number(slot.ratePerHour);
  if (hours === undefined || !Number.isFinite(rate) || rate <= 0) return undefined;
  const amount = Number((hours * rate).toFixed(2));
  return Number.isFinite(amount) ? amount : undefined;
}

export function lectureAmountFromTimeSlots(slots: LectureTimeSlot[]) {
  if (validateLectureTimeSlots(slots) || validateLectureSlotRates(slots)) return undefined;
  const amounts = slots.map(lectureSlotAmount);
  if (amounts.some((amount) => amount === undefined)) return undefined;
  const total = Number(amounts.reduce<number>((sum, amount) => sum + amount!, 0).toFixed(2));
  return Number.isFinite(total) ? total : undefined;
}

export type LectureTimeSlotDetail = {
  dateOrDay: string;
  batch?: string;
  module?: string;
  startTime: string;
  endTime: string;
  hours: number;
  ratePerHour?: number;
  amount?: number;
};

export function parseLectureTimeSlotDetails(timeSlots: unknown): LectureTimeSlotDetail[] | undefined {
  if (typeof timeSlots !== 'string' || !timeSlots.trim()) return undefined;
  const entries = timeSlots.split(/[;\n]+/).map((entry) => entry.trim()).filter(Boolean);
  const slots: LectureTimeSlotDetail[] = [];
  for (const entry of entries) {
    const match = entry.match(/^(.*?)\s*\b([01]?\d|2[0-3]):([0-5]\d)\s*(?:-|\u2013|to)\s*([01]?\d|2[0-3]):([0-5]\d)$/i);
    if (!match) return undefined;
    const dateOrDay = match[1].trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateOrDay)) {
      const date = new Date(`${dateOrDay}T00:00:00Z`);
      if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== dateOrDay) return undefined;
    }
    const start = Number(match[2]) * 60 + Number(match[3]);
    const end = Number(match[4]) * 60 + Number(match[5]);
    if (end <= start) return undefined;
    slots.push({
      dateOrDay,
      startTime: `${match[2].padStart(2, '0')}:${match[3]}`,
      endTime: `${match[4].padStart(2, '0')}:${match[5]}`,
      hours: Number(((end - start) / 60).toFixed(2))
    });
  }
  return slots.length ? slots : undefined;
}

export function lectureTimeSlotDetailsFromData(data: Record<string, unknown>) {
  if (Array.isArray(data.lectureTimeSlots)) {
    const details: LectureTimeSlotDetail[] = [];
    for (const slot of data.lectureTimeSlots) {
      if (!slot || typeof slot !== 'object') return undefined;
      const parsed = parseLectureTimeSlotDetails(`${slot.date} ${slot.startTime}-${slot.endTime}`)?.[0];
      const rate = Number(slot.ratePerHour);
      if (!parsed || !Number.isFinite(rate) || rate <= 0) return undefined;
      const batch = slot.batch ?? data.batch;
      const module = slot.module ?? data.module;
      details.push({
        ...parsed,
        ...(batch == null ? {} : { batch: String(batch) }),
        ...(module == null ? {} : { module: String(module) }),
        ratePerHour: rate,
        amount: Number((parsed.hours * rate).toFixed(2))
      });
    }
    return details.length ? details : undefined;
  }
  const slots = parseLectureTimeSlotDetails(data.timeSlots);
  const rate = Number(data.ratePerHour);
  return slots?.map((slot) => ({
    ...slot,
    ...(data.batch == null ? {} : { batch: String(data.batch) }),
    ...(data.module == null ? {} : { module: String(data.module) }),
    ...(Number.isFinite(rate) && rate > 0 ? { ratePerHour: rate, amount: Number((slot.hours * rate).toFixed(2)) } : {})
  }));
}
