import type { E2ETestsViewModel } from './types';
import { useI18n } from '../../i18n/i18n';

interface E2EHealthCheckTabProps {
  model: E2ETestsViewModel;
}

export default function E2EHealthCheckTab({ model }: E2EHealthCheckTabProps) {
  const { t } = useI18n();
  const result = model.serverHealthResult;
  return (
    <section className="detail-section ui-panel-section">
      <div className="detail-section-heading">
        <h2>{t('e2e.health.title', 'Health Check')}</h2>
      </div>
      <div className="e2e-health-grid">
        <fieldset className="e2e-health-box">
          <legend>{t('e2e.health.serverHealth.legend', 'Server Health Test')}</legend>
          <p className="detail-empty e2e-health-help">
            {t('e2e.health.serverHealth.help', 'Run the server health specification test (`spec/testing/server/health.md`).')}
          </p>
          <div className="e2e-health-actions">
            <button
              className="e2e-action-btn"
              onClick={() => {
                void model.triggerServerHealthTest();
              }}
              disabled={model.runningServerHealthTest}
            >
              {model.runningServerHealthTest
                ? t('e2e.health.serverHealth.running', 'Running...')
                : t('e2e.health.serverHealth.run', 'Run health test')}
            </button>
            <button
              className="e2e-action-btn e2e-clear-btn"
              onClick={model.clearServerHealthResult}
              disabled={!result}
              title={t('e2e.health.serverHealth.clearResult', 'Clear result')}
            >
              {t('e2e.health.serverHealth.clearResult', 'Clear result')}
            </button>
          </div>
          <div className="e2e-output-block e2e-health-result-box">
            <p className="detail-label">{t('e2e.health.serverHealth.resultTitle', 'Result')}</p>
            {result ? (
              <>
                <div className="e2e-result-meta e2e-health-result-meta">
                  <span className={`e2e-run-state ${result.success ? 'ok' : 'fail'}`}>
                    {result.success
                      ? t('e2e.health.serverHealth.statusPass', 'PASS')
                      : t('e2e.health.serverHealth.statusFail', 'FAIL')}
                  </span>
                  <span>{t('e2e.health.serverHealth.exitCodeLabel', 'Exit code')}: {result.exit_code}</span>
                  <span>{t('e2e.health.serverHealth.durationLabel', 'Duration')}: {result.duration_seconds.toFixed(1)}s</span>
                  {result.report_path ? (
                    <span>{t('e2e.health.serverHealth.reportLabel', 'Report')}: {result.report_path}</span>
                  ) : null}
                </div>
                <pre>{result.output_tail || t('e2e.health.serverHealth.noOutput', 'No output captured.')}</pre>
              </>
            ) : (
              <p className="detail-empty e2e-health-help">{t('e2e.health.serverHealth.noResult', 'No run yet.')}</p>
            )}
          </div>
        </fieldset>
        <fieldset className="e2e-health-box">
          <legend>{t('e2e.health.errorFramework.legend', 'Error Framework Check')}</legend>
          <p className="detail-empty e2e-health-help">
            {t('e2e.health.errorFramework.help', 'This test intentionally triggers a backend `422` response so the shared error framework can be verified.')}
          </p>
          <div className="e2e-health-actions">
            <button
              className="e2e-action-btn"
              onClick={() => {
                void model.triggerHealthCheck422();
              }}
              disabled={model.runningHealthCheck}
            >
              {model.runningHealthCheck
                ? t('e2e.health.errorFramework.creating', 'Creating...')
                : t('e2e.health.errorFramework.createError', 'Create error')}
            </button>
          </div>
        </fieldset>
      </div>
    </section>
  );
}
