import type { ReactNode } from 'react';
import type { Episode, Patient, Task, TaskGroup, TaskKindKey } from '../../api';

export interface TaskBoardCriteria {
  patientId?: number;
  episodeId?: number | null;
  colloqiumAgendaId?: number | null;
  colloqiumId?: number | null;
  tplPhaseId?: number | null;
  assignedToId?: number | null;
  contextType?: TaskBoardContextType;
  extraParams?: Record<string, string | number | boolean | number[] | string[] | null | undefined>;
}

export type TaskBoardContext = TaskBoardCriteria;
export type TaskBoardContextType = 'ALL' | 'PATIENT' | 'EPISODE' | 'COLLOQUIUM' | 'COORDINATION';
export type TaskBoardSortKey = 'status' | 'priority' | 'due_date';
export type TaskBoardSortDirection = 'asc' | 'desc';
export interface TaskBoardSort {
  key: TaskBoardSortKey;
  direction: TaskBoardSortDirection;
}
export type TaskBoardContextTarget =
  | { type: 'PATIENT'; patientId: number }
  | { type: 'EPISODE'; patientId: number; episodeId: number }
  | { type: 'COLLOQUIUM'; colloqiumId: number }
  | { type: 'COORDINATION'; coordinationId: number };

export type TaskBoardTaskChangeReason =
  | 'created'
  | 'updated'
  | 'completed'
  | 'discarded'
  | 'auto_discarded';

export interface TaskBoardTaskChangeEvent {
  reason: TaskBoardTaskChangeReason;
  task: Task;
  group: TaskGroup | undefined;
  patient: Patient | undefined;
  episode: Episode | undefined;
  context: TaskBoardContext;
}

export type TaskBoardTaskChangeListener = (event: TaskBoardTaskChangeEvent) => void;

export interface TaskBoardHandle {
  setContext: (context: TaskBoardContext) => void;
  getContext: () => TaskBoardContext;
  registerTaskChangeListener: (listener: TaskBoardTaskChangeListener) => () => void;
  reload: () => void;
}

export interface TaskBoardProps {
  declaredContextType: TaskBoardContextType;
  criteria?: TaskBoardCriteria;
  context?: TaskBoardContext;
  title?: string;
  onAddClick?: () => void;
  maxTableHeight?: number | string;
  headerMeta?: ReactNode;
  hideFilters?: boolean;
  hideAddButton?: boolean;
  showGroupHeadingsDefault?: boolean;
  includeClosedTasks?: boolean;
  autoCreateToken?: number;
  onAutoCreateSaved?: () => void;
  onAutoCreateDiscarded?: () => void;
  onTaskChanged?: TaskBoardTaskChangeListener;
  onOpenTaskContext?: (target: TaskBoardContextTarget) => void;
  taskSort?: TaskBoardSort | null;
  onTaskSortChange?: (sort: TaskBoardSort | null) => void;
  columnVisibility?: {
    priority?: boolean;
    reference?: boolean;
    assignedTo?: boolean;
    comment?: boolean;
    closedAt?: boolean;
    closedBy?: boolean;
  };
}

export interface TaskReferenceContext {
  group: TaskGroup;
  task: Task;
  patient: Patient | undefined;
  episode: Episode | undefined;
  coordinationLabel: string | undefined;
}

export interface TaskReferenceSegment {
  key: string;
  label: string;
  kind?: 'patient' | 'episode' | 'phase' | 'other';
}

export interface TaskReferenceRenderer {
  id: string;
  buildSegment: (context: TaskReferenceContext) => TaskReferenceSegment | null;
}

export type TaskActionType = 'complete' | 'discard';

export interface TaskActionState {
  task: Task;
  type: TaskActionType;
  hint?: string;
}

export type TaskGroupState = 'HIGH_OPEN' | 'PENDING' | 'COMPLETED' | 'DISCARDED' | 'NONE';

export interface TaskEditFormState {
  description: string;
  kind_key: TaskKindKey;
  priority_id: number | null;
  assigned_to_id: number | null;
  until: string;
  comment: string;
}

export interface TaskCreateFormState {
  description: string;
  kind_key: TaskKindKey;
  priority_id: number | null;
  assigned_to_id: number | null;
  until: string;
  comment: string;
}

export interface TaskGroupEditFormState {
  name: string;
}

export type TaskBoardRow =
  | { type: 'group'; group: TaskGroup; state: TaskGroupState }
  | { type: 'task'; group: TaskGroup; task: Task };

export interface TaskBoardFilterModel {
  organFilterId: number | 'ALL';
  setOrganFilterId: (value: number | 'ALL') => void;
  assignedToFilterId: number | 'ALL';
  setAssignedToFilterId: (value: number | 'ALL') => void;
  dueBefore: string;
  setDueBefore: (value: string) => void;
  showDoneTasks: boolean;
  setShowDoneTasks: (value: boolean) => void;
  showCancelledTasks: boolean;
  setShowCancelledTasks: (value: boolean) => void;
  showGroupHeadings: boolean;
  setShowGroupHeadings: (value: boolean) => void;
}

export interface TaskBoardTableDataModel {
  rows: TaskBoardRow[];
  patientsById: Record<number, Patient>;
  episodesById: Record<number, Episode>;
}

export interface TaskBoardUsersModel {
  priorityCodes: Array<{ id: number; name_default: string }>;
  allUserOptions: Array<{ id: number; name: string }>;
}

export interface TaskBoardEditModel {
  editingTaskId: number | null;
  editForm: TaskEditFormState | null;
  setEditForm: (updater: (prev: TaskEditFormState | null) => TaskEditFormState | null) => void;
  editSaving: boolean;
  onSaveEdit: (taskId: number) => void;
  onCancelEdit: () => void;
  onStartEdit: (task: Task) => void;
}

export interface TaskBoardActionModel {
  actionState: TaskActionState | null;
  actionComment: string;
  setActionComment: (value: string) => void;
  actionEventTime: string;
  setActionEventTime: (value: string) => void;
  actionSaving: boolean;
  onConfirmAction: () => void;
  onCancelAction: () => void;
  onStartComplete: (task: Task) => void;
  onStartDiscard: (task: Task) => void;
}

export interface TaskBoardGroupEditModel {
  editingGroupId: number | null;
  groupEditForm: TaskGroupEditFormState | null;
  setGroupEditForm: (updater: (prev: TaskGroupEditFormState | null) => TaskGroupEditFormState | null) => void;
  groupEditSaving: boolean;
  onStartEditGroup: (group: TaskGroup) => void;
  onSaveEditGroup: (groupId: number) => void;
  onCancelEditGroup: () => void;
}

export interface TaskBoardCreateModel {
  creatingGroupId: number | null;
  createForm: TaskCreateFormState | null;
  setCreateForm: (updater: (prev: TaskCreateFormState | null) => TaskCreateFormState | null) => void;
  createSaving: boolean;
  onStartCreateTask: (taskGroupId: number) => void;
  onSaveCreateTask: (taskGroupId: number) => void;
  onCancelCreateTask: () => void;
}
