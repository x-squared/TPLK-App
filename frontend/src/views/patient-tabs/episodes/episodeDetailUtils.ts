export function toFieldLabel(key: string, prefix?: string): string {
  const normalized = prefix && key.startsWith(prefix) ? key.slice(prefix.length) : key;
  return normalized
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function isDateField(key: string): boolean {
  return /_date$|_start$|_end$|_sent$/.test(key);
}

export function formatEpisodeDetailValue(
  key: string,
  value: unknown,
  formatDate: (iso: string | null) => string
): string {
  if (value === null || value === undefined || value === '') return '–';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value) || isDateField(key)) {
      return formatDate(value);
    }
    return value;
  }
  return String(value);
}
