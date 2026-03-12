import { useState } from 'react';

export type MyWorkTabKey = 'favorites' | 'tasks' | 'information';

export function useMyWorkTabsViewModel() {
  const [activeTab, setActiveTab] = useState<MyWorkTabKey>('favorites');
  return { activeTab, setActiveTab };
}
