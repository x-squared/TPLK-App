import type { Code, DatatypeDefinition } from '../api';

interface DatatypeConfig {
  inputType: 'number' | 'text' | 'date' | 'datetime' | 'boolean' | 'catalogue';
  step?: string;
  unit?: string;
  canonicalUnitUcum?: string;
  allowedUnitsUcum?: string[];
  placeholder?: string;
}

const KNOWN: Record<string, DatatypeConfig> = {
  INTEGER:  { inputType: 'number', step: '1' },
  DECIMAL:  { inputType: 'number', step: 'any' },
  STRING:   { inputType: 'text' },
  DATE:     { inputType: 'date' },
  TIMESTAMP:{ inputType: 'datetime' },
  BOOLEAN:  { inputType: 'boolean' },
  KG:       { inputType: 'number', step: 'any', unit: 'kg' },
  CM:       { inputType: 'number', step: '1', unit: 'cm' },
  BP:       { inputType: 'text', unit: 'mmHg', placeholder: '120/80' },
};

const FALLBACK: DatatypeConfig = { inputType: 'text' };

export function getConfig(dt: Code | null | undefined): DatatypeConfig {
  if (!dt) return FALLBACK;
  if (isCatalogueDatatype(dt)) return { inputType: 'catalogue' };
  return KNOWN[dt.key] ?? FALLBACK;
}

export function getConfigFromMetadata(
  dt: Code | null | undefined,
  metadata: DatatypeDefinition | null | undefined,
): DatatypeConfig {
  if (!metadata) return getConfig(dt);
  const kind = metadata.primitive_kind?.toLowerCase() ?? 'text';
  const inputType: DatatypeConfig['inputType'] =
    kind === 'number' ? 'number'
      : kind === 'date' ? 'date'
        : kind === 'datetime' ? 'datetime'
        : kind === 'boolean' ? 'boolean'
          : kind === 'catalogue' ? 'catalogue'
            : 'text';
  return {
    inputType,
    unit: metadata.unit ?? undefined,
    canonicalUnitUcum: metadata.canonical_unit_ucum ?? metadata.unit ?? undefined,
    allowedUnitsUcum: (() => {
      const raw = metadata.allowed_units_ucum_json;
      if (!raw) return undefined;
      try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return undefined;
        const items = parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
        return items.length ? items : undefined;
      } catch {
        return undefined;
      }
    })(),
    placeholder: metadata.format_pattern ?? undefined,
    step: inputType === 'number' && metadata.precision !== null ? 'any' : undefined,
  };
}

export function isCatalogueDatatype(dt: Code | null | undefined): boolean {
  return (dt?.ext_sys === 'CATALOGUE' || dt?.ext_sys === 'CODE') && !!dt.ext_key;
}

export function getCatalogueType(dt: Code | null | undefined): string {
  return dt?.ext_key ?? '';
}

export function getDatatypeValueSetSource(dt: Code | null | undefined): 'CATALOGUE' | 'CODE' | null {
  if (!dt?.ext_key) return null;
  if (dt.ext_sys === 'CATALOGUE') return 'CATALOGUE';
  if (dt.ext_sys === 'CODE') return 'CODE';
  return null;
}

function formatDateValue(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

function formatDateTimeValue(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function formatValue(
  value: string | null | undefined,
  dt: Code | null | undefined,
  catalogueEntries?: Code[],
): string {
  if (!value && value !== '0') return '–';
  const cfg = getConfig(dt);

  if (cfg.inputType === 'catalogue' && catalogueEntries) {
    const entry = catalogueEntries.find((c) => c.key === value);
    return entry?.name_default ?? value;
  }
  if (cfg.inputType === 'boolean') {
    return value === 'true' ? 'Yes' : value === 'false' ? 'No' : value;
  }
  if (cfg.inputType === 'date') {
    return formatDateValue(value);
  }
  if (cfg.inputType === 'datetime') {
    return formatDateTimeValue(value);
  }
  if (cfg.unit) {
    return `${value} ${cfg.unit}`;
  }
  return value;
}

export function validateValue(
  value: string | null | undefined,
  dt: Code | null | undefined,
): boolean {
  if (!value) return true;
  const cfg = getConfig(dt);
  const key = dt?.key ?? '';

  switch (key) {
    case 'INTEGER':
      return /^-?\d+$/.test(value);
    case 'DECIMAL':
    case 'KG':
    case 'CM':
      return /^-?\d+(\.\d+)?$/.test(value);
    case 'BP':
      return /^\d{2,3}\/\d{2,3}$/.test(value);
    case 'DATE':
      return !isNaN(Date.parse(value));
    case 'TIMESTAMP':
      return !isNaN(Date.parse(value));
    case 'BOOLEAN':
      return value === 'true' || value === 'false';
    default:
      if (cfg.inputType === 'catalogue') return true;
      return true;
  }
}
