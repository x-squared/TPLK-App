import { formatDateDdMmYyyy } from './dateFormat';

interface PatientFavoriteParts {
  fullName: string | null | undefined;
  birthDate: string | null | undefined;
  pid: string | null | undefined;
}

interface EpisodeDisplayParts {
  patientName: string | null | undefined;
  organName: string | null | undefined;
  startDate: string | null | undefined;
}

const clean = (value: string | null | undefined, fallback: string): string => {
  const text = value?.trim();
  return text ? text : fallback;
};

export function formatPatientFavoriteName(parts: PatientFavoriteParts): string {
  const fullName = clean(parts.fullName, 'Unknown patient');
  const birthDate = formatDateDdMmYyyy(parts.birthDate);
  const pid = clean(parts.pid, '–');
  return `${fullName} (${birthDate}), ${pid}`;
}

export function formatEpisodeDisplayName(parts: EpisodeDisplayParts): string {
  const patient = clean(parts.patientName, 'Unknown patient');
  const organ = clean(parts.organName, 'Unknown organ');
  const start = formatDateDdMmYyyy(parts.startDate);
  return `${patient}, ${organ}, ${start}`;
}

export function formatOrganNames(
  organs: Array<{ key?: string | null }> | null | undefined,
  fallbackOrganName?: string | null,
  resolveOrganLabel?: (organ: { key?: string | null }) => string,
): string {
  const humanize = (key: string): string =>
    key
      .replace(/[_\s]+/g, ' ')
      .trim()
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  const names = (organs ?? [])
    .map((organ) => {
      const resolved = resolveOrganLabel?.(organ);
      if (resolved?.trim()) return resolved.trim();
      const key = (organ.key ?? '').trim();
      if (!key) return '';
      return humanize(key);
    })
    .filter((name) => name.length > 0);
  const unique = [...new Set(names)];
  if (unique.length > 0) return unique.join(' + ');
  return clean(fallbackOrganName, 'Unknown organ');
}

interface EpisodeFavoriteParts {
  fullName: string | null | undefined;
  birthDate: string | null | undefined;
  pid: string | null | undefined;
  organName: string | null | undefined;
  startDate: string | null | undefined;
}

export function formatEpisodeFavoriteName(parts: EpisodeFavoriteParts): string {
  const patientPart = formatPatientFavoriteName({
    fullName: parts.fullName,
    birthDate: parts.birthDate,
    pid: parts.pid,
  });
  return formatEpisodeDisplayName({
    patientName: patientPart,
    organName: parts.organName,
    startDate: parts.startDate,
  });
}

interface TaskPatientReferenceParts {
  patientId: number;
  fullName: string | null | undefined;
  birthDate: string | null | undefined;
  pid: string | null | undefined;
}

interface TaskEpisodeReferenceParts {
  episodeId: number;
  fullName: string | null | undefined;
  birthDate: string | null | undefined;
  pid: string | null | undefined;
  organName: string | null | undefined;
  startDate: string | null | undefined;
}

export function formatTaskPatientReference(parts: TaskPatientReferenceParts): string {
  const hasCorePatientData = Boolean(parts.fullName?.trim() || parts.pid?.trim());
  if (!hasCorePatientData) return `Patient #${parts.patientId}`;
  return formatPatientFavoriteName({
    fullName: parts.fullName,
    birthDate: parts.birthDate,
    pid: parts.pid,
  });
}

export function formatTaskEpisodeReference(parts: TaskEpisodeReferenceParts): string {
  const hasEpisodeContext = Boolean(parts.organName?.trim() || parts.startDate);
  if (!hasEpisodeContext) return `Episode #${parts.episodeId}`;
  return formatEpisodeFavoriteName({
    fullName: parts.fullName,
    birthDate: parts.birthDate,
    pid: parts.pid,
    organName: parts.organName,
    startDate: parts.startDate,
  });
}

interface DefaultEpisodeReferenceParts {
  episodeId: number | null | undefined;
  episodeCaseNumber: string | null | undefined;
  patientFullName?: string | null;
  patientBirthDate?: string | null;
  patientPid?: string | null;
  emptySymbol?: string;
}

export function formatDefaultEpisodeReference(parts: DefaultEpisodeReferenceParts): string {
  const empty = clean(parts.emptySymbol, '–');
  const caseToken = clean(parts.episodeCaseNumber, '');
  const patientName = (parts.patientFullName ?? '').trim();
  if (!patientName) return caseToken || empty;
  const birthDate = formatDateDdMmYyyy(parts.patientBirthDate);
  const pid = clean(parts.patientPid, empty);
  if (!caseToken) return `${patientName} (${birthDate}, ${pid})`;
  return `${patientName} (${birthDate}, ${pid}) - ${caseToken}`;
}

interface CoordinationReferenceParts {
  coordinationId: number | null | undefined;
  donorFullName?: string | null;
  swtplNumber?: string | null;
  emptySymbol?: string;
}

export function formatCoordinationReferenceName(parts: CoordinationReferenceParts): string {
  const empty = clean(parts.emptySymbol, '–');
  const donorName = (parts.donorFullName ?? '').trim();
  const swtpl = (parts.swtplNumber ?? '').trim();
  if (donorName && swtpl) return `${donorName} (${swtpl})`;
  if (donorName) return donorName;
  if (swtpl) return swtpl;
  if (parts.coordinationId != null) return `#${parts.coordinationId}`;
  return empty;
}

interface EpisodeStatusReferenceParts {
  phaseLabel: string | null | undefined;
  processInfo?: string | null | undefined;
  emptySymbol?: string;
}

export function formatEpisodeStatusReference(parts: EpisodeStatusReferenceParts): string {
  const phase = clean(parts.phaseLabel, clean(parts.emptySymbol, '–'));
  const info = clean(parts.processInfo, '(-)');
  return `${phase} ${info}`;
}
