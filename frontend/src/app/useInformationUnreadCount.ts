import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';

const INFORMATION_CHANGED_EVENT = 'tpl:information-changed';

export function useInformationUnreadCount(enabled: boolean) {
  const [unreadCount, setUnreadCount] = useState(0);

  const reloadUnreadCount = useCallback(async () => {
    if (!enabled) {
      setUnreadCount(0);
      return;
    }
    try {
      const rows = await api.listInformation();
      setUnreadCount(rows.filter((row) => !row.current_user_read_at).length);
    } catch {
      setUnreadCount(0);
    }
  }, [enabled]);

  useEffect(() => {
    void reloadUnreadCount();
  }, [reloadUnreadCount]);

  useEffect(() => {
    if (!enabled) return undefined;
    const handler = () => {
      void reloadUnreadCount();
    };
    window.addEventListener(INFORMATION_CHANGED_EVENT, handler);
    return () => {
      window.removeEventListener(INFORMATION_CHANGED_EVENT, handler);
    };
  }, [enabled, reloadUnreadCount]);

  return { unreadCount, reloadUnreadCount };
}
