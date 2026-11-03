// Photo dates are stored as local calendar days (YYYY-MM-DD) so they never shift across time zones.

export function toPhotoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function todayPhotoDate(): string {
  const now = new Date();
  return toPhotoDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function parsePhotoDate(value: string): { year: number; month: number; day: number } {
  const [year, month, day] = value.split('-').map(Number);
  return { year, month, day };
}

export function isPhotoDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(value);
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function formatPhotoDate(value: string, language = 'en'): string {
  const { year, month, day } = parsePhotoDate(value);
  return new Date(year, month - 1, day).toLocaleDateString(language, { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Reads EXIF "YYYY:MM:DD HH:MM:SS" (as written by cameras and scanners) into a photo date. */
export function photoDateFromExif(exif: Record<string, unknown> | null | undefined): string | undefined {
  if (!exif) return undefined;
  const nested = exif['{Exif}'] as Record<string, unknown> | undefined;
  const raw = exif.DateTimeOriginal ?? nested?.DateTimeOriginal ?? exif.DateTime;
  if (typeof raw !== 'string') return undefined;
  const match = /^(\d{4}):(\d{2}):(\d{2})/.exec(raw);
  if (!match) return undefined;
  const value = `${match[1]}-${match[2]}-${match[3]}`;
  return isPhotoDate(value) ? value : undefined;
}
