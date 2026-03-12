import ReportsBuilder from '../features/reports/ReportsBuilder';
import { useReportsViewModel } from '../features/reports/useReportsViewModel';
import { useI18n } from '../i18n/i18n';
import './layout/PanelLayout.css';
import '../features/reports/ReportsView.css';

export default function ReportsView() {
  const { t } = useI18n();
  const model = useReportsViewModel();

  return (
    <>
      <header className="patients-header">
        <h1>{t('reports.title', 'Reports')}</h1>
      </header>
      {model.error ? <p className="status">{model.error}</p> : null}
      {model.loading ? <p className="status">{t('reports.loadingMetadata', 'Loading report metadata...')}</p> : <ReportsBuilder model={model} />}
    </>
  );
}
