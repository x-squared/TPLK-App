import { useMemo } from 'react';

import type { ScheduledJob, ScheduledJobRun } from '../../../api';
import ErrorBanner from '../../layout/ErrorBanner';
import { formatDateTimeDdMmYyyy } from '../../layout/dateFormat';
import { useI18n } from '../../../i18n/i18n';

interface Props {
  jobs: ScheduledJob[];
  selectedJobKey: string | null;
  onSelectJobKey: (jobKey: string) => void;
  runs: ScheduledJobRun[];
  loading: boolean;
  saving: boolean;
  error: string;
  statusKey: string;
  onRefresh: () => void;
  onTriggerJob: (jobKey: string) => void;
  onSetJobEnabled: (jobKey: string, isEnabled: boolean) => void;
}

const parseMetrics = (value: string): string => {
  if (!value) return '{}';
  try {
    const parsed = JSON.parse(value);
    return JSON.stringify(parsed);
  } catch {
    return value;
  }
};

export default function AdminSchedulerTab({
  jobs,
  selectedJobKey,
  onSelectJobKey,
  runs,
  loading,
  saving,
  error,
  statusKey,
  onRefresh,
  onTriggerJob,
  onSetJobEnabled,
}: Props) {
  const { t } = useI18n();
  const selectedJob = useMemo(
    () => jobs.find((item) => item.job_key === selectedJobKey) ?? null,
    [jobs, selectedJobKey],
  );

  const statusMessage = statusKey === 'triggered'
    ? t('admin.scheduler.status.triggered', 'Job triggered successfully.')
    : statusKey === 'enabled'
      ? t('admin.scheduler.status.enabled', 'Job enabled.')
      : statusKey === 'paused'
        ? t('admin.scheduler.status.paused', 'Job paused.')
        : '';

  return (
    <section className="detail-section ui-panel-section">
      <div className="detail-section-heading">
        <h2>{t('app.admin.tabs.scheduler', 'Scheduler')}</h2>
      </div>
      {loading && <p className="status">{t('admin.scheduler.loading', 'Loading scheduler jobs...')}</p>}
      {error && <ErrorBanner message={error} />}
      {statusMessage && <p className="status ok">{statusMessage}</p>}
      {!loading && (
        <>
          <div className="detail-section-heading">
            <h3>{t('admin.scheduler.jobs.title', 'Jobs')}</h3>
          </div>
          <div className="ui-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('admin.scheduler.jobs.columns.key', 'Key')}</th>
                  <th>{t('admin.scheduler.jobs.columns.name', 'Name')}</th>
                  <th>{t('admin.scheduler.jobs.columns.enabled', 'Enabled')}</th>
                  <th>{t('admin.scheduler.jobs.columns.interval', 'Interval (s)')}</th>
                  <th>{t('admin.scheduler.jobs.columns.nextRun', 'Next Run')}</th>
                  <th>{t('admin.scheduler.jobs.columns.lastStatus', 'Last Status')}</th>
                  <th>{t('taskBoard.columns.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr
                    key={job.id}
                    className={selectedJobKey === job.job_key ? 'admin-task-template-group-row-selected' : ''}
                    onClick={() => onSelectJobKey(job.job_key)}
                  >
                    <td>{job.job_key}</td>
                    <td>{job.name}</td>
                    <td>{job.is_enabled ? t('common.yes', 'Yes') : t('common.no', 'No')}</td>
                    <td>{job.interval_seconds}</td>
                    <td>{formatDateTimeDdMmYyyy(job.next_run_at)}</td>
                    <td>{job.last_status || t('common.emptySymbol', '–')}</td>
                    <td className="admin-people-actions-cell">
                      <button
                        className="save-btn"
                        disabled={saving}
                        onClick={(event) => {
                          event.stopPropagation();
                          onTriggerJob(job.job_key);
                        }}
                      >
                        {t('admin.scheduler.actions.runNow', 'Run now')}
                      </button>
                      <button
                        className="cancel-btn"
                        disabled={saving}
                        onClick={(event) => {
                          event.stopPropagation();
                          onSetJobEnabled(job.job_key, !job.is_enabled);
                        }}
                      >
                        {job.is_enabled
                          ? t('admin.scheduler.actions.pause', 'Pause')
                          : t('admin.scheduler.actions.enable', 'Enable')}
                      </button>
                    </td>
                  </tr>
                ))}
                {jobs.length === 0 && (
                  <tr>
                    <td colSpan={7}>{t('admin.scheduler.jobs.empty', 'No scheduler jobs configured.')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="detail-section-heading">
            <h3>{t('admin.scheduler.runs.title', 'Runs')}</h3>
            <div className="patients-add-actions">
              <button type="button" className="patients-cancel-btn" onClick={onRefresh} disabled={saving}>
                {t('actions.refresh', 'Refresh')}
              </button>
            </div>
          </div>
          {selectedJob && (
            <p className="status">
              {t('admin.scheduler.runs.forJob', 'Showing runs for')}: <strong>{selectedJob.job_key}</strong>
            </p>
          )}
          <div className="ui-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('admin.scheduler.runs.columns.startedAt', 'Started At')}</th>
                  <th>{t('admin.scheduler.runs.columns.finishedAt', 'Finished At')}</th>
                  <th>{t('admin.scheduler.runs.columns.status', 'Status')}</th>
                  <th>{t('admin.scheduler.runs.columns.trigger', 'Trigger')}</th>
                  <th>{t('admin.scheduler.runs.columns.duration', 'Duration (ms)')}</th>
                  <th>{t('admin.scheduler.runs.columns.summary', 'Summary')}</th>
                  <th>{t('admin.scheduler.runs.columns.metrics', 'Metrics')}</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id}>
                    <td>{formatDateTimeDdMmYyyy(run.started_at)}</td>
                    <td>{formatDateTimeDdMmYyyy(run.finished_at)}</td>
                    <td>{run.status}</td>
                    <td>{run.trigger_type}</td>
                    <td>{run.duration_ms ?? t('common.emptySymbol', '–')}</td>
                    <td>{run.summary || t('common.emptySymbol', '–')}</td>
                    <td><code>{parseMetrics(run.metrics_json)}</code></td>
                  </tr>
                ))}
                {runs.length === 0 && (
                  <tr>
                    <td colSpan={7}>{t('admin.scheduler.runs.empty', 'No job runs available yet.')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
