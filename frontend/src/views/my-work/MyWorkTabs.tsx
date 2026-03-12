import type { MyWorkTabKey } from './useMyWorkTabsViewModel';
import { useI18n } from '../../i18n/i18n';

interface MyWorkTabsProps {
  activeTab: MyWorkTabKey;
  setActiveTab: (tab: MyWorkTabKey) => void;
  informationCount: number;
  openTaskCount: number;
}

export default function MyWorkTabs({
  activeTab,
  setActiveTab,
  informationCount,
  openTaskCount,
}: MyWorkTabsProps) {
  const { t } = useI18n();
  return (
    <>
      <button
        className={`detail-tab ${activeTab === 'favorites' ? 'active' : ''}`}
        onClick={() => setActiveTab('favorites')}
        type="button"
      >
        {t('myWork.tabs.favorites', 'Favorites')}
      </button>
      <button
        className={`detail-tab ${activeTab === 'tasks' ? 'active' : ''}`}
        onClick={() => setActiveTab('tasks')}
        type="button"
      >
        {t('myWork.tabs.tasks', 'Tasks')} ({openTaskCount})
      </button>
      <button
        className={`detail-tab ${activeTab === 'information' ? 'active' : ''}`}
        onClick={() => setActiveTab('information')}
        type="button"
      >
        {t('myWork.tabs.information', 'Information')} ({informationCount})
      </button>
    </>
  );
}
