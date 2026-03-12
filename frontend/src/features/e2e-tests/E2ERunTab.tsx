import E2EResultSection from './E2EResultSection';
import { useI18n } from '../../i18n/i18n';
import type { E2ETestsViewModel } from './types';

interface E2ERunTabProps {
  model: E2ETestsViewModel;
}

export default function E2ERunTab({ model }: E2ERunTabProps) {
  const { t } = useI18n();
  return (
    <>
      <section className="detail-section ui-panel-section">
        <div className="detail-section-heading">
          <h2>{t('e2e.run.configurationTitle', 'Configuration & Start')}</h2>
          <div className="e2e-header-actions">
            <button
              className="e2e-action-btn"
              onClick={() => void model.runTests()}
              disabled={model.running || model.loading || model.runners.length === 0}
            >
              {model.running ? t('e2e.run.running', 'Running...') : t('e2e.run.runTests', 'Run E2E Tests')}
            </button>
            <button
              className="e2e-action-btn e2e-clear-btn"
              onClick={model.clearResults}
              title={t('e2e.run.clearShownResult', 'Clear shown result')}
            >
              {t('e2e.run.clearRunResult', 'Clear run result')}
            </button>
          </div>
        </div>

        <div className="e2e-config-grid">
          <label className="reports-field">
            <span className="detail-label">{t('e2e.run.runner', 'Runner')}</span>
            <select
              className="detail-input"
              value={model.selectedRunner}
              onChange={(e) => model.setSelectedRunner(e.target.value as typeof model.selectedRunner)}
            >
              {model.runners.map((runner) => (
                <option key={runner.key} value={runner.key}>
                  {runner.label}
                </option>
              ))}
            </select>
          </label>
          <label className="reports-field">
            <span className="detail-label">{t('e2e.run.outputTailLines', 'Output tail lines')}</span>
            <input
              className="detail-input"
              type="number"
              min={20}
              max={2000}
              value={model.outputTailLines}
              onChange={(e) => model.setOutputTailLines(Number(e.target.value) || 160)}
            />
          </label>
        </div>
        <p className="status e2e-runner-help">
          {model.runners.find((entry) => entry.key === model.selectedRunner)?.description ?? t('e2e.run.selectRunnerHint', 'Select a runner and start.')}
        </p>
      </section>

      <section className="detail-section ui-panel-section">
        <div className="detail-section-heading">
          <h2>{t('reports.builder.result.title', 'Results')}</h2>
        </div>
        <E2EResultSection model={model} />
      </section>
    </>
  );
}
