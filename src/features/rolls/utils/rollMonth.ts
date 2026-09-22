export function formatRollMonth(value: string): string {
  const parsed = parseRollMonth(value);
  return new Date(parsed.year, parsed.month - 1).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });
}

export function parseRollMonth(value: string): { month: number; year: number } {
  const [year, month] = value.split('-').map(Number);
  return { month, year };
}

export function toRollMonth(year: number, month: number): string {
  return year + '-' + String(month).padStart(2, '0');
}
