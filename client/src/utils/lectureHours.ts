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
