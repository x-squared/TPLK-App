import ColloquiumsAddForm from './colloquiums/list/ColloquiumsAddForm';
import { useMemo, useState } from 'react';
import ColloquiumsCalendarView from './colloquiums/calendar/ColloquiumsCalendarView';
import ColloquiumsListView from './colloquiums/list/ColloquiumsListView';
import { useColloquiumsListViewModel } from './colloquiums/list/useColloquiumsListViewModel';
import { useI18n } from '../i18n/i18n';
import { getColloqiumTypeColor } from './colloquiums/typeColors';
import './layout/PanelLayout.css';
import './PatientsView.css';
import './ColloquiumsView.css';

interface Props {
  onOpenColloqium: (id: number) => void;
}

export default function ColloquiumsView({ onOpenColloqium }: Props) {
  const { t } = useI18n();
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const {
    loading,
    adding,
    setAdding,
    creating,
    createError,
    setCreateError,
    form,
    setForm,
    types,
    typeId,
    setTypeId,
    listFilters,
    setListFilters,
    typeFiltered,
    listFiltered,
    expandedAgendaColloqiumId,
    agendasByColloqium,
    loadingAgendasByColloqium,
    handleCreate,
    toggleAgenda,
  } = useColloquiumsListViewModel();
  const selectedTypeColor = useMemo(() => {
    if (!typeId) return null;
    return getColloqiumTypeColor(Number(typeId));
  }, [typeId]);

  return (
    <>
      <header className="patients-header">
        <h1>{t('colloquiums.title', 'Colloquiums')}</h1>
        {!adding && (
          <button className="patients-add-btn" onClick={() => setAdding(true)}>
            {t('colloquiums.actions.add', '+ Add')}
          </button>
        )}
      </header>

      <div className="filter-bar colloquiums-filter-bar colloquiums-top-controls">
        <label className="colloquiums-filter-field">
          {t('colloquiums.filters.type', 'Type')}
          <select
            className="filter-select colloquiums-filter-control"
            value={typeId}
            onChange={(e) => setTypeId(e.target.value)}
            style={selectedTypeColor ? {
              backgroundColor: selectedTypeColor.background,
              borderColor: selectedTypeColor.border,
              color: selectedTypeColor.text,
            } : undefined}
          >
            <option value="">{t('taskBoard.filters.all', 'All')}</option>
            {types.map((type) => {
              const color = getColloqiumTypeColor(type.id);
              return (
                <option
                  key={type.id}
                  value={type.id}
                  style={{ backgroundColor: color.background, color: color.text }}
                >
                  {type.name}
                </option>
              );
            })}
          </select>
        </label>
        <div className="colloquiums-view-toggle" role="tablist" aria-label={t('colloquiums.viewMode.ariaLabel', 'Colloquium view mode')}>
          <button
            className={`btn-secondary${viewMode === 'list' ? ' is-active' : ''}`}
            onClick={() => setViewMode('list')}
            role="tab"
            aria-selected={viewMode === 'list'}
          >
            {t('colloquiums.viewMode.list', 'List')}
          </button>
          <button
            className={`btn-secondary${viewMode === 'calendar' ? ' is-active' : ''}`}
            onClick={() => setViewMode('calendar')}
            role="tab"
            aria-selected={viewMode === 'calendar'}
          >
            {t('colloquiums.viewMode.calendar', 'Calendar')}
          </button>
        </div>
      </div>

      {adding && (
        <ColloquiumsAddForm
          form={form}
          types={types}
          creating={creating}
          error={createError}
          onChange={setForm}
          onSave={handleCreate}
          onCancel={() => {
            setAdding(false);
            setCreateError('');
          }}
        />
      )}

      {viewMode === 'list' ? (
        <ColloquiumsListView
          loading={loading}
          rows={listFiltered}
          filters={listFilters}
          onChangeFilters={setListFilters}
          expandedAgendaColloqiumId={expandedAgendaColloqiumId}
          agendasByColloqium={agendasByColloqium}
          loadingAgendasByColloqium={loadingAgendasByColloqium}
          onOpenColloqium={onOpenColloqium}
          onToggleAgenda={toggleAgenda}
        />
      ) : (
        loading ? <p className="status">{t('common.loading', 'Loading...')}</p> : <ColloquiumsCalendarView rows={typeFiltered} onOpenColloqium={onOpenColloqium} />
      )}
    </>
  );
}

