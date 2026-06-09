export function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function positiveNumber(value: unknown) {
  return Number(value) > 0;
}
