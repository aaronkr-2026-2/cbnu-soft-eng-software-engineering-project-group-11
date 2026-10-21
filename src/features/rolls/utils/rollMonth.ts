export function formatRollMonth(value: string, language = 'en', monthStyle: 'short' | 'long' = 'short'): string {
  const parsed = parseRollMonth(value);
  return new Date(parsed.year, parsed.month - 1).toLocaleDateString(language, {
    month: monthStyle,
    year: 'numeric',
  });
}

/** A Roll month (YYYY-MM), or an exact day (YYYY-MM-DD) kept from older versions. */
export function isRollDate(value: string): boolean {
  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function parseRollMonth(value: string): { month: number; year: number } {
  const [year, month] = value.split('-').map(Number);
  return { month, year };
}

export function toRollMonth(year: number, month: number): string {
  return year + '-' + String(month).padStart(2, '0');
}
