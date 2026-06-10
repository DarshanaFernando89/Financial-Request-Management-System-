export function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export const accountRequestEmailDomain = 'uor.lk';
export const accountRequestEmailMessage = `Use your official University of Ruhuna email address ending in @${accountRequestEmailDomain}.`;

export function isAccountRequestEmail(value: string) {
  const email = value.trim().toLowerCase();
  return isEmail(email) && email.endsWith(`@${accountRequestEmailDomain}`);
}

export function positiveNumber(value: unknown) {
  return Number(value) > 0;
}
