import type { Task, TaskGroup } from '../../api';
import { computeGroupState } from './taskBoardUtils';

export function isGroupClosedByTasks(taskGroupsTasks: Record<number, Task[]>, taskGroup: TaskGroup): boolean {
  const state = computeGroupState(taskGroupsTasks[taskGroup.id] ?? []);
  return state === 'COMPLETED' || state === 'DISCARDED';
}

interface FindContextManagedGroupArgs {
  groups: TaskGroup[];
  patientId: number | null | undefined;
  episodeId: number | null | undefined;
  colloqiumAgendaId: number | null | undefined;
  tplPhaseId: number | null | undefined;
  taskGroupsTasks: Record<number, Task[]>;
}

export function findContextManagedGroup(
  args: FindContextManagedGroupArgs,
): TaskGroup | null {
  const { groups, patientId, episodeId, colloqiumAgendaId, tplPhaseId, taskGroupsTasks } = args;
  if (!patientId) return null;
  const contextEpisodeId = episodeId ?? null;
  const contextColloqiumAgendaId = colloqiumAgendaId ?? null;
  const contextPhaseId = contextEpisodeId != null ? (tplPhaseId ?? null) : null;
  const matches = groups.filter((group) =>
    group.patient_id === patientId
    && group.task_group_template_id === null
    && (group.episode_id ?? null) === contextEpisodeId
    && (group.tpl_phase_id ?? null) === contextPhaseId
    && !isGroupClosedByTasks(taskGroupsTasks, group));
  const exact = matches.filter((group) => (group.colloqium_agenda_id ?? null) === contextColloqiumAgendaId);
  const fallbackUnlinked = matches.filter((group) => group.colloqium_agenda_id == null);
  const candidates = exact.length > 0 ? exact : fallbackUnlinked;
  if (candidates.length === 0) return null;
  return [...candidates].sort((a, b) => a.id - b.id)[0];
}

export function buildDefaultTaskDescription(taskGroup: TaskGroup, phaseLabel?: string | null): string {
  const parts = [taskGroup.patient_id != null ? `New task for P#${taskGroup.patient_id}` : 'New coordination task'];
  if (taskGroup.episode_id != null) parts.push(`E#${taskGroup.episode_id}`);
  if (phaseLabel?.trim()) parts.push(phaseLabel.trim());
  return parts.join(' · ');
}
