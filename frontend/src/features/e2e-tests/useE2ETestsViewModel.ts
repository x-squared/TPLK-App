import { useCallback, useEffect, useState } from 'react';
import {
  api,
  type E2ETestRunResponse,
  type E2ETestRunnerKey,
  type E2ETestRunnerOption,
} from '../../api';
import { toUserErrorMessage } from '../../api/error';
import type { E2ETestsTabKey, E2ETestsViewModel } from './types';

export function useE2ETestsViewModel(): E2ETestsViewModel {
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [runningHealthCheck, setRunningHealthCheck] = useState(false);
  const [runningServerHealthTest, setRunningServerHealthTest] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<E2ETestsTabKey>('e2e-tests');
  const [runners, setRunners] = useState<E2ETestRunnerOption[]>([]);
  const [selectedRunner, setSelectedRunner] = useState<E2ETestRunnerKey>('all');
  const [outputTailLines, setOutputTailLines] = useState(160);
  const [lastResult, setLastResult] = useState<E2ETestRunResponse | null>(null);
  const [serverHealthResult, setServerHealthResult] = useState<E2ETestRunResponse | null>(null);

  const loadMetadata = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.getE2ETestMetadata();
      setRunners(response.runners);
      if (response.runners.length > 0) {
        setSelectedRunner(response.runners[0].key);
      }
    } catch (err) {
      setError(toUserErrorMessage(err, 'Failed to load E2E test metadata'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMetadata();
  }, [loadMetadata]);

  const runTests = useCallback(async () => {
    setRunning(true);
    setError('');
    try {
      const result = await api.runE2ETest({
        runner: selectedRunner,
        output_tail_lines: outputTailLines,
      });
      setLastResult(result);
    } catch (err) {
      setError(toUserErrorMessage(err, 'Failed to run E2E tests'));
    } finally {
      setRunning(false);
    }
  }, [outputTailLines, selectedRunner]);

  const clearResults = useCallback(() => {
    setLastResult(null);
    setServerHealthResult(null);
  }, []);

  const triggerHealthCheck422 = useCallback(async () => {
    setRunningHealthCheck(true);
    setError('');
    try {
      await api.createHealthCheck422();
    } catch (err) {
      setError(toUserErrorMessage(err, 'Failed to run health check.'));
    } finally {
      setRunningHealthCheck(false);
    }
  }, []);

  const triggerServerHealthTest = useCallback(async () => {
    setRunningServerHealthTest(true);
    setError('');
    try {
      const result = await api.runE2ETest({
        runner: 'server',
        output_tail_lines: outputTailLines,
      });
      setServerHealthResult(result);
    } catch (err) {
      setError(toUserErrorMessage(err, 'Failed to run server health test.'));
    } finally {
      setRunningServerHealthTest(false);
    }
  }, [outputTailLines]);

  const clearServerHealthResult = useCallback(() => {
    setServerHealthResult(null);
  }, []);

  return {
    loading,
    running,
    runningHealthCheck,
    runningServerHealthTest,
    error,
    activeTab,
    setActiveTab,
    runners,
    selectedRunner,
    setSelectedRunner,
    outputTailLines,
    setOutputTailLines,
    lastResult,
    serverHealthResult,
    runTests,
    triggerServerHealthTest,
    triggerHealthCheck422,
    clearServerHealthResult,
    clearResults,
    refreshMetadata: loadMetadata,
  };
}
