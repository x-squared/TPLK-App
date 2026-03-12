import type React from 'react';
import { useI18n } from '../../../i18n/i18n';
import InlineDeleteActions from '../../layout/InlineDeleteActions';
import ErrorBanner from '../../layout/ErrorBanner';
import { formatDateTimeDdMmYyyy } from '../../layout/dateFormat';

interface UserOption {
  id: number;
  name: string;
}

interface TimeLogRow {
  id: number;
  user_id: number;
  user: { id: number; name: string } | null;
  start: string | null;
  end: string | null;
  comment: string;
}

interface TimeLogDraft {
  user_id: number;
  start: string;
  end: string;
  comment: string;
}

interface CoordinationTimeLogSectionProps {
  timeLogs: TimeLogRow[];
  users: UserOption[];
  addingLog: boolean;
  editingLogId: number | null;
  logDraft: TimeLogDraft;
  setLogDraft: React.Dispatch<React.SetStateAction<TimeLogDraft>>;
  logError: string;
  onOpenAddLog: () => void;
  onOpenEditLog: (log: TimeLogRow) => void;
  onCloseLogEditor: () => void;
  onSaveLogDraft: () => void;
  onDeleteLog: (id: number) => void;
  confirmDeleteLogId: number | null;
  setConfirmDeleteLogId: React.Dispatch<React.SetStateAction<number | null>>;
  hasEditorOpen: boolean;
  totalsByUser: [string, number][];
  formatElapsed: (seconds: number) => string;
}

const fmtDateTime = (value: string | null): string => {
  return formatDateTimeDdMmYyyy(value);
};

