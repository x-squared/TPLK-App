import { useInformationViewModel } from '../information/useInformationViewModel';
import { useMyWorkTasksViewModel } from './useMyWorkTasksViewModel';
import { useMyWorkViewModel } from './useMyWorkViewModel';
import { useMyWorkTabsViewModel } from './useMyWorkTabsViewModel';

export function useMyWorkPageViewModel() {
  const favorites = useMyWorkViewModel();
  const information = useInformationViewModel();
  const tasks = useMyWorkTasksViewModel();
  const tabs = useMyWorkTabsViewModel();

  return {
    tabs,
    favorites,
    tasks,
    information,
  };
}
