import { useEffect, useMemo, useRef, useState } from 'react';
import { api, type CoordinationProtocolEventLog } from '../../../api';
import { toUserErrorMessage } from '../../../api/error';
import { useI18n } from '../../../i18n/i18n';
import { TASK_CHANGED_EVENT } from '../../tasks/taskEvents';
import type { TaskBoardTaskChangeEvent } from '../../tasks/taskBoardTypes';
import {
  exportProtocolEventLogCsv,
  exportProtocolEventLogPdf,
  formatProtocolEventLogDateTime,
} from './exportProtocolEventLog';

interface CoordinationProtocolEventLogPanelProps {
  coordinationId: number;
  organId: number;
}

export default function CoordinationProtocolEventLogPanel({
  coordinationId,
  organId,
}: CoordinationProtocolEventLogPanelProps) {
  const { t } = useI18n();
  const [entries, setEntries] = useState<CoordinationProtocolEventLog[]>([]);
  const [draftEvent, setDraftEvent] = useState('');
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const loadEntries = async () => {
    const rows = await api.listCoordinationProtocolEvents(coordinationId, organId);
    setEntries(rows);
  };

  useEffect(() => {
    const load = async () => {
      try {
        setError('');
        await loadEntries();
      } catch (err) {
        setError(toUserErrorMessage(err, t('coordinations.protocolEventLog.errors.load', 'Failed to load protocol event log.')));
      }
    };
    void load();
  }, [coordinationId, organId]);

  useEffect(() => {
    const onTaskChanged = (event: Event) => {
      const detail = (event as CustomEvent<TaskBoardTaskChangeEvent>).detail;
      const group = detail?.group;
      const isRelevant = (
        !!group
        && group.coordination_id === coordinationId
        && group.organ_id === organId
        && (detail.reason === 'completed' || detail.reason === 'discarded')
      );
      if (!isRelevant) return;
      void loadEntries();
    };
    window.addEventListener(TASK_CHANGED_EVENT, onTaskChanged);
    return () => {
      window.removeEventListener(TASK_CHANGED_EVENT, onTaskChanged);
    };
  }, [coordinationId, organId]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = 0;
  }, [entries]);

  const submitEvent = async () => {
    const text = draftEvent.trim();
    if (!text) return;
    try {
      const created = await api.createCoordinationProtocolEvent(coordinationId, {
        organ_id: organId,
        event: text,
        task_id: null,
      });
      setDraftEvent('');
      setEntries((prev) => [created, ...prev]);
      setError('');
    } catch (err) {
      setError(toUserErrorMessage(err, t('coordinations.protocolEventLog.errors.save', 'Failed to save protocol event.')));
    }
  };

  const dialogEntries = useMemo(
    () => [...entries].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()),
    [entries],
  );

  const formatTimeOfDay = (value: string): string => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '--:--:--';
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  };

  const exportLabels = useMemo(
    () => ({
      title: t('coordinations.protocolEventLog.dialog.title', 'Protocol Event Log'),
      columns: {
        time: t('coordinations.protocolEventLog.dialog.columns.time', 'Time'),
        event: t('coordinations.protocolEventLog.dialog.columns.event', 'Event'),
        task: t('coordinations.protocolEventLog.dialog.columns.task', 'Task'),
        comment: t('coordinations.protocolEventLog.dialog.columns.comment', 'Comment'),
        user: t('coordinations.protocolEventLog.dialog.columns.user', 'User'),
      },
    }),
    [t],
  );

  return (
    <section className="coord-protocol-pane coord-protocol-event-pane">
      <div className="ui-panel-heading coord-protocol-pane-header">
        <h2 className="coord-protocol-pane-title coord-protocol-pane-title-inline">
          {t('coordinations.protocolEventLog.title', 'Protocol Log')}
        </h2>
        <button
          className="edit-btn coord-protocol-dialog-open-btn"
          type="button"
          title={t('coordinations.protocolEventLog.dialog.open', 'Open log dialog')}
          aria-label={t('coordinations.protocolEventLog.dialog.open', 'Open log dialog')}
          onClick={() => setDialogOpen(true)}
        >
          ⧉
        </button>
      </div>
      <div className={`coord-event-input-row ${focused ? 'alert' : ''}`}>
        <input
          className={`detail-input coord-event-input ${focused ? 'alert' : ''}`}
          value={draftEvent}
          placeholder={t('coordinations.protocolEventLog.placeholder', 'Type event...')}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            void submitEvent();
            setFocused(false);
          }}
          onChange={(event) => setDraftEvent(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void submitEvent();
              return;
            }
            if (event.key === 'Tab') {
              void submitEvent();
            }
          }}
        />
      </div>
      {error ? <p className="status">{error}</p> : null}
      <div className="coord-event-log-list" ref={listRef}>
        {entries.length === 0 ? (
          <p className="detail-empty">{t('coordinations.protocolEventLog.empty', 'No event log entries for this organ.')}</p>
        ) : (
          <ul className="coord-protocol-compact-list coord-event-log-list-items">
            {entries.map((entry) => (
              <li key={entry.id} className="coord-event-log-item">
                <span className="coord-event-log-text">
                  {entry.event}
                  {entry.task_text ? `: ${entry.task_text}` : ''}
                  {entry.task_comment ? ` (${entry.task_comment})` : ''}
                </span>
                <span className="coord-event-log-time">{formatTimeOfDay(entry.time)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {dialogOpen ? (
        <div className="coord-protocol-log-dialog-overlay" role="dialog" aria-modal="true">
          <div className="coord-protocol-log-dialog">
            <header className="coord-protocol-log-dialog-header">
              <h3>{t('coordinations.protocolEventLog.dialog.title', 'Protocol Event Log')}</h3>
              <div className="coord-protocol-log-dialog-actions">
                <button
                  type="button"
                  className="edit-btn"
                  title={t('coordinations.protocolEventLog.dialog.exportPdf', 'Export PDF')}
                  aria-label={t('coordinations.protocolEventLog.dialog.exportPdf', 'Export PDF')}
                  onClick={() => exportProtocolEventLogPdf({
                    entries: dialogEntries,
                    coordinationId,
                    organId,
                    labels: exportLabels,
                  })}
                >
                  PDF
                </button>
                <button
                  type="button"
                  className="edit-btn"
                  title={t('coordinations.protocolEventLog.dialog.exportCsv', 'Export CSV')}
                  aria-label={t('coordinations.protocolEventLog.dialog.exportCsv', 'Export CSV')}
                  onClick={() => exportProtocolEventLogCsv({
                    entries: dialogEntries,
                    coordinationId,
                    organId,
                    labels: exportLabels,
                  })}
                >
                  CSV
                </button>
              </div>
            </header>
            <div className="coord-protocol-log-dialog-body">
              {dialogEntries.length === 0 ? (
                <p className="detail-empty">{t('coordinations.protocolEventLog.empty', 'No event log entries for this organ.')}</p>
              ) : (
                <div className="coord-protocol-log-dialog-table" role="table" aria-label={t('coordinations.protocolEventLog.dialog.title', 'Protocol Event Log')}>
                  <div className="coord-protocol-log-dialog-table-header" role="row">
                    <span role="columnheader">{t('coordinations.protocolEventLog.dialog.columns.time', 'Time')}</span>
                    <span role="columnheader">{t('coordinations.protocolEventLog.dialog.columns.event', 'Event')}</span>
                    <span role="columnheader">{t('coordinations.protocolEventLog.dialog.columns.task', 'Task')}</span>
                    <span role="columnheader">{t('coordinations.protocolEventLog.dialog.columns.comment', 'Comment')}</span>
                    <span role="columnheader">{t('coordinations.protocolEventLog.dialog.columns.user', 'User')}</span>
                  </div>
                  {dialogEntries.map((entry) => (
                    <div key={entry.id} className="coord-protocol-log-dialog-table-row" role="row">
                      <span role="cell">{formatProtocolEventLogDateTime(entry.time)}</span>
                      <span role="cell">{entry.event || '—'}</span>
                      <span role="cell">{entry.task_text || '—'}</span>
                      <span role="cell">{entry.task_comment || '—'}</span>
                      <span role="cell">{entry.changed_by_user?.name || '—'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="coord-protocol-log-dialog-footer">
              <button type="button" className="patients-cancel-btn" onClick={() => setDialogOpen(false)}>
                {t('coordinations.protocolEventLog.dialog.close', 'Close')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
