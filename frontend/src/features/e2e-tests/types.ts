import type {
  E2ETestRunResponse,
  E2ETestRunnerKey,
  E2ETestRunnerOption,
} from '../../api';

export type E2ETestsTabKey = 'e2e-tests' | 'health-check';

export interface E2ETestsViewModel {
  loading: boolean;
  running: boolean;
  runningHealthCheck: boolean;
  runningServerHealthTest: boolean;
  error: string;
  activeTab: E2ETestsTabKey;
  setActiveTab: (value: E2ETestsTabKey) => void;
  runners: E2ETestRunnerOption[];
  selectedRunner: E2ETestRunnerKey;
  setSelectedRunner: (value: E2ETestRunnerKey) => void;
  outputTailLines: number;
  setOutputTailLines: (value: number) => void;
  lastResult: E2ETestRunResponse | null;
  serverHealthResult: E2ETestRunResponse | null;
  runTests: () => Promise<void>;
  triggerServerHealthTest: () => Promise<void>;
  triggerHealthCheck422: () => Promise<void>;
  clearServerHealthResult: () => void;
  clearResults: () => void;
  refreshMetadata: () => Promise<void>;
}
