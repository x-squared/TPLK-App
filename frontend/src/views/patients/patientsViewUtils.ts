export function formatDate(iso: string | null): string {
  if (!iso) return '–';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

export function matchesFilter(value: string, filter: string): boolean {
  if (!filter) return true;
  const f = filter.toLowerCase();
  const v = value.toLowerCase();
  if (!f.includes('*')) return v === f;
  const parts = f.split('*');
  let pos = 0;
  for (let i = 0; i < parts.length; i += 1) {
    if (!parts[i]) continue;
    const idx = v.indexOf(parts[i], pos);
    if (idx < 0) return false;
    if (i === 0 && idx !== 0) return false;
    pos = idx + parts[i].length;
  }
  if (parts[parts.length - 1] && pos !== v.length) return false;
  return true;
}

export function matchesWildcardFlexible(value: string, filter: string): boolean {
  if (!filter.trim()) return true;
  const escaped = filter
    .toLowerCase()
    .trim()
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*');
  const pattern = filter.includes('*') ? `^${escaped}$` : escaped;
  return new RegExp(pattern, 'i').test(value.toLowerCase());
}
