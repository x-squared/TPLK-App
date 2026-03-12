import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { api, type Task, type TaskCreate, type TaskGroup, type TaskKindKey, type TaskUpdate } from '../../api';
import { ApiError } from '../../api/error';
import { translateCodeLabel } from '../../i18n/codeTranslations';
import ErrorBanner from '../layout/ErrorBanner';
import { useI18n } from '../../i18n/i18n';
import '../layout/PanelLayout.css';
import './TaskBoard.css';
import TaskBoardFilters from './TaskBoardFilters';
import TaskBoardTable from './TaskBoardTable';
import { computeGroupState, isCancelledTask, isDoneTask, sortTasks } from './taskBoardUtils';
import { buildDefaultTaskDescription, findContextManagedGroup } from './taskBoardContext';
import { sortFlatTaskRows, type FlatTaskRow } from './taskBoardSorting';
import type {
  TaskBoardContext,
  TaskBoardHandle,
  TaskBoardProps,
  TaskBoardRow,
  TaskBoardContextType,
  TaskBoardTaskChangeReason,
} from './taskBoardTypes';
import useTaskBoardData from './useTaskBoardData';
import {
  useTaskBoardActionState,
  useTaskBoardEditState,
  useTaskBoardFilters,
  useTaskBoardGroupState,
} from './hooks/useTaskBoardUiState';
import { TASK_CHANGED_EVENT } from './taskEvents';

function nowLocalDateTimeIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}T${hh}:${mm}:00`;
}

function nowLocalDateIso(): string {
  return nowLocalDateTimeIso().slice(0, 10);
}

function toFormDateTimeValue(value: string | null | undefined): string {
  const raw = (value ?? '').trim();
  if (!raw) return nowLocalDateTimeIso();
  if (raw.includes('T') && raw.length === 16) return `${raw}:00`;
  return raw;
}

function toFormUntilValue(kindKey: TaskKindKey, value: string | null | undefined): string {
  const raw = (value ?? '').trim();
  if (!raw) return kindKey === 'EVENT' ? nowLocalDateTimeIso().slice(0, 16) : nowLocalDateIso();
  if (kindKey !== 'EVENT') return raw.slice(0, 10);
  if (raw.includes('T')) return raw.slice(0, 16);
  return `${raw.slice(0, 10)}T00:00`;
}

function normalizeUntilForApi(kindKey: TaskKindKey, value: string): string {
  const raw = value.trim();
  if (!raw) return raw;
  const day = raw.slice(0, 10);
  if (kindKey !== 'EVENT') return `${day}T00:00:00`;
  if (!raw.includes('T')) return `${day}T00:00:00`;
  const timePart = raw.slice(11);
  if (timePart.length === 5) return `${day}T${timePart}:00`;
  return `${day}T${timePart}`;
}

function normalizeDateTimeForApi(value: string): string {
  const raw = value.trim();
  if (!raw) return raw;
  const day = raw.slice(0, 10);
  if (!raw.includes('T')) return `${day}T00:00:00`;
  const timePart = raw.slice(11);
  if (timePart.length === 5) return `${day}T${timePart}:00`;
  return `${day}T${timePart}`;
}

function buildContextTarget(
  group: TaskGroup,
  colloqiumAgendaId: number | null,
  colloqiumAgendasById: Record<number, { colloqium_id: number }>,
) {
  if (group.coordination_id != null) return { type: 'COORDINATION' as const, coordinationId: group.coordination_id };
  const resolvedAgendaId = group.colloqium_agenda_id ?? colloqiumAgendaId;
  if (resolvedAgendaId != null) {
    const agenda = colloqiumAgendasById[resolvedAgendaId];
    if (agenda?.colloqium_id != null) return { type: 'COLLOQUIUM' as const, colloqiumId: agenda.colloqium_id };
  }
  if (group.episode_id != null && group.patient_id != null) {
    return { type: 'EPISODE' as const, patientId: group.patient_id, episodeId: group.episode_id };
  }
  if (group.patient_id != null) {
    return { type: 'PATIENT' as const, patientId: group.patient_id };
  }
  throw new Error(`Task group ${group.id} has no resolvable context target`);
}

const TaskBoard = forwardRef<TaskBoardHandle, TaskBoardProps>(function TaskBoard({
  declaredContextType,
  criteria = {},
  context,
  title,
  onAddClick = () => undefined,
  maxTableHeight = 420,
  headerMeta,
  hideFilters = false,
  hideAddButton = false,
  showGroupHeadingsDefault = true,
  includeClosedTasks = false,
  autoCreateToken,
  onAutoCreateSaved,
  onAutoCreateDiscarded,
  onTaskChanged,
  onOpenTaskContext,
  taskSort = null,
  onTaskSortChange,
  columnVisibility,
}: TaskBoardProps, ref) {
  const { t } = useI18n();
  const resolvedTitle = title ?? t('taskBoard.title', 'Tasks');
  const apiErrorHasDetail = (error: unknown, expected: string): boolean => {
    if (!(error instanceof ApiError)) return false;
    const detail = (error.detail as { detail?: unknown })?.detail;
    if (typeof detail === 'string') return detail.includes(expected);
    if (Array.isArray(detail)) {
      return detail.some((item) => JSON.stringify(item).includes(expected));
    }
    return JSON.stringify(error.detail).includes(expected);
  };
  const incomingContext = context ?? criteria;
  const resolveContextType = (incoming?: TaskBoardContextType): TaskBoardContextType => {
    if (incoming && incoming !== declaredContextType) {
      throw new Error(
        `TaskBoard contextType mismatch: declared=${declaredContextType} incoming=${incoming}. ` +
        'TaskBoard integrations must declare and use a single context type.',
      );
    }
    return incoming ?? declaredContextType;
  };
  const [activeContext, setActiveContext] = useState<TaskBoardContext>({
    ...incomingContext,
    contextType: resolveContextType(incomingContext.contextType),
  });
  const taskChangeListenersRef = useRef(new Set<NonNullable<TaskBoardProps['onTaskChanged']>>());
  const [effectiveColloqiumAgendaId, setEffectiveColloqiumAgendaId] = useState<number | null>(
    incomingContext.colloqiumAgendaId ?? null,
  );
  const filters = useTaskBoardFilters(includeClosedTasks, showGroupHeadingsDefault);
  const actionStateModel = useTaskBoardActionState();
  const editStateModel = useTaskBoardEditState();
  const groupStateModel = useTaskBoardGroupState();
  const [panelAddSaving, setPanelAddSaving] = useState(false);
  const [preferredTopGroupId, setPreferredTopGroupId] = useState<number | null>(null);
  const [autoCreatedTaskId, setAutoCreatedTaskId] = useState<number | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const prevAutoCreateTokenRef = useRef<number | undefined>(autoCreateToken);

  useEffect(() => {
    setActiveContext({
      patientId: incomingContext.patientId,
      episodeId: incomingContext.episodeId,
      colloqiumAgendaId: incomingContext.colloqiumAgendaId,
      colloqiumId: incomingContext.colloqiumId,
      tplPhaseId: incomingContext.tplPhaseId,
      assignedToId: incomingContext.assignedToId,
      contextType: resolveContextType(incomingContext.contextType),
      extraParams: incomingContext.extraParams,
    });
  }, [
    incomingContext.patientId,
    incomingContext.episodeId,
    incomingContext.colloqiumAgendaId,
    incomingContext.colloqiumId,
    incomingContext.tplPhaseId,
    incomingContext.assignedToId,
    incomingContext.contextType,
    incomingContext.extraParams,
    declaredContextType,
  ]);

  useEffect(() => {
    setEffectiveColloqiumAgendaId(activeContext.colloqiumAgendaId ?? null);
  }, [activeContext.colloqiumAgendaId, activeContext.episodeId, activeContext.colloqiumId, activeContext.patientId]);

  useEffect(() => {
    setPreferredTopGroupId(null);
  }, [activeContext.patientId, activeContext.episodeId, effectiveColloqiumAgendaId, activeContext.tplPhaseId]);

  const statusKeysToLoad = useMemo(() => {
    if (includeClosedTasks) return ['PENDING', 'COMPLETED', 'CANCELLED'];
    const keys = ['PENDING'];
    if (filters.showDoneTasks) keys.push('COMPLETED');
    if (filters.showCancelledTasks) keys.push('CANCELLED');
    return keys;
  }, [includeClosedTasks, filters.showDoneTasks, filters.showCancelledTasks]);

  const effectiveCriteria = useMemo(
    () => ({
      ...activeContext,
      colloqiumAgendaId: effectiveColloqiumAgendaId,
    }),
    [activeContext, effectiveColloqiumAgendaId],
  );

  const {
    loading,
    error,
    taskGroups,
    tasksByGroup,
    patientsById,
    episodesById,
    organCodes,
    priorityCodes,
    taskStatusByKey,
    allUsers,
    colloqiumAgendasById,
    coordinationLabelsById,
    currentUserId,
    reload,
  } = useTaskBoardData(effectiveCriteria, statusKeysToLoad);

  const emitTaskChanged = useCallback((task: Task, reason: TaskBoardTaskChangeReason) => {
    const group = taskGroups.find((item) => item.id === task.task_group_id);
    const patient = group?.patient_id != null ? patientsById[group.patient_id] : undefined;
    const episode = group?.episode_id ? episodesById[group.episode_id] : undefined;
    const event = {
      reason,
      task,
      group,
      patient,
      episode,
      context: activeContext,
    };
    onTaskChanged?.(event);
    taskChangeListenersRef.current.forEach((listener) => listener(event));
    window.dispatchEvent(new CustomEvent(TASK_CHANGED_EVENT, { detail: event }));
  }, [activeContext, episodesById, onTaskChanged, patientsById, taskGroups]);

  useImperativeHandle(ref, () => ({
    setContext: (nextContext) => {
      const contextType = resolveContextType(nextContext.contextType);
      setEffectiveColloqiumAgendaId(nextContext.colloqiumAgendaId ?? null);
      setActiveContext({
        ...nextContext,
        contextType,
      });
    },
    getContext: () => activeContext,
    registerTaskChangeListener: (listener) => {
      taskChangeListenersRef.current.add(listener);
      return () => {
        taskChangeListenersRef.current.delete(listener);
      };
    },
    reload,
  }), [activeContext, reload]);

  const assignedToOptions = useMemo(() => {
    const options = new Map<number, string>();
    Object.values(tasksByGroup).forEach((tasks) => {
      tasks.forEach((task) => {
        if (!task.assigned_to_id) return;
        options.set(task.assigned_to_id, task.assigned_to?.name ?? allUsers[task.assigned_to_id] ?? `User #${task.assigned_to_id}`);
      });
    });
    return [...options.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [tasksByGroup, allUsers]);

  const organOptions = useMemo(
    () => organCodes.map((organ) => ({ id: organ.id, name: translateCodeLabel(t, organ) })),
    [organCodes, t],
  );

  const allUserOptions = useMemo(
    () =>
      Object.entries(allUsers)
        .map(([id, name]) => ({ id: Number(id), name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [allUsers],
  );

  const startTaskAction = (task: Task, type: 'complete' | 'discard') => {
    groupStateModel.setEditingGroupId(null);
    groupStateModel.setGroupEditForm(null);
    groupStateModel.setCreatingGroupId(null);
    groupStateModel.setCreateForm(null);
    editStateModel.setEditingTaskId(null);
    editStateModel.setEditForm(null);
    const taskCommentHint = (task.comment_hint ?? '').trim();
    const hint = taskCommentHint || undefined;
    actionStateModel.setActionState({ task, type, hint });
    actionStateModel.setActionComment(task.comment ?? '');
    actionStateModel.setActionEventTime(toFormDateTimeValue(task.event_time));
  };

  const applyTaskAction = async () => {
    if (!actionStateModel.actionState) return;
    const statusKey = actionStateModel.actionState.type === 'complete' ? 'COMPLETED' : 'CANCELLED';
    const statusCode = taskStatusByKey[statusKey];
    if (!statusCode) return;
    const nextComment = actionStateModel.actionComment.trim();
    const nextEventTime = actionStateModel.actionEventTime.trim();
    const hasHint = (actionStateModel.actionState.hint ?? '').trim() !== '';
    const isEventCompletion = actionStateModel.actionState.task.kind_key === 'EVENT' && actionStateModel.actionState.type === 'complete';
    if (actionStateModel.actionState.type === 'discard' && !nextComment) return;
    if (hasHint && !nextComment) return;
    if (isEventCompletion && !nextEventTime) return;

    actionStateModel.setActionSaving(true);
    try {
      const payload: TaskUpdate = {
        status_id: statusCode.id,
        comment: nextComment || '',
      };
      if (isEventCompletion) {
        payload.event_time = normalizeDateTimeForApi(nextEventTime);
      }
      const updatedTask = await api.updateTask(actionStateModel.actionState.task.id, payload);
      emitTaskChanged(updatedTask, actionStateModel.actionState.type === 'complete' ? 'completed' : 'discarded');
      actionStateModel.setActionState(null);
      actionStateModel.setActionComment('');
      actionStateModel.setActionEventTime('');
      reload();
    } finally {
      actionStateModel.setActionSaving(false);
    }
  };

  const startEditTask = (task: Task) => {
    groupStateModel.setEditingGroupId(null);
    groupStateModel.setGroupEditForm(null);
    groupStateModel.setCreatingGroupId(null);
    groupStateModel.setCreateForm(null);
    actionStateModel.setActionState(null);
    actionStateModel.setActionComment('');
    actionStateModel.setActionEventTime('');
    editStateModel.setEditingTaskId(task.id);
    editStateModel.setEditForm({
      description: task.description ?? '',
      kind_key: task.kind_key ?? 'TASK',
      priority_id: task.priority_id ?? null,
      assigned_to_id: task.assigned_to_id ?? null,
      until: toFormUntilValue(task.kind_key ?? 'TASK', task.until),
      comment: task.comment ?? '',
    });
  };

  const cancelEditTask = () => {
    editStateModel.setEditingTaskId(null);
    editStateModel.setEditForm(null);
  };

  const startCreateTask = (taskGroupId: number) => {
    groupStateModel.setEditingGroupId(null);
    groupStateModel.setGroupEditForm(null);
    actionStateModel.setActionState(null);
    actionStateModel.setActionComment('');
    actionStateModel.setActionEventTime('');
    editStateModel.setEditingTaskId(null);
    editStateModel.setEditForm(null);
    groupStateModel.setCreatingGroupId(taskGroupId);
    groupStateModel.setCreateForm({
      description: '',
      kind_key: 'TASK',
      priority_id: null,
      assigned_to_id: currentUserId,
      until: nowLocalDateIso(),
      comment: '',
    });
  };

  const cancelCreateTask = () => {
    groupStateModel.setCreatingGroupId(null);
    groupStateModel.setCreateForm(null);
  };

  const startEditGroup = (group: TaskGroup) => {
    actionStateModel.setActionState(null);
    actionStateModel.setActionComment('');
    actionStateModel.setActionEventTime('');
    editStateModel.setEditingTaskId(null);
    editStateModel.setEditForm(null);
    groupStateModel.setCreatingGroupId(null);
    groupStateModel.setCreateForm(null);
    groupStateModel.setEditingGroupId(group.id);
    groupStateModel.setGroupEditForm({
      name: group.name ?? '',
    });
  };

  const cancelEditGroup = () => {
    groupStateModel.setEditingGroupId(null);
    groupStateModel.setGroupEditForm(null);
  };

  const saveEditGroup = async (groupId: number) => {
    if (!groupStateModel.groupEditForm) return;
    const nextName = groupStateModel.groupEditForm.name.trim();
    if (!nextName) return;
    groupStateModel.setGroupEditSaving(true);
    try {
      await api.updateTaskGroup(groupId, {
        name: nextName,
      });
      cancelEditGroup();
      reload();
    } finally {
      groupStateModel.setGroupEditSaving(false);
    }
  };

  const saveCreateTask = async (taskGroupId: number) => {
    if (!groupStateModel.createForm) return;
    const nextDescription = groupStateModel.createForm.description.trim();
    if (!nextDescription) return;

    groupStateModel.setCreateSaving(true);
    try {
      const payload: TaskCreate = {
        task_group_id: taskGroupId,
        description: nextDescription,
        kind_key: groupStateModel.createForm.kind_key,
        priority_id: groupStateModel.createForm.priority_id,
        assigned_to_id: groupStateModel.createForm.assigned_to_id,
        until: normalizeUntilForApi(groupStateModel.createForm.kind_key, groupStateModel.createForm.until),
        comment: groupStateModel.createForm.comment,
      };
      const createdTask = await api.createTask(payload);
      emitTaskChanged(createdTask, 'created');
      cancelCreateTask();
      reload();
    } finally {
      groupStateModel.setCreateSaving(false);
    }
  };

  const createTaskFromPanelContext = async (source: 'manual' | 'auto' = 'manual') => {
    if (panelAddSaving) return;
    const contextPatientId = activeContext.patientId;
    if (!contextPatientId) {
      return;
    }

    setPanelAddSaving(true);
    try {
      const resolveCurrentColloqiumAgendaId = async (): Promise<number | null> => {
        if (activeContext.colloqiumId == null || activeContext.episodeId == null) return effectiveColloqiumAgendaId;
        const agendas = await api.listColloqiumAgendas({ episodeId: activeContext.episodeId });
        const matching = agendas
          .filter((agenda) => agenda.colloqium_id === activeContext.colloqiumId)
          .sort((a, b) => a.id - b.id)[0];
        const resolved = matching?.id ?? null;
        setEffectiveColloqiumAgendaId(resolved);
        return resolved;
      };
      const tryCreateContextGroup = async (colloqiumAgendaId: number | null): Promise<TaskGroup> => api.createTaskGroup({
        patient_id: contextPatientId,
        task_group_template_id: null,
        episode_id: activeContext.episodeId ?? null,
        colloqium_agenda_id: colloqiumAgendaId,
        tpl_phase_id: activeContext.episodeId != null ? (activeContext.tplPhaseId ?? null) : null,
      });
      let taskGroup = findContextManagedGroup({
        groups: taskGroups,
        patientId: activeContext.patientId,
        episodeId: activeContext.episodeId,
        colloqiumAgendaId: effectiveColloqiumAgendaId,
        tplPhaseId: activeContext.tplPhaseId,
        taskGroupsTasks: tasksByGroup,
      });
      if (taskGroup && taskGroup.colloqium_agenda_id == null && effectiveColloqiumAgendaId != null) {
        try {
          taskGroup = await api.updateTaskGroup(taskGroup.id, { colloqium_agenda_id: effectiveColloqiumAgendaId });
        } catch {
          const resolvedAgendaId = await resolveCurrentColloqiumAgendaId();
          if (resolvedAgendaId != null) {
            taskGroup = await api.updateTaskGroup(taskGroup.id, { colloqium_agenda_id: resolvedAgendaId });
          }
        }
      }
      if (!taskGroup) {
        const initialAgendaId = effectiveColloqiumAgendaId;
        try {
          taskGroup = await tryCreateContextGroup(initialAgendaId);
        } catch (err) {
          const isAgendaLinkError =
            apiErrorHasDetail(err, 'colloqium_agenda_id references unknown COLLOQIUM_AGENDA')
            || apiErrorHasDetail(err, 'episode_id must match COLLOQIUM_AGENDA.episode_id');
          if (!isAgendaLinkError) throw err;
          const resolvedAgendaId = await resolveCurrentColloqiumAgendaId();
          taskGroup = await tryCreateContextGroup(resolvedAgendaId);
        }
      }
      setPreferredTopGroupId(taskGroup.id);
      if (source === 'manual') {
        startCreateTask(taskGroup.id);
        onAddClick();
        return;
      }
      const createPayload = (groupId: number, description: string): TaskCreate => ({
        task_group_id: groupId,
        description,
        kind_key: 'TASK',
        assigned_to_id: currentUserId,
        until: normalizeUntilForApi('TASK', nowLocalDateIso()),
        comment: '',
      });
      let createdTask: Task;
      try {
        createdTask = await api.createTask(
          createPayload(taskGroup.id, buildDefaultTaskDescription(taskGroup, translateCodeLabel(t, taskGroup.tpl_phase))),
        );
      } catch (err) {
        const isClosedGroupError = apiErrorHasDetail(err, 'completed/discarded task group');
        if (!isClosedGroupError) throw err;
        let replacementGroup: TaskGroup;
        try {
          replacementGroup = await tryCreateContextGroup(effectiveColloqiumAgendaId);
        } catch (retryErr) {
          const isAgendaLinkError =
            apiErrorHasDetail(retryErr, 'colloqium_agenda_id references unknown COLLOQIUM_AGENDA')
            || apiErrorHasDetail(retryErr, 'episode_id must match COLLOQIUM_AGENDA.episode_id');
          if (!isAgendaLinkError) throw retryErr;
          const resolvedAgendaId = await resolveCurrentColloqiumAgendaId();
          replacementGroup = await tryCreateContextGroup(resolvedAgendaId);
        }
        setPreferredTopGroupId(replacementGroup.id);
        createdTask = await api.createTask(
          createPayload(
            replacementGroup.id,
            buildDefaultTaskDescription(replacementGroup, translateCodeLabel(t, replacementGroup.tpl_phase)),
          ),
        );
      }
      actionStateModel.setActionState(null);
      actionStateModel.setActionComment('');
      actionStateModel.setActionEventTime('');
      groupStateModel.setCreatingGroupId(null);
      groupStateModel.setCreateForm(null);
      setAutoCreatedTaskId(source === 'auto' ? createdTask.id : null);
      editStateModel.setEditingTaskId(createdTask.id);
      editStateModel.setEditForm({
        description: createdTask.description ?? '',
        kind_key: createdTask.kind_key ?? 'TASK',
        priority_id: createdTask.priority_id ?? null,
        assigned_to_id: createdTask.assigned_to_id ?? null,
        until: toFormUntilValue(createdTask.kind_key ?? 'TASK', createdTask.until),
        comment: createdTask.comment ?? '',
      });
      emitTaskChanged(createdTask, 'created');
      reload();
      onAddClick();
    } finally {
      setPanelAddSaving(false);
    }
  };

  const handleCancelEditTask = async () => {
    if (editStateModel.editingTaskId == null) {
      cancelEditTask();
      return;
    }
    if (autoCreatedTaskId !== editStateModel.editingTaskId) {
      cancelEditTask();
      return;
    }
    try {
      const cancelled = taskStatusByKey.CANCELLED;
      if (cancelled) {
        const autoDiscardedTask = await api.updateTask(editStateModel.editingTaskId, { status_id: cancelled.id, comment: '' });
        emitTaskChanged(autoDiscardedTask, 'auto_discarded');
      }
      setAutoCreatedTaskId(null);
      cancelEditTask();
      reload();
      onAutoCreateDiscarded?.();
    } catch {
      cancelEditTask();
    }
  };

  useEffect(() => {
    if (autoCreateToken === undefined || autoCreateToken === null) {
      prevAutoCreateTokenRef.current = autoCreateToken;
      return;
    }
    if (prevAutoCreateTokenRef.current === autoCreateToken) return;
    prevAutoCreateTokenRef.current = autoCreateToken;
    void createTaskFromPanelContext('auto');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCreateToken]);

  const saveEditTask = async (taskId: number) => {
    if (!editStateModel.editForm) return;
    editStateModel.setEditSaving(true);
    try {
      const payload: TaskUpdate = {
        description: editStateModel.editForm.description,
        kind_key: editStateModel.editForm.kind_key,
        priority_id: editStateModel.editForm.priority_id,
        assigned_to_id: editStateModel.editForm.assigned_to_id,
        until: normalizeUntilForApi(editStateModel.editForm.kind_key, editStateModel.editForm.until),
        comment: editStateModel.editForm.comment,
      };
      const updatedTask = await api.updateTask(taskId, payload);
      emitTaskChanged(updatedTask, 'updated');
      if (autoCreatedTaskId === taskId) {
        setAutoCreatedTaskId(null);
        onAutoCreateSaved?.();
      }
      cancelEditTask();
      reload();
    } finally {
      editStateModel.setEditSaving(false);
    }
  };

  const rows = useMemo<TaskBoardRow[]>(() => {
    const matchesContextType = (group: TaskGroup, expected: TaskBoardContextType): boolean => {
      if (expected === 'ALL') return true;
      if (expected === 'COORDINATION') return group.coordination_id != null;
      if (expected === 'COLLOQUIUM') return group.colloqium_agenda_id != null;
      if (expected === 'EPISODE') return group.episode_id != null;
      if (expected === 'PATIENT') return (
        group.coordination_id == null
        && group.colloqium_agenda_id == null
        && group.episode_id == null
      );
      return true;
    };
    const groupsSorted = [...taskGroups].sort((a, b) => {
      if (preferredTopGroupId != null) {
        if (a.id === preferredTopGroupId) return -1;
        if (b.id === preferredTopGroupId) return 1;
      }
      return a.id - b.id;
    });
    const nextRows: TaskBoardRow[] = [];
    const filteredTaskRows: FlatTaskRow[] = [];
    groupsSorted.forEach((group) => {
      if (!matchesContextType(group, activeContext.contextType ?? 'ALL')) return;
      const episode = group.episode_id ? episodesById[group.episode_id] : undefined;
      if (filters.organFilterId !== 'ALL' && episode?.organ_id !== filters.organFilterId) return;
      const groupState = computeGroupState(tasksByGroup[group.id] ?? []);

      const filteredTasks = sortTasks(tasksByGroup[group.id] ?? []).filter((task) => {
        if (!filters.showDoneTasks && isDoneTask(task)) return false;
        if (!filters.showCancelledTasks && isCancelledTask(task)) return false;
        if (filters.assignedToFilterId !== 'ALL' && task.assigned_to_id !== filters.assignedToFilterId) return false;
        if (filters.dueBefore) {
          if (!task.until) return false;
          if (new Date(task.until).getTime() > new Date(filters.dueBefore).getTime()) return false;
        }
        return true;
      });

      if (filteredTasks.length === 0) return;
      if (filters.showGroupHeadings) {
        nextRows.push({ type: 'group', group, state: groupState });
        filteredTasks.forEach((task) => nextRows.push({ type: 'task', group, task }));
        return;
      }
      filteredTasks.forEach((task) => filteredTaskRows.push({ type: 'task', group, task }));
    });

    if (!filters.showGroupHeadings && taskSort) {
      const sorted = sortFlatTaskRows(filteredTaskRows, taskSort, priorityCodes);
      filteredTaskRows.length = 0;
      filteredTaskRows.push(...sorted);
    }
    if (!filters.showGroupHeadings) {
      filteredTaskRows.forEach((row) => nextRows.push(row));
    }

    return nextRows;
  }, [
    taskGroups,
    tasksByGroup,
    episodesById,
    filters.organFilterId,
    filters.assignedToFilterId,
    filters.dueBefore,
    filters.showDoneTasks,
    filters.showCancelledTasks,
    filters.showGroupHeadings,
    preferredTopGroupId,
    activeContext.contextType,
    taskSort,
    priorityCodes,
  ]);

  const selectedTaskRow = useMemo(() => {
    if (selectedTaskId == null) return null;
    const row = rows.find((item) => item.type === 'task' && item.task.id === selectedTaskId);
    return row?.type === 'task' ? row : null;
  }, [rows, selectedTaskId]);

  useEffect(() => {
    if (selectedTaskId == null) return;
    const exists = rows.some((item) => item.type === 'task' && item.task.id === selectedTaskId);
    if (!exists) setSelectedTaskId(null);
  }, [rows, selectedTaskId]);

  return (
    <section className="ui-panel-section task-board-section">
      <div className="ui-panel-heading">
        <div className="task-board-heading-main">
          <h2>{resolvedTitle}</h2>
          {headerMeta && <div className="task-board-header-meta">{headerMeta}</div>}
        </div>
        {selectedTaskRow ? (
          <div className="task-board-heading-actions">
            {onOpenTaskContext ? (
              <button
                className="edit-btn"
                onClick={() => {
                  const target = buildContextTarget(
                    selectedTaskRow.group,
                    effectiveColloqiumAgendaId,
                    colloqiumAgendasById as Record<number, { colloqium_id: number }>,
                  );
                  onOpenTaskContext(target);
                }}
                title={t('taskBoard.actions.openContext', 'Open context')}
                aria-label={t('taskBoard.actions.openContext', 'Open context')}
              >
                &#x279C;
              </button>
            ) : null}
            <button
              className="edit-btn"
              onClick={() => startTaskAction(selectedTaskRow.task, 'complete')}
              disabled={isDoneTask(selectedTaskRow.task) || isCancelledTask(selectedTaskRow.task)}
              title={selectedTaskRow.task.kind_key === 'EVENT'
                ? t('taskBoard.actions.registerEventOccurrence', 'Register event occurrence')
                : t('taskBoard.actions.completeTask', 'Complete task')}
              aria-label={selectedTaskRow.task.kind_key === 'EVENT'
                ? t('taskBoard.actions.registerEventOccurrence', 'Register event occurrence')
                : t('taskBoard.actions.completeTask', 'Complete task')}
            >
              ✓
            </button>
            <button
              className="cancel-btn"
              onClick={() => startTaskAction(selectedTaskRow.task, 'discard')}
              disabled={isDoneTask(selectedTaskRow.task) || isCancelledTask(selectedTaskRow.task)}
              title={t('taskBoard.actions.discardTask', 'Discard task')}
              aria-label={t('taskBoard.actions.discardTask', 'Discard task')}
            >
              −
            </button>
            <button
              className="edit-btn"
              onClick={() => startEditTask(selectedTaskRow.task)}
              disabled={editStateModel.editingTaskId !== null}
              title={t('taskBoard.actions.editTask', 'Edit task')}
              aria-label={t('taskBoard.actions.editTask', 'Edit task')}
            >
              ✎
            </button>
          </div>
        ) : null}
        {!hideAddButton ? (
          <button
            className="ci-add-btn"
            onClick={() => {
              void createTaskFromPanelContext('manual');
            }}
            disabled={panelAddSaving || !activeContext.patientId}
            title={activeContext.patientId
              ? t('taskBoard.actions.addFromContext', 'Add task from current context')
              : t('taskBoard.actions.selectPatientToAdd', 'Select a patient to add a task')}
            aria-label={t('taskBoard.actions.addFromContext', 'Add task from current context')}
          >
            {panelAddSaving ? '…' : t('taskBoard.actions.add', '+ Add')}
          </button>
        ) : null}
      </div>

      {!hideFilters && (
        <TaskBoardFilters
          organFilterId={filters.organFilterId}
          setOrganFilterId={filters.setOrganFilterId}
          assignedToFilterId={filters.assignedToFilterId}
          setAssignedToFilterId={filters.setAssignedToFilterId}
          dueBefore={filters.dueBefore}
          setDueBefore={filters.setDueBefore}
          showDoneTasks={filters.showDoneTasks}
          setShowDoneTasks={filters.setShowDoneTasks}
          showCancelledTasks={filters.showCancelledTasks}
          setShowCancelledTasks={filters.setShowCancelledTasks}
          showGroupHeadings={filters.showGroupHeadings}
          setShowGroupHeadings={filters.setShowGroupHeadings}
          organOptions={organOptions}
          assignedToOptions={assignedToOptions}
        />
      )}

      {loading && <p className="status">{t('taskBoard.loading', 'Loading tasks...')}</p>}
      {!loading && error && <ErrorBanner message={error} />}
      {!loading && !error && (
        <TaskBoardTable
          rows={rows}
          patientsById={patientsById}
          episodesById={episodesById}
          priorityCodes={priorityCodes}
          allUserOptions={allUserOptions}
          colloqiumAgendasById={colloqiumAgendasById}
          coordinationLabelsById={coordinationLabelsById}
          editingTaskId={editStateModel.editingTaskId}
          editForm={editStateModel.editForm}
          setEditForm={editStateModel.setEditForm}
          editSaving={editStateModel.editSaving}
          onSaveEdit={saveEditTask}
          onCancelEdit={() => {
            void handleCancelEditTask();
          }}
          onStartComplete={(task) => startTaskAction(task, 'complete')}
          onStartDiscard={(task) => startTaskAction(task, 'discard')}
          onStartEdit={startEditTask}
          actionState={actionStateModel.actionState}
          actionComment={actionStateModel.actionComment}
          setActionComment={actionStateModel.setActionComment}
          actionEventTime={actionStateModel.actionEventTime}
          setActionEventTime={actionStateModel.setActionEventTime}
          actionSaving={actionStateModel.actionSaving}
          onConfirmAction={applyTaskAction}
          onCancelAction={() => {
            actionStateModel.setActionState(null);
            actionStateModel.setActionComment('');
            actionStateModel.setActionEventTime('');
          }}
          editingGroupId={groupStateModel.editingGroupId}
          groupEditForm={groupStateModel.groupEditForm}
          setGroupEditForm={groupStateModel.setGroupEditForm}
          groupEditSaving={groupStateModel.groupEditSaving}
          onStartEditGroup={startEditGroup}
          onSaveEditGroup={saveEditGroup}
          onCancelEditGroup={cancelEditGroup}
          creatingGroupId={groupStateModel.creatingGroupId}
          createForm={groupStateModel.createForm}
          setCreateForm={groupStateModel.setCreateForm}
          createSaving={groupStateModel.createSaving}
          onStartCreateTask={startCreateTask}
          onSaveCreateTask={saveCreateTask}
          onCancelCreateTask={cancelCreateTask}
          onOpenTaskContext={onOpenTaskContext}
          selectedTaskId={selectedTaskId}
          onSelectTask={setSelectedTaskId}
          taskSort={taskSort}
          onTaskSortChange={onTaskSortChange}
          columnVisibility={columnVisibility}
          maxTableHeight={maxTableHeight}
        />
      )}
    </section>
  );
});

export default TaskBoard;
