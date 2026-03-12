import type { Code } from '../api';

type Translator = (key: string, englishDefault: string) => string;

function normalizeSegment(value: string | null | undefined): string {
  return (value ?? '').trim().toUpperCase();
}

function humanizeKey(key: string): string {
  return key
    .toLowerCase()
    .split('_')
    .filter((segment) => segment.length > 0)
    .map((segment) => segment[0].toUpperCase() + segment.slice(1))
    .join(' ');
}

export function translateCodeLabel(
  t: Translator,
  code: Pick<Code, 'type' | 'key' | 'name_default'> | null | undefined,
): string {
  if (!code) return t('common.emptySymbol', '–');
  const type = normalizeSegment(code.type);
  const key = normalizeSegment(code.key);
  if (!type || !key) return code.name_default || t('common.emptySymbol', '–');
  return t(`server.codeValuesByType.${type}.${key}`, humanizeKey(key));
}

