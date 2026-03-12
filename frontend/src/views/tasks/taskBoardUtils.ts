import type { Task } from '../../api';
import { translateCodeLabel } from '../../i18n/codeTranslations';
import { TASKBOARD_I18N_KEYS } from '../../i18n/keys';
import { formatDateDdMmYyyy, formatDateTimeDdMmYyyy } from '../layout/dateFormat';
import { formatTaskEpisodeReference, formatTaskPatientReference } from '../layout/episodeDisplay';
import type {
  TaskBoardRow,
  TaskGroupState,
  TaskReferenceContext,
  TaskReferenceSegment,
} from './taskBoardTypes';

type Translate = (key: string, englishDefault: string) => string;
const passthroughTranslate: Translate = (_key, englishDefault) => englishDefault;

export function buildTaskReferences(
  context: TaskReferenceContext,
  t: Translate = passthroughTranslate,
): TaskReferenceSegment[] {
  const segments: TaskReferenceSegment[] = [];
  const { group, patient, episode, coordinationLabel } = context;

  if (group.coordination_id != null) {
    segments.push({
      key: `coordination-${group.coordination_id}`,
      label: coordinationLabel
        ? `${t(TASKBOARD_I18N_KEYS.references.coordination, 'Coordination')}: ${coordinationLabel}`
        : `${t(TASKBOARD_I18N_KEYS.references.coordination, 'Coordination')} #${group.coordination_id}`,
      kind: 'other',
    });
    if (group.organ) {
      segments.push({
        key: `coordination-organ-${group.organ.id}`,
        label: `${t(TASKBOARD_I18N_KEYS.references.organ, 'Organ')}: ${translateCodeLabel(t, group.organ)}`,
        kind: 'other',
      });
    }
  }

  if (group.episode_id == null && group.patient_id != null && group.coordination_id == null) {
    segments.push({
      key: `patient-${group.patient_id}`,
      label: formatTaskPatientReference({
        patientId: group.patient_id,
        fullName: patient ? `${patient.first_name} ${patient.name}`.trim() : null,
        birthDate: patient?.date_of_birth,
        pid: patient?.pid,
      }),
      kind: 'patient',
    });
  }

  if (group.episode_id != null && group.coordination_id == null) {
    segments.push({
      key: `episode-${group.episode_id}`,
      label: formatTaskEpisodeReference({
        episodeId: group.episode_id,
        fullName: patient ? `${patient.first_name} ${patient.name}`.trim() : null,
        birthDate: patient?.date_of_birth,
        pid: patient?.pid,
        organName: translateCodeLabel(t, episode?.organ),
        startDate: episode?.start,
      }),
      kind: 'episode',
    });
  }

  if (group.tpl_phase) {
    segments.push({
      key: `phase-${group.tpl_phase.id}`,
      label: translateCodeLabel(t, group.tpl_phase),
      kind: 'phase',
    });
  }

  return segments;
}

export function isDoneTask(task: Task): boolean {
  return task.status?.key === 'COMPLETED';
}

export function isCancelledTask(task: Task): boolean {
  return task.status?.key === 'CANCELLED';
}

function isOverdue(task: Task): boolean {
  if (!task.until) return false;
  const due = new Date(task.until);
  if (Number.isNaN(due.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return due.getTime() < today.getTime();
}

export function isUrgentTask(task: Task): boolean {
  if (isDoneTask(task) || isCancelledTask(task)) return false;
  return task.priority?.key === 'HIGH' || isOverdue(task);
}

export function formatDate(iso: string | null): string {
  return formatDateTimeDdMmYyyy(iso);
}

export function formatDue(task: Task): string {
  if (task.kind_key === 'EVENT') return formatDateTimeDdMmYyyy(task.until);
  return formatDateDdMmYyyy(task.until);
}

function dueDateValue(iso: string | null): number {
  if (!iso) return Number.POSITIVE_INFINITY;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? Number.POSITIVE_INFINITY : date.getTime();
}

function priorityRank(task: Task): number {
  if (task.priority?.key === 'HIGH') return 0;
  if (task.priority?.key === 'NORMAL') return 1;
  if (task.priority?.key === 'LOW') return 2;
  return 3;
}

export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const urgentCmp = Number(isUrgentTask(b)) - Number(isUrgentTask(a));
    if (urgentCmp !== 0) return urgentCmp;

    if (isUrgentTask(a) && isUrgentTask(b)) {
      const prCmp = priorityRank(a) - priorityRank(b);
      if (prCmp !== 0) return prCmp;
    }

    const dueCmp = dueDateValue(a.until) - dueDateValue(b.until);
    if (dueCmp !== 0) return dueCmp;

    return a.id - b.id;
  });
}

export function statusIndicator(task: Task): string {
  if (isCancelledTask(task)) return '—';
  if (isDoneTask(task)) return '✓';
  if (isUrgentTask(task)) return '⚠';
  return '●';
}

export function computeGroupState(tasks: Task[]): TaskGroupState {
  if (tasks.length === 0) return 'NONE';

  const hasUrgentOpen = tasks.some((task) => isUrgentTask(task));
  if (hasUrgentOpen) return 'HIGH_OPEN';

  const hasPending = tasks.some((task) => !isDoneTask(task) && !isCancelledTask(task));
  if (hasPending) return 'PENDING';

  const allDiscarded = tasks.every((task) => isCancelledTask(task));
  if (allDiscarded) return 'DISCARDED';

  const allClosed = tasks.every((task) => isDoneTask(task) || isCancelledTask(task));
  const hasCompleted = tasks.some((task) => isDoneTask(task));
  if (allClosed && hasCompleted) return 'COMPLETED';

  return 'NONE';
}

export function groupStateIndicator(state: TaskGroupState): string {
  if (state === 'HIGH_OPEN') return '⚠';
  if (state === 'PENDING') return '●';
  if (state === 'COMPLETED') return '✓';
  if (state === 'DISCARDED') return '—';
  return '–';
}

export function boardStateSymbol(rows: TaskBoardRow[]): string {
  const state = computeGroupState(
    rows
      .filter((row): row is Extract<TaskBoardRow, { type: 'task' }> => row.type === 'task')
      .map((row) => row.task),
  );
  return groupStateIndicator(state);
}

export function taskKindIcon(task: Task): string {
  if (task.kind_key === 'EVENT') return '🗓';
  return '☑';
}

export function taskKindLabel(task: Task): string {
  if (task.kind_key === 'EVENT') return 'Event';
  return 'Task';
}
