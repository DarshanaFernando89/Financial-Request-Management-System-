export function formatCurrency(value?: number, currency = 'LKR') {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2
  }).format(value || 0);
}
