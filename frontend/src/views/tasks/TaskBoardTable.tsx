import type { Code, ColloqiumAgenda, Episode, Patient, Task, TaskGroup } from '../../api';
import { useI18n } from '../../i18n/i18n';
import { boardStateSymbol } from './taskBoardUtils';
import TaskBoardRows from './TaskBoardRows';
import type {
  TaskActionState,
  TaskBoardRow,
  TaskBoardSort,
  TaskBoardSortKey,
  TaskCreateFormState,
  TaskGroupEditFormState,
  TaskEditFormState,
} from './taskBoardTypes';
import type { TaskBoardContextTarget } from './taskBoardTypes';

export interface TaskBoardTableProps {
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
  maxTableHeight: number | string;
}

export default function TaskBoardTable({
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
  taskSort = null,
  onTaskSortChange,
  columnVisibility,
  maxTableHeight,
}: TaskBoardTableProps) {
  const { t } = useI18n();
  const headerStateSymbol = boardStateSymbol(rows);
  const showPriority = columnVisibility?.priority ?? true;
  const showReference = columnVisibility?.reference ?? true;
  const showAssignedTo = columnVisibility?.assignedTo ?? true;
  const showComment = columnVisibility?.comment ?? true;
  const showClosedAt = columnVisibility?.closedAt ?? true;
  const showClosedBy = columnVisibility?.closedBy ?? true;
  const columnCount = 6
    + (showPriority ? 1 : 0)
    + (showReference ? 1 : 0)
    + (showAssignedTo ? 1 : 0)
    + (showComment ? 1 : 0)
    + (showClosedAt ? 1 : 0)
    + (showClosedBy ? 1 : 0);
  const onSortHeaderClick = (key: TaskBoardSortKey) => {
    if (!onTaskSortChange) return;
    if (!taskSort || taskSort.key !== key) {
      onTaskSortChange({ key, direction: 'asc' });
      return;
    }
    if (taskSort.direction === 'asc') {
      onTaskSortChange({ key, direction: 'desc' });
      return;
    }
    onTaskSortChange(null);
  };
  const sortSymbol = (key: TaskBoardSortKey): string => {
    if (!taskSort || taskSort.key !== key) return '';
    return taskSort.direction === 'asc' ? '▲' : '▼';
  };

  return (
    <div className="ui-table-wrap task-board-table-scroll" style={{ maxHeight: maxTableHeight }}>
      <table className="data-table task-board-table">
        <thead>
          <tr>
            <th className="open-col"></th>
            <th
              aria-label={t('taskBoard.columns.state', 'State')}
              title={onTaskSortChange ? t('taskBoard.sort.statusHint', 'Sort by status (asc/desc/off)') : t('taskBoard.columns.state', 'State')}
              className={onTaskSortChange ? 'task-sortable-header' : undefined}
              onClick={onTaskSortChange ? () => onSortHeaderClick('status') : undefined}
            >
              {headerStateSymbol}{sortSymbol('status')}
            </th>
            {showPriority ? (
              <th
                className={onTaskSortChange ? 'task-sortable-header' : undefined}
                onClick={onTaskSortChange ? () => onSortHeaderClick('priority') : undefined}
                title={onTaskSortChange ? t('taskBoard.sort.priorityHint', 'Sort by priority (asc/desc/off)') : undefined}
              >
                {t('taskBoard.columns.priority', 'Priority')} {sortSymbol('priority')}
              </th>
            ) : null}
            {showReference ? <th>{t('taskBoard.columns.reference', 'Reference')}</th> : null}
            <th>{t('taskBoard.columns.kind', 'Kind')}</th>
            <th className="task-col-description">{t('taskBoard.columns.description', 'Description')}</th>
            {showAssignedTo ? <th>{t('taskBoard.columns.assignedTo', 'Assigned To')}</th> : null}
            <th
              className={onTaskSortChange ? 'task-sortable-header' : undefined}
              onClick={onTaskSortChange ? () => onSortHeaderClick('due_date') : undefined}
              title={onTaskSortChange ? t('taskBoard.sort.dueDateHint', 'Sort by due date (asc/desc/off)') : undefined}
            >
              {t('taskBoard.columns.dueAt', 'Due At')} {sortSymbol('due_date')}
            </th>
            {showComment ? <th className="task-col-comment">{t('taskBoard.columns.comment', 'Comment')}</th> : null}
            {showClosedAt ? <th>{t('taskBoard.columns.closedAt', 'Closed At')}</th> : null}
            {showClosedBy ? <th>{t('taskBoard.columns.closedBy', 'Closed By')}</th> : null}
            <th>{t('taskBoard.columns.actions', 'Actions')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={columnCount}>{t('taskBoard.empty', 'No tasks match the current filters.')}</td>
            </tr>
          )}
          <TaskBoardRows
            rows={rows}
            patientsById={patientsById}
            episodesById={episodesById}
            priorityCodes={priorityCodes}
            allUserOptions={allUserOptions}
            colloqiumAgendasById={colloqiumAgendasById}
            coordinationLabelsById={coordinationLabelsById}
            editingTaskId={editingTaskId}
            editForm={editForm}
            setEditForm={setEditForm}
            editSaving={editSaving}
            onSaveEdit={onSaveEdit}
            onCancelEdit={onCancelEdit}
            onStartComplete={onStartComplete}
            onStartDiscard={onStartDiscard}
            onStartEdit={onStartEdit}
            actionState={actionState}
            actionComment={actionComment}
            setActionComment={setActionComment}
            actionEventTime={actionEventTime}
            setActionEventTime={setActionEventTime}
            actionSaving={actionSaving}
            onConfirmAction={onConfirmAction}
            onCancelAction={onCancelAction}
            editingGroupId={editingGroupId}
            groupEditForm={groupEditForm}
            setGroupEditForm={setGroupEditForm}
            groupEditSaving={groupEditSaving}
            onStartEditGroup={onStartEditGroup}
            onSaveEditGroup={onSaveEditGroup}
            onCancelEditGroup={onCancelEditGroup}
            creatingGroupId={creatingGroupId}
            createForm={createForm}
            setCreateForm={setCreateForm}
            createSaving={createSaving}
            onStartCreateTask={onStartCreateTask}
            onSaveCreateTask={onSaveCreateTask}
            onCancelCreateTask={onCancelCreateTask}
            onOpenTaskContext={onOpenTaskContext}
            selectedTaskId={selectedTaskId}
            onSelectTask={onSelectTask}
            showPriority={showPriority}
            showReference={showReference}
            showAssignedTo={showAssignedTo}
            showComment={showComment}
            showClosedAt={showClosedAt}
            showClosedBy={showClosedBy}
            columnCount={columnCount}
          />
        </tbody>
      </table>
    </div>
  );
}
