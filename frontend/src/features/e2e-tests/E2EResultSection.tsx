import { useMemo, useState } from 'react';
import { useI18n } from '../../i18n/i18n';
import type { E2ETestCaseResult } from '../../api';
import type { E2ETestsViewModel } from './types';

interface E2EResultSectionProps {
  model: E2ETestsViewModel;
}

export default function E2EResultSection({ model }: E2EResultSectionProps) {
  const { t } = useI18n();
  const [resultViewMode, setResultViewMode] = useState<'table' | 'text'>('table');
  const result = model.lastResult;
  const caseResults = result?.case_results ?? [];
  const tableRows = useMemo(() => caseResults, [caseResults]);

  if (!result) {
    return <p className="status">{t('e2e.results.noRunYet', 'No run yet.')}</p>;
  }
  const reportPathHref = result.report_file_abs
    ? `vscode://file${encodeURI(result.report_file_abs.replace(/\\/g, '/'))}`
    : null;

  const openSpecHref = (row: E2ETestCaseResult): string => {
    const normalized = row.source_file_abs.replace(/\\/g, '/');
    return `vscode://file${encodeURI(normalized)}`;
  };

  return (
    <div className="e2e-results">
      <div className="e2e-result-meta">
        <span className={`e2e-run-state ${result.success ? 'ok' : 'fail'}`}>
          {result.success ? t('e2e.results.statusPass', 'PASS') : t('e2e.results.statusFail', 'FAIL')}
        </span>
        <span>{t('e2e.results.exitCode', 'Exit code')}: {result.exit_code}</span>
        <span>{t('e2e.results.duration', 'Duration')}: {result.duration_seconds.toFixed(1)}s</span>
        {result.report_path ? (
          <span>
            {t('e2e.results.reportPath', 'Report')}: {' '}
            {reportPathHref ? (
              <a href={reportPathHref} target="_blank" rel="noreferrer">
                {result.report_path}
              </a>
            ) : result.report_path}
          </span>
        ) : null}
      </div>
      <div className="e2e-result-view-switch">
        <button
          type="button"
          className={`e2e-action-btn ${resultViewMode === 'table' ? '' : 'e2e-clear-btn'}`}
          onClick={() => setResultViewMode('table')}
        >
          {t('e2e.results.viewTable', 'Table view')}
        </button>
        <button
          type="button"
          className={`e2e-action-btn ${resultViewMode === 'text' ? '' : 'e2e-clear-btn'}`}
          onClick={() => setResultViewMode('text')}
        >
          {t('e2e.results.viewText', 'Text view')}
        </button>
      </div>
      {resultViewMode === 'table' ? (
        <div className="e2e-output-block">
          <p className="detail-label">{t('e2e.results.caseResultsTitle', 'Test Case Results')}</p>
          {tableRows.length === 0 ? (
            <p className="status">{t('e2e.results.noCaseResults', 'No case results available for this runner.')}</p>
          ) : (
            <div className="e2e-table-wrap">
              <table className="data-table e2e-results-table">
                <thead>
                  <tr>
                    <th>{t('e2e.results.columns.caseId', 'Case ID')}</th>
                    <th>{t('e2e.results.columns.result', 'Result')}</th>
                    <th>{t('e2e.results.columns.name', 'Name')}</th>
                    <th>{t('e2e.results.columns.message', 'Message')}</th>
                    <th>{t('e2e.results.columns.spec', 'Spec')}</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row) => (
                    <tr key={row.case_id}>
                      <td>{row.case_id}</td>
                      <td>
                        <span className={`e2e-run-state ${row.status.toUpperCase() === 'PASS' ? 'ok' : 'fail'}`}>
                          {row.status}
                        </span>
                      </td>
                      <td>{row.name}</td>
                      <td>{row.message || '-'}</td>
                      <td className="e2e-spec-link-cell">
                        <a href={openSpecHref(row)} title={t('e2e.results.openSpec', 'Open testcase specification')}>
                          {t('e2e.results.openSpecIcon', 'Open')}
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}
      <div className="e2e-output-block">
        <p className="detail-label">{t('e2e.results.consoleTail', 'Console output (tail)')}</p>
        <pre>{result.output_tail || t('e2e.results.noOutputCaptured', 'No output captured.')}</pre>
      </div>
      <div className="e2e-output-block">
        <p className="detail-label">{t('e2e.results.reportExcerpt', 'Report excerpt')}</p>
        <pre>{result.report_excerpt || t('e2e.results.noReportAvailable', 'No report available.')}</pre>
      </div>
    </div>
  );
}
