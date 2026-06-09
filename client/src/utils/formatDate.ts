export function formatDate(value?: string | Date) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('en-LK', {
    year: 'numeric',
    month: 'short',
    day: '2-digit'
  }).format(new Date(value));
}
