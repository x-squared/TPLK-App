import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { MY_WORK_OPEN_TASK_COUNT_POLL_MS } from './runtimeConfig';
import { TASK_CHANGED_EVENT } from '../views/tasks/taskEvents';

const isOpenTask = (statusKey: string | null | undefined): boolean => {
  const normalized = (statusKey ?? '').toUpperCase();
  return normalized !== 'COMPLETED' && normalized !== 'CANCELLED';
};

export function useMyWorkOpenTaskCount(enabled: boolean) {
  const [openTaskCount, setOpenTaskCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  const reloadOpenTaskCount = useCallback(async () => {
    if (!enabled) {
      setOpenTaskCount(0);
      return;
    }
    try {
      const userId = currentUserId ?? (await api.getMe()).id;
      if (currentUserId == null) setCurrentUserId(userId);
      const rows = await api.listTasks({ assigned_to_id: userId });
      setOpenTaskCount(rows.filter((row) => isOpenTask(row.status?.key)).length);
    } catch {
      setOpenTaskCount(0);
    }
  }, [currentUserId, enabled]);

  useEffect(() => {
    void reloadOpenTaskCount();
  }, [reloadOpenTaskCount]);

  useEffect(() => {
    if (!enabled) setCurrentUserId(null);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return undefined;
    const handleTaskChanged = () => {
      void reloadOpenTaskCount();
    };
    window.addEventListener(TASK_CHANGED_EVENT, handleTaskChanged);
    return () => {
      window.removeEventListener(TASK_CHANGED_EVENT, handleTaskChanged);
    };
  }, [enabled, reloadOpenTaskCount]);

  useEffect(() => {
    if (!enabled) return undefined;
    const interval = window.setInterval(() => {
      void reloadOpenTaskCount();
    }, MY_WORK_OPEN_TASK_COUNT_POLL_MS);
    return () => {
      window.clearInterval(interval);
    };
  }, [enabled, reloadOpenTaskCount]);

  return { openTaskCount, reloadOpenTaskCount };
}
