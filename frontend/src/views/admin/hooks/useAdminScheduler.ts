import { useCallback, useEffect, useMemo, useState } from 'react';

import { api, type ScheduledJob, type ScheduledJobRun } from '../../../api';
import { toUserErrorMessage } from '../../../api/error';

export function useAdminScheduler() {
  const [jobs, setJobs] = useState<ScheduledJob[]>([]);
  const [runsByJobKey, setRunsByJobKey] = useState<Record<string, ScheduledJobRun[]>>({});
  const [selectedJobKey, setSelectedJobKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [statusKey, setStatusKey] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const loadedJobs = await api.listScheduledJobs();
      setJobs(loadedJobs);
      if (!selectedJobKey || !loadedJobs.some((item) => item.job_key === selectedJobKey)) {
        setSelectedJobKey(loadedJobs[0]?.job_key ?? null);
      }
    } catch (err) {
      setError(toUserErrorMessage(err, 'Failed to load scheduler jobs'));
    } finally {
      setLoading(false);
    }
  }, [selectedJobKey]);

  const refreshRuns = useCallback(async (jobKey: string) => {
    try {
      const runs = await api.listScheduledJobRuns(jobKey, 50);
      setRunsByJobKey((prev) => ({ ...prev, [jobKey]: runs }));
    } catch (err) {
      setError(toUserErrorMessage(err, 'Failed to load job runs'));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!selectedJobKey) return;
    void refreshRuns(selectedJobKey);
  }, [refreshRuns, selectedJobKey]);

  const selectedRuns = useMemo(
    () => (selectedJobKey ? (runsByJobKey[selectedJobKey] ?? []) : []),
    [runsByJobKey, selectedJobKey],
  );

  const triggerJob = useCallback(async (jobKey: string) => {
    setSaving(true);
    setError('');
    setStatusKey('');
    try {
      await api.triggerScheduledJob(jobKey);
      await Promise.all([refresh(), refreshRuns(jobKey)]);
      setStatusKey('triggered');
    } catch (err) {
      setError(toUserErrorMessage(err, 'Failed to trigger job'));
    } finally {
      setSaving(false);
    }
  }, [refresh, refreshRuns]);

  const setJobEnabled = useCallback(async (jobKey: string, isEnabled: boolean) => {
    setSaving(true);
    setError('');
    setStatusKey('');
    try {
      await api.setScheduledJobEnabled(jobKey, isEnabled);
      await refresh();
      setStatusKey(isEnabled ? 'enabled' : 'paused');
    } catch (err) {
      setError(toUserErrorMessage(err, 'Failed to update job state'));
    } finally {
      setSaving(false);
    }
  }, [refresh]);

  return {
    jobs,
    selectedJobKey,
    setSelectedJobKey,
    selectedRuns,
    loading,
    saving,
    error,
    statusKey,
    refresh,
    triggerJob,
    setJobEnabled,
  };
}
