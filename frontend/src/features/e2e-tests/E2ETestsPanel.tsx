import E2EHealthCheckTab from './E2EHealthCheckTab';
import E2ERunTab from './E2ERunTab';
import type { E2ETestsViewModel } from './types';

interface E2ETestsPanelProps {
  model: E2ETestsViewModel;
}

export default function E2ETestsPanel({ model }: E2ETestsPanelProps) {
  const isE2ETestsTab = model.activeTab === 'e2e-tests';

  return (
    <>
      <nav className="detail-tabs">
        <button
          className={`detail-tab ${isE2ETestsTab ? 'active' : ''}`}
          onClick={() => model.setActiveTab('e2e-tests')}
        >
          E2E Tests
        </button>
        <button
          className={`detail-tab ${!isE2ETestsTab ? 'active' : ''}`}
          onClick={() => model.setActiveTab('health-check')}
        >
          Health Check
        </button>
      </nav>

      {isE2ETestsTab ? (
        <E2ERunTab model={model} />
      ) : (
        <E2EHealthCheckTab model={model} />
      )}
    </>
  );
}
