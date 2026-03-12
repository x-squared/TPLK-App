import E2ETestsPanel from '../features/e2e-tests/E2ETestsPanel';
import { useE2ETestsViewModel } from '../features/e2e-tests/useE2ETestsViewModel';
import ErrorBanner from './layout/ErrorBanner';
import { useI18n } from '../i18n/i18n';
import './layout/PanelLayout.css';
import '../features/e2e-tests/E2ETestsView.css';

export default function E2ETestsView() {
  const { t } = useI18n();
  const model = useE2ETestsViewModel();

  return (
    <>
      <header className="patients-header">
        <h1>{t('navigation.dev.e2eTests', 'E2E Tests')}</h1>
      </header>
      {model.error ? <ErrorBanner message={model.error} /> : null}
      {model.loading ? <p className="status">{t('e2e.loadingRunners', 'Loading E2E test runners...')}</p> : <E2ETestsPanel model={model} />}
    </>
  );
}