export default function CoordinationTimeLogSection({
  timeLogs,
  users,
  addingLog,
  editingLogId,
  logDraft,
  setLogDraft,
  logError,
  onOpenAddLog,
  onOpenEditLog,
  onCloseLogEditor,
  onSaveLogDraft,
  onDeleteLog,
  confirmDeleteLogId,
  setConfirmDeleteLogId,
  hasEditorOpen,
  totalsByUser,
  formatElapsed,
}: CoordinationTimeLogSectionProps) {
  const { t } = useI18n();
  return (
    <section className="detail-section ui-panel-section">
      <div className="detail-section-heading">
        <h2>{t('coordinations.timeLog.title', 'Time log')}</h2>
        {!hasEditorOpen && (
          <button className="ci-add-btn" onClick={onOpenAddLog}>
            {t('information.actions.add', '+ Add')}
          </button>
        )}
      </div>
      <div className="coord-time-totals">
        <span className="detail-label">{t('coordinations.timeLog.totalPerUser', 'Total time per user')}</span>
        {totalsByUser.length === 0 ? (
          <p className="detail-empty">{t('coordinations.timeLog.noCompletedIntervals', 'No completed time intervals yet.')}</p>
        ) : (
          <div className="coord-time-total-list">
            {totalsByUser.map(([userName, seconds]) => (
              <div key={userName} className="coord-time-total-row">
                <span>{userName}</span>
                <strong>{formatElapsed(seconds)}</strong>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="ui-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('coordinations.timeLog.user', 'User')}</th>
              <th>{t('coordinations.basicData.start', 'Start')}</th>
              <th>{t('coordinations.basicData.end', 'End')}</th>
              <th>{t('taskBoard.columns.comment', 'Comment')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {addingLog && (
              <tr className="ci-editing-row">
                <td>
                  <select
                    className="detail-input ci-inline-input coord-time-user-input"
                    value={logDraft.user_id || ''}
                    onChange={(e) => setLogDraft((prev) => ({ ...prev, user_id: Number(e.target.value) }))}
                  >
                    <option value="">{t('coordinations.timeLog.selectUser', 'Select user')}</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    className="detail-input ci-inline-input coord-time-datetime-input"
                    type="datetime-local"
                    step={1}
                    value={logDraft.start}
                    onChange={(e) => setLogDraft((prev) => ({ ...prev, start: e.target.value }))}
                  />
                </td>
                <td>
                  <input
                    className="detail-input ci-inline-input coord-time-datetime-input"
                    type="datetime-local"
                    step={1}
                    value={logDraft.end}
                    onChange={(e) => setLogDraft((prev) => ({ ...prev, end: e.target.value }))}
                  />
                </td>
                <td>
                  <input
                    className="detail-input ci-inline-input"
                    value={logDraft.comment}
                    placeholder={t('taskBoard.columns.comment', 'Comment')}
                    onChange={(e) => setLogDraft((prev) => ({ ...prev, comment: e.target.value }))}
                  />
                </td>
                <td className="coord-time-actions">
                  <button className="ci-save-inline" onClick={onSaveLogDraft} title={t('actions.save', 'Save')} aria-label={t('actions.save', 'Save')}>
                    ✓
                  </button>
                  <button className="ci-cancel-inline" onClick={onCloseLogEditor} title={t('actions.cancel', 'Cancel')} aria-label={t('actions.cancel', 'Cancel')}>
                    ✕
                  </button>
                </td>
              </tr>
            )}
            {timeLogs.length === 0 && !addingLog ? (
              <tr>
                <td colSpan={5} className="status">{t('coordinations.timeLog.empty', 'No time logs found.')}</td>
              </tr>
            ) : null}
            {timeLogs.map((log) => (
              editingLogId === log.id ? (
                <tr key={log.id} className="ci-editing-row">
                  <td>
                    <select
                      className="detail-input ci-inline-input coord-time-user-input"
                      value={logDraft.user_id || ''}
                      onChange={(e) => setLogDraft((prev) => ({ ...prev, user_id: Number(e.target.value) }))}
                    >
                      <option value="">{t('coordinations.timeLog.selectUser', 'Select user')}</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      className="detail-input ci-inline-input coord-time-datetime-input"
                      type="datetime-local"
                      step={1}
                      value={logDraft.start}
                      onChange={(e) => setLogDraft((prev) => ({ ...prev, start: e.target.value }))}
                    />
                  </td>
                  <td>
                    <input
                      className="detail-input ci-inline-input coord-time-datetime-input"
                      type="datetime-local"
                      step={1}
                      value={logDraft.end}
                      onChange={(e) => setLogDraft((prev) => ({ ...prev, end: e.target.value }))}
                    />
                  </td>
                  <td>
                    <input
                      className="detail-input ci-inline-input"
                      value={logDraft.comment}
                      placeholder={t('taskBoard.columns.comment', 'Comment')}
                      onChange={(e) => setLogDraft((prev) => ({ ...prev, comment: e.target.value }))}
                    />
                  </td>
                  <td className="coord-time-actions">
                    <button className="ci-save-inline" onClick={onSaveLogDraft} title={t('actions.save', 'Save')} aria-label={t('actions.save', 'Save')}>
                      ✓
                    </button>
                    <button className="ci-cancel-inline" onClick={onCloseLogEditor} title={t('actions.cancel', 'Cancel')} aria-label={t('actions.cancel', 'Cancel')}>
                      ✕
                    </button>
                  </td>
                </tr>
              ) : (
                <tr key={log.id}>
                  <td>{log.user?.name ?? `#${log.user_id}`}</td>
                  <td>{fmtDateTime(log.start)}</td>
                  <td>{fmtDateTime(log.end)}</td>
                  <td>{log.comment || t('common.emptySymbol', '–')}</td>
                  <td className="coord-time-actions">
                    <InlineDeleteActions
                      confirming={confirmDeleteLogId === log.id}
                      onEdit={() => onOpenEditLog(log)}
                      onRequestDelete={() => setConfirmDeleteLogId(log.id)}
                      onConfirmDelete={() => {
                        onDeleteLog(log.id);
                        setConfirmDeleteLogId(null);
                      }}
                      onCancelDelete={() => setConfirmDeleteLogId(null)}
                    />
                  </td>
                </tr>
              )
            ))}
          </tbody>
        </table>
      </div>
      <ErrorBanner message={logError} />
    </section>
  );
}
