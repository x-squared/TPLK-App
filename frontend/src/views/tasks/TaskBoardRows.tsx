import type { Code, ColloqiumAgenda, Episode, Patient, Task, TaskGroup, TaskKindKey } from '../../api';
import { translateCodeLabel } from '../../i18n/codeTranslations';
import { useI18n } from '../../i18n/i18n';
import TaskBoardActionForm from './TaskBoardActionForm';
import {
  buildTaskReferences,
  formatDate,
  formatDue,
  groupStateIndicator,
  isCancelledTask,
  isDoneTask,
  statusIndicator,
  taskKindIcon,
} from './taskBoardUtils';
import type {
  TaskActionState,
  TaskBoardRow,
  TaskCreateFormState,
  TaskGroupEditFormState,
  TaskReferenceSegment,
  TaskEditFormState,
  TaskBoardContextTarget,
} from './taskBoardTypes';

interface TaskBoardRowsProps {
  rows: TaskBoardRow[];
  patientsById: Record<number, Patient>;
  episodesById: Record<number, Episode>;
  priorityCodes: Code[];
  allUserOptions: Array<{ id: number; name: string }>;
  colloqiumAgendasById: Record<number, ColloqiumAgenda>;
  coordinationLabelsById: Record<number, string>;
  editingTaskId: number | null;
  editForm: TaskEditFormState | null;
  setEditForm: (updater: (prev: TaskEditFormState | null) => TaskEditFormState | null) => void;
  editSaving: boolean;
  onSaveEdit: (taskId: number) => void;
  onCancelEdit: () => void;
  onStartComplete: (task: Task) => void;
  onStartDiscard: (task: Task) => void;
  onStartEdit: (task: Task) => void;
  actionState: TaskActionState | null;
  actionComment: string;
  setActionComment: (value: string) => void;
  actionEventTime: string;
  setActionEventTime: (value: string) => void;
  actionSaving: boolean;
  onConfirmAction: () => void;
  onCancelAction: () => void;
  editingGroupId: number | null;
  groupEditForm: TaskGroupEditFormState | null;
  setGroupEditForm: (updater: (prev: TaskGroupEditFormState | null) => TaskGroupEditFormState | null) => void;
  groupEditSaving: boolean;
  onStartEditGroup: (group: TaskGroup) => void;
  onSaveEditGroup: (groupId: number) => void;
  onCancelEditGroup: () => void;
  creatingGroupId: number | null;
  createForm: TaskCreateFormState | null;
  setCreateForm: (updater: (prev: TaskCreateFormState | null) => TaskCreateFormState | null) => void;
  createSaving: boolean;
  onStartCreateTask: (taskGroupId: number) => void;
  onSaveCreateTask: (taskGroupId: number) => void;
  onCancelCreateTask: () => void;
  onOpenTaskContext?: (target: TaskBoardContextTarget) => void;
  selectedTaskId: number | null;
  onSelectTask: (taskId: number) => void;
  showPriority: boolean;
  showReference: boolean;
  showAssignedTo: boolean;
  showComment: boolean;
  showClosedAt: boolean;
  showClosedBy: boolean;
  columnCount: number;
}

function buildContextTarget(
  group: TaskGroup,
  colloqiumAgendasById: Record<number, ColloqiumAgenda>,
): TaskBoardContextTarget {
  if (group.coordination_id != null) return { type: 'COORDINATION', coordinationId: group.coordination_id };
  if (group.colloqium_agenda_id != null) {
    const agenda = colloqiumAgendasById[group.colloqium_agenda_id];
    if (agenda?.colloqium_id != null) return { type: 'COLLOQUIUM', colloqiumId: agenda.colloqium_id };
  }
  if (group.episode_id != null && group.patient_id != null) {
    return { type: 'EPISODE', patientId: group.patient_id, episodeId: group.episode_id };
  }
  if (group.patient_id != null) {
    return { type: 'PATIENT', patientId: group.patient_id };
  }
  throw new Error(`Task group ${group.id} has no resolvable context target`);
}

function toKindSpecificUntil(kindKey: TaskKindKey, value: string): string {
  const raw = value.trim();
  if (!raw) return raw;
  const day = raw.slice(0, 10);
  if (kindKey !== 'EVENT') return day;
  if (raw.includes('T')) return raw.slice(0, 16);
  return `${day}T00:00`;
}

