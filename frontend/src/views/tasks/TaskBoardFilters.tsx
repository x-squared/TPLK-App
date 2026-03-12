import { useI18n } from '../../i18n/i18n';

interface TaskBoardFiltersProps {
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
  organOptions: Array<{ id: number; name: string }>;
  assignedToOptions: Array<{ id: number; name: string }>;
}

export default function TaskBoardFilters({
  organFilterId,
  setOrganFilterId,
  assignedToFilterId,
  setAssignedToFilterId,
  dueBefore,
  setDueBefore,
  showDoneTasks,
  setShowDoneTasks,
  showCancelledTasks,
  setShowCancelledTasks,
  showGroupHeadings,
  setShowGroupHeadings,
  organOptions,
  assignedToOptions,
}: TaskBoardFiltersProps) {
  const { t } = useI18n();
  return (
    <div className="ui-filter-bar task-board-filters">
      <label>
        {t('taskBoard.filters.organ', 'Organ')}
        <select
          className="ui-filter-input"
          value={organFilterId}
          onChange={(e) => setOrganFilterId(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
        >
          <option value="ALL">{t('taskBoard.filters.all', 'All')}</option>
          {organOptions.map((organ) => (
            <option key={organ.id} value={organ.id}>{organ.name}</option>
          ))}
        </select>
      </label>
      <label>
        {t('taskBoard.filters.assignedTo', 'Assigned To')}
        <select
          className="ui-filter-input"
          value={assignedToFilterId}
          onChange={(e) => setAssignedToFilterId(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
        >
          <option value="ALL">{t('taskBoard.filters.all', 'All')}</option>
          {assignedToOptions.map((user) => (
            <option key={user.id} value={user.id}>{user.name}</option>
          ))}
        </select>
      </label>
      <label>
        {t('taskBoard.filters.dueBefore', 'Due Before')}
        <input className="ui-filter-input" type="datetime-local" value={dueBefore} onChange={(e) => setDueBefore(e.target.value)} />
      </label>
      <label>
        {t('taskBoard.filters.completedTasks', 'Completed Tasks')}
        <select
          className="ui-filter-input"
          value={showDoneTasks ? 'show' : 'hide'}
          onChange={(e) => setShowDoneTasks(e.target.value === 'show')}
        >
          <option value="hide">{t('taskBoard.filters.hide', 'Hide')}</option>
          <option value="show">{t('taskBoard.filters.show', 'Show')}</option>
        </select>
      </label>
      <label>
        {t('taskBoard.filters.discardedTasks', 'Discarded Tasks')}
        <select
          className="ui-filter-input"
          value={showCancelledTasks ? 'show' : 'hide'}
          onChange={(e) => setShowCancelledTasks(e.target.value === 'show')}
        >
          <option value="hide">{t('taskBoard.filters.hide', 'Hide')}</option>
          <option value="show">{t('taskBoard.filters.show', 'Show')}</option>
        </select>
      </label>
      <label>
        {t('taskBoard.filters.groupHeadings', 'Group Headings')}
        <select
          className="ui-filter-input"
          value={showGroupHeadings ? 'show' : 'hide'}
          onChange={(e) => setShowGroupHeadings(e.target.value === 'show')}
        >
          <option value="show">{t('taskBoard.filters.show', 'Show')}</option>
          <option value="hide">{t('taskBoard.filters.hide', 'Hide')}</option>
        </select>
      </label>
    </div>
  );
}
