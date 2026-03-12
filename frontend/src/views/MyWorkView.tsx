import type { Favorite } from '../api';
import { useI18n } from '../i18n/i18n';
import InformationRowsSection from './information/InformationRowsSection';
import FavoritesSection from './my-work/FavoritesSection';
import MyWorkTabs from './my-work/MyWorkTabs';
import TaskBoard from './tasks/TaskBoard';
import type { TaskBoardContextTarget } from './tasks/taskBoardTypes';
import { useMyWorkPageViewModel } from './my-work/useMyWorkPageViewModel';
import './layout/PanelLayout.css';
import './PatientDetailView.css';
import './InformationView.css';
import './my-work/MyWorkView.css';

interface Props {
  onOpenFavorite: (favorite: Favorite) => void;
  onOpenTaskContext: (target: TaskBoardContextTarget) => void;
  currentUserId: number;
}

export default function MyWorkView({ onOpenFavorite, onOpenTaskContext, currentUserId }: Props) {
  const { t } = useI18n();
  const model = useMyWorkPageViewModel();

  return (
    <>
      <header className="patients-header">
        <h1>{t('myWork.title', 'My Work')} ({model.tasks.openTaskCount} | {model.information.totalCount})</h1>
      </header>
      <div className="detail-tabs my-work-tabs">
        <MyWorkTabs
          activeTab={model.tabs.activeTab}
          setActiveTab={model.tabs.setActiveTab}
          informationCount={model.information.totalCount}
          openTaskCount={model.tasks.openTaskCount}
        />
      </div>
      {model.tabs.activeTab === 'favorites' && model.favorites.error ? <p className="status">{model.favorites.error}</p> : null}
      {model.tabs.activeTab === 'favorites' && model.favorites.loading ? (
        <p className="status">{t('common.loading', 'Loading...')}</p>
      ) : null}
      {model.tabs.activeTab === 'favorites' && !model.favorites.loading ? (
        <FavoritesSection
          favorites={model.favorites.favorites}
          typeLabels={model.favorites.typeLabels}
          episodeFavoriteNames={model.favorites.episodeFavoriteNames}
          onOpenFavorite={onOpenFavorite}
          deletingFavoriteId={model.favorites.deletingFavoriteId}
          draggingFavoriteId={model.favorites.draggingFavoriteId}
          dragOverFavoriteId={model.favorites.dragOverFavoriteId}
          setDraggingFavoriteId={model.favorites.setDraggingFavoriteId}
          setDragOverFavoriteId={model.favorites.setDragOverFavoriteId}
          onDropFavorite={(id) => void model.favorites.reorderFavorites(id)}
          onDeleteFavorite={(id) => void model.favorites.deleteFavorite(id)}
        />
      ) : null}
      {model.tabs.activeTab === 'tasks' ? (
        <section className="detail-section ui-panel-section">
          <div className="detail-section-heading">
            <h2>{t('myWork.assignedTasks.title', 'Assigned Tasks')}</h2>
          </div>
          <div className="detail-grid">
            <label className="detail-field">
              <span className="detail-label">{t('myWork.assignedTasks.scope.label', 'Scope')}</span>
              <select
                className="detail-input"
                value={model.tasks.assignmentScope}
                onChange={(event) => model.tasks.setAssignmentScope(event.target.value as typeof model.tasks.assignmentScope)}
              >
                <option value="MINE">{t('myWork.assignedTasks.scope.mine', 'My tasks')}</option>
                <option value="ALL">{t('myWork.assignedTasks.scope.all', 'All tasks')}</option>
              </select>
            </label>
            <label className="detail-field">
              <span className="detail-label">{t('myWork.assignedTasks.context.label', 'Context')}</span>
              <select
                className="detail-input"
                value={model.tasks.contextFilter}
                onChange={(event) => model.tasks.setContextFilter(event.target.value as typeof model.tasks.contextFilter)}
              >
                <option value="ALL">{t('myWork.assignedTasks.context.all', 'All')}</option>
                <option value="PATIENT">{t('myWork.assignedTasks.context.patient', 'Patient')}</option>
                <option value="EPISODE">{t('myWork.assignedTasks.context.episode', 'Episode')}</option>
                <option value="COLLOQUIUM">{t('myWork.assignedTasks.context.colloquium', 'Colloquium')}</option>
                <option value="COORDINATION">{t('myWork.assignedTasks.context.coordination', 'Coordination')}</option>
              </select>
            </label>
          </div>
          <TaskBoard
            declaredContextType={model.tasks.contextFilter}
            title={t('myWork.assignedTasks.title', 'Assigned Tasks')}
            hideFilters
            hideAddButton
            showGroupHeadingsDefault={false}
            criteria={{
              assignedToId: model.tasks.assignmentScope === 'MINE' ? currentUserId : null,
              contextType: model.tasks.contextFilter,
            }}
            taskSort={model.tasks.sortMode}
            onTaskSortChange={model.tasks.setSortMode}
            onOpenTaskContext={onOpenTaskContext}
          />
        </section>
      ) : null}
      {model.tabs.activeTab === 'information' ? <InformationRowsSection model={model.information} /> : null}
    </>
  );
}