function ReferenceCell({ references }: { references: TaskReferenceSegment[] }) {
  if (references.length === 0) return <>–</>;
  return (
    <div className="task-ref-list">
      {references.map((ref) => (
        <span
          key={ref.key}
          className={`task-ref-chip task-ref-chip--${ref.kind ?? 'other'}`}
          title={ref.label}
        >
          {ref.label}
        </span>
      ))}
    </div>
  );
}

export default function TaskBoardRows({
  rows,
  patientsById,
  episodesById,
  priorityCodes,
  allUserOptions,
  colloqiumAgendasById,
  coordinationLabelsById,
  editingTaskId,
  editForm,
  setEditForm,
  editSaving,
  onSaveEdit,
  onCancelEdit,
  onStartComplete,
  onStartDiscard,
  onStartEdit,
  actionState,
  actionComment,
  setActionComment,
  actionEventTime,
  setActionEventTime,
  actionSaving,
  onConfirmAction,
  onCancelAction,
  editingGroupId,
  groupEditForm,
  setGroupEditForm,
  groupEditSaving,
  onStartEditGroup,
  onSaveEditGroup,
  onCancelEditGroup,
  creatingGroupId,
  createForm,
  setCreateForm,
  createSaving,
  onStartCreateTask,
  onSaveCreateTask,
  onCancelCreateTask,
  onOpenTaskContext,
  selectedTaskId,
  onSelectTask,
  showPriority,
  showReference,
  showAssignedTo,
  showComment,
  showClosedAt,
  showClosedBy,
  columnCount,
}: TaskBoardRowsProps) {
  const { t } = useI18n();
  const groupLabelColSpan = 3
    + (showPriority ? 1 : 0)
    + (showReference ? 1 : 0)
    + (showAssignedTo ? 1 : 0)
    + (showComment ? 1 : 0)
    + (showClosedAt ? 1 : 0)
    + (showClosedBy ? 1 : 0);
  return (
    <>
      {rows.map((row, idx) => {
        if (row.type === 'group') {
          const isClosedGroup = row.state === 'COMPLETED' || row.state === 'DISCARDED';
          const isEditingGroup = editingGroupId === row.group.id && groupEditForm !== null;
          const isCreating = !isClosedGroup && creatingGroupId === row.group.id && createForm !== null;
          return [
            <tr key={`group-${row.group.id}-${idx}`} className="task-board-group-row">
              <td className="open-col"></td>
              <td
                className="task-board-state"
                title={t('taskBoard.group.state', 'Task group state')}
                aria-label={t('taskBoard.group.state', 'Task group state')}
              >
                {groupStateIndicator(row.state)}
              </td>
              <td colSpan={groupLabelColSpan} className="task-board-group-label">
                {row.group.name || `Group #${row.group.id}`}
              </td>
              <td>
                <div className="task-board-row-actions">
                  <button
                    className="edit-btn"
                    onClick={() => onStartEditGroup(row.group)}
                    disabled={editingGroupId !== null && editingGroupId !== row.group.id}
                    title={t('taskBoard.group.edit', 'Edit task group')}
                    aria-label={t('taskBoard.group.edit', 'Edit task group')}
                  >
                    ✎
                  </button>
                  <button
                    className="edit-btn"
                    onClick={() => onStartCreateTask(row.group.id)}
                    disabled={
                      isClosedGroup
                      || (creatingGroupId !== null && creatingGroupId !== row.group.id)
                      || editingGroupId !== null
                    }
                    title={isClosedGroup
                      ? t('taskBoard.group.closedNoNewTasks', 'Task group is closed (completed/discarded); no new tasks allowed')
                      : t('taskBoard.group.addTask', 'Add task to group')}
                    aria-label={t('taskBoard.group.addTask', 'Add task to group')}
                  >
                    +
                  </button>
                </div>
              </td>
            </tr>,
            isEditingGroup ? (
              <tr key={`group-edit-${row.group.id}`} className="task-board-inline-group-edit-row">
                <td colSpan={columnCount}>
                  <div className="task-board-action-form">
                    <p className="task-board-action-title">
                      {t('taskBoard.group.editHeading', 'Edit group')} #{row.group.id}
                    </p>
                    <div className="ui-filter-bar task-board-group-edit-fields">
                      <label>
                        {t('taskBoard.group.name', 'Name')}
                        <input
                          className="ui-filter-input"
                          value={groupEditForm.name}
                          onChange={(e) =>
                            setGroupEditForm((prev) => (prev
                              ? {
                                ...prev,
                                name: e.target.value,
                              }
                              : prev))
                          }
                        />
                      </label>
                    </div>
                    <div className="task-board-action-buttons">
                      <button
                        className="save-btn"
                        onClick={() => onSaveEditGroup(row.group.id)}
                        disabled={groupEditSaving || groupEditForm.name.trim() === ''}
                        title={t('taskBoard.group.save', 'Save group')}
                        aria-label={t('taskBoard.group.save', 'Save group')}
                      >
                        {groupEditSaving ? '…' : '✓'}
                      </button>
                      <button
                        className="cancel-btn"
                        onClick={onCancelEditGroup}
                        disabled={groupEditSaving}
                        title={t('taskBoard.group.cancelEdit', 'Cancel group edit')}
                        aria-label={t('taskBoard.group.cancelEdit', 'Cancel group edit')}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            ) : null,
            isCreating ? (
              <tr key={`group-add-${row.group.id}`} className="task-board-inline-create-row">
                <td className="open-col"></td>
                <td className="task-board-state">●</td>
                {showPriority ? (
                  <td>
                    <select
                      className="ui-filter-input task-board-cell-input"
                      value={createForm.priority_id ?? ''}
                      onChange={(e) =>
                        setCreateForm((prev) => (prev ? { ...prev, priority_id: e.target.value ? Number(e.target.value) : null } : prev))
                      }
                    >
                      <option value="">{t('taskBoard.common.empty', '–')}</option>
                      {priorityCodes.map((priority) => (
                        <option key={priority.id} value={priority.id}>{translateCodeLabel(t, priority)}</option>
                      ))}
                    </select>
                  </td>
                ) : null}
                {showReference ? <td>{t('taskBoard.group.label', 'Group')} #{row.group.id}</td> : null}
                <td>
                  <select
                    className="ui-filter-input task-board-cell-input"
                    value={createForm.kind_key}
                    onChange={(e) =>
                      setCreateForm((prev) => {
                        if (!prev) return prev;
                        const nextKind = e.target.value as TaskKindKey;
                        return {
                          ...prev,
                          kind_key: nextKind,
                          until: toKindSpecificUntil(nextKind, prev.until),
                        };
                      })
                    }
                  >
                    <option value="TASK">{t('taskBoard.kind.task', 'Task')}</option>
                    <option value="EVENT">{t('taskBoard.kind.event', 'Event')}</option>
                  </select>
                </td>
                <td className="task-col-description">
                  <input
                    className="ui-filter-input task-board-cell-input"
                    value={createForm.description}
                    onChange={(e) => setCreateForm((prev) => (prev ? { ...prev, description: e.target.value } : prev))}
                    placeholder={t('taskBoard.columns.description', 'Description')}
                  />
                </td>
                {showAssignedTo ? (
                  <td>
                    <select
                      className="ui-filter-input task-board-cell-input"
                      value={createForm.assigned_to_id ?? ''}
                      onChange={(e) =>
                        setCreateForm((prev) => (prev ? { ...prev, assigned_to_id: e.target.value ? Number(e.target.value) : null } : prev))
                      }
                    >
                      <option value="">{t('taskBoard.common.empty', '–')}</option>
                      {allUserOptions.map((user) => (
                        <option key={user.id} value={user.id}>{user.name}</option>
                      ))}
                    </select>
                  </td>
                ) : null}
                <td>
                  <input
                    className="ui-filter-input task-board-cell-input"
                    type={createForm.kind_key === 'EVENT' ? 'datetime-local' : 'date'}
                    value={createForm.until}
                    onChange={(e) => setCreateForm((prev) => (prev ? { ...prev, until: e.target.value } : prev))}
                  />
                </td>
                {showComment ? (
                  <td className="task-col-comment">
                    <input
                      className="ui-filter-input task-board-cell-input"
                      value={createForm.comment}
                      onChange={(e) => setCreateForm((prev) => (prev ? { ...prev, comment: e.target.value } : prev))}
                      placeholder={t('taskBoard.columns.comment', 'Comment')}
                    />
                  </td>
                ) : null}
                {showClosedAt ? <td>{t('taskBoard.common.empty', '–')}</td> : null}
                {showClosedBy ? <td>{t('taskBoard.common.empty', '–')}</td> : null}
                <td>
                  <div className="task-board-row-actions">
                    <button
                      className="save-btn"
                      onClick={() => onSaveCreateTask(row.group.id)}
                      disabled={createSaving || createForm.description.trim() === '' || createForm.until.trim() === ''}
                      title={t('taskBoard.actions.createTask', 'Create task')}
                      aria-label={t('taskBoard.actions.createTask', 'Create task')}
                    >
                      {createSaving ? '…' : '✓'}
                    </button>
                    <button
                      className="cancel-btn"
                      onClick={onCancelCreateTask}
                      disabled={createSaving}
                      title={t('taskBoard.actions.cancelTaskCreation', 'Cancel task creation')}
                      aria-label={t('taskBoard.actions.cancelTaskCreation', 'Cancel task creation')}
                    >
                      ✕
                    </button>
                  </div>
                </td>
              </tr>
            ) : null,
          ];
        }

        const task = row.task;
        const patient = row.group.patient_id != null ? patientsById[row.group.patient_id] : undefined;
        const episode = row.group.episode_id ? episodesById[row.group.episode_id] : undefined;
        const coordinationLabel = row.group.coordination_id != null
          ? coordinationLabelsById[row.group.coordination_id]
          : undefined;
        const references = buildTaskReferences({ group: row.group, task, patient, episode, coordinationLabel }, t);
        const done = isDoneTask(task);
        const cancelled = isCancelledTask(task);
        const rowClass = done
          ? 'task-board-task-row is-done'
          : cancelled
            ? 'task-board-task-row is-cancelled'
            : 'task-board-task-row';
        const selectedClass = selectedTaskId === task.id ? ' is-selected' : '';
        const isEditing = editingTaskId === task.id && editForm !== null;
        const canFinalize = !done && !cancelled;
        const contextTarget = buildContextTarget(row.group, colloqiumAgendasById);

        return [
          <tr key={`task-${task.id}`} className={`${rowClass}${selectedClass}`} onClick={() => onSelectTask(task.id)}>
            <td className="open-col">
              {onOpenTaskContext ? (
                <button
                  className="open-btn"
                  onClick={() => onOpenTaskContext(contextTarget)}
                  title={t('taskBoard.actions.openContext', 'Open context')}
                  aria-label={t('taskBoard.actions.openContext', 'Open context')}
                >
                  &#x279C;
                </button>
              ) : null}
            </td>
            <td className="task-board-state">
              {canFinalize ? (
                <button
                  className="task-board-status-btn"
                  onClick={() => onStartComplete(task)}
                  title={task.kind_key === 'EVENT'
                    ? t('taskBoard.actions.registerEventOccurrence', 'Register event occurrence')
                    : t('taskBoard.actions.completeTask', 'Complete task')}
                  aria-label={task.kind_key === 'EVENT'
                    ? t('taskBoard.actions.registerEventOccurrence', 'Register event occurrence')
                    : t('taskBoard.actions.completeTask', 'Complete task')}
                >
                  {statusIndicator(task)}
                </button>
              ) : statusIndicator(task)}
            </td>
            {showPriority ? (
              <td>
                {isEditing ? (
                  <select
                    className="ui-filter-input task-board-cell-input"
                    value={editForm.priority_id ?? ''}
                    onChange={(e) =>
                      setEditForm((prev) => (prev ? { ...prev, priority_id: e.target.value ? Number(e.target.value) : null } : prev))
                    }
                  >
                    <option value="">{t('taskBoard.common.empty', '–')}</option>
                    {priorityCodes.map((priority) => (
                      <option key={priority.id} value={priority.id}>{translateCodeLabel(t, priority)}</option>
                    ))}
                  </select>
                ) : translateCodeLabel(t, task.priority)}
              </td>
            ) : null}
            {showReference ? <td><ReferenceCell references={references} /></td> : null}
            <td title={task.kind_key === 'EVENT' ? t('taskBoard.kind.event', 'Event') : t('taskBoard.kind.task', 'Task')}>
              {isEditing ? (
                <select
                  className="ui-filter-input task-board-cell-input task-board-kind-select"
                  value={editForm.kind_key}
                  onChange={(e) =>
                    setEditForm((prev) => {
                      if (!prev) return prev;
                      const nextKind = e.target.value as TaskKindKey;
                      return {
                        ...prev,
                        kind_key: nextKind,
                        until: toKindSpecificUntil(nextKind, prev.until),
                      };
                    })
                  }
                >
                  <option value="TASK">{t('taskBoard.kind.task', 'Task')}</option>
                  <option value="EVENT">{t('taskBoard.kind.event', 'Event')}</option>
                </select>
              ) : taskKindIcon(task)}
            </td>
            <td className="task-col-description">
              {isEditing ? (
                <input
                  className="ui-filter-input task-board-cell-input"
                  value={editForm.description}
                  onChange={(e) => setEditForm((prev) => (prev ? { ...prev, description: e.target.value } : prev))}
                />
              ) : (task.description || t('taskBoard.common.empty', '–'))}
            </td>
            {showAssignedTo ? (
              <td>
                {isEditing ? (
                  <select
                    className="ui-filter-input task-board-cell-input"
                    value={editForm.assigned_to_id ?? ''}
                    onChange={(e) =>
                      setEditForm((prev) => (prev ? { ...prev, assigned_to_id: e.target.value ? Number(e.target.value) : null } : prev))
                    }
                  >
                    <option value="">–</option>
                    {allUserOptions.map((user) => (
                      <option key={user.id} value={user.id}>{user.name}</option>
                    ))}
                  </select>
                ) : (task.assigned_to?.name ?? t('taskBoard.common.empty', '–'))}
              </td>
            ) : null}
            <td>
              {isEditing ? (
                <input
                  className="ui-filter-input task-board-cell-input"
                  type={editForm.kind_key === 'EVENT' ? 'datetime-local' : 'date'}
                  value={editForm.until}
                  onChange={(e) => setEditForm((prev) => (prev ? { ...prev, until: e.target.value } : prev))}
                />
              ) : formatDue(task)}
            </td>
            {showComment ? (
              <td className="task-col-comment">
                {isEditing ? (
                  <input
                    className="ui-filter-input task-board-cell-input"
                    value={editForm.comment}
                    onChange={(e) => setEditForm((prev) => (prev ? { ...prev, comment: e.target.value } : prev))}
                  />
                ) : (task.comment || t('taskBoard.common.empty', '–'))}
              </td>
            ) : null}
            {showClosedAt ? <td>{formatDate(task.closed_at)}</td> : null}
            {showClosedBy ? <td>{task.closed_by?.name ?? t('taskBoard.common.empty', '–')}</td> : null}
            <td>
              {isEditing ? (
                <div className="task-board-row-actions">
                  <button
                    className="save-btn"
                    onClick={() => onSaveEdit(task.id)}
                    disabled={editSaving || editForm.until.trim() === ''}
                    title={t('taskBoard.actions.saveEdit', 'Save edit')}
                    aria-label={t('taskBoard.actions.saveEdit', 'Save edit')}
                  >
                    {editSaving ? '…' : '✓'}
                  </button>
                  <button
                    className="cancel-btn"
                    onClick={onCancelEdit}
                    disabled={editSaving}
                    title={t('taskBoard.actions.cancelEdit', 'Cancel edit')}
                    aria-label={t('taskBoard.actions.cancelEdit', 'Cancel edit')}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="task-board-row-actions">
                  <button
                    className="edit-btn"
                    onClick={() => onStartComplete(task)}
                    disabled={!canFinalize}
                    title={task.kind_key === 'EVENT'
                      ? t('taskBoard.actions.registerEventOccurrence', 'Register event occurrence')
                      : t('taskBoard.actions.completeTask', 'Complete task')}
                    aria-label={task.kind_key === 'EVENT'
                      ? t('taskBoard.actions.registerEventOccurrence', 'Register event occurrence')
                      : t('taskBoard.actions.completeTask', 'Complete task')}
                  >
                    ✓
                  </button>
                  <button
                    className="cancel-btn"
                    onClick={() => onStartDiscard(task)}
                    disabled={!canFinalize}
                    title={t('taskBoard.actions.discardTask', 'Discard task')}
                    aria-label={t('taskBoard.actions.discardTask', 'Discard task')}
                  >
                    −
                  </button>
                  <button
                    className="edit-btn"
                    onClick={() => onStartEdit(task)}
                    disabled={editingTaskId !== null}
                    title={t('taskBoard.actions.editTask', 'Edit task')}
                    aria-label={t('taskBoard.actions.editTask', 'Edit task')}
                  >
                    ✎
                  </button>
                </div>
              )}
            </td>
          </tr>,
          actionState?.task.id === task.id ? (
            <tr key={`task-action-${task.id}`} className="task-board-inline-action-row">
              <td colSpan={columnCount}>
                <TaskBoardActionForm
                  actionState={actionState}
                  actionComment={actionComment}
                  setActionComment={setActionComment}
                  actionEventTime={actionEventTime}
                  setActionEventTime={setActionEventTime}
                  actionSaving={actionSaving}
                  onConfirm={onConfirmAction}
                  onCancel={onCancelAction}
                />
              </td>
            </tr>
          ) : null,
        ];
      })}
    </>
  );
}
