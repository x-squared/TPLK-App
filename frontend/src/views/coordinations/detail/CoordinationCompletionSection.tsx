import { useMemo, useState } from 'react';
import type { CoordinationCompletionState } from '../../../api';
import { toUserErrorMessage } from '../../../api/error';
import { useI18n } from '../../../i18n/i18n';
import { ACTION_I18N_KEYS, COMMON_I18N_KEYS, COORDINATION_I18N_KEYS } from '../../../i18n/keys';
import ErrorBanner from '../../layout/ErrorBanner';
import { formatDateTimeDdMmYyyy } from '../../layout/dateFormat';
import TaskBoard from '../../tasks/TaskBoard';

interface Props {
  completionState: CoordinationCompletionState | null;
  onRefresh: () => Promise<void>;
  onConfirm: (comment: string) => Promise<void>;
}

export default function CoordinationCompletionSection({
  completionState,
  onRefresh,
  onConfirm,
}: Props) {
  const { t } = useI18n();
  const [commentDraft, setCommentDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const confirmedInfo = useMemo(() => {
    if (!completionState?.completion_confirmed) return '';
    const byUser = completionState.completion_confirmed_by_user?.name || t(COMMON_I18N_KEYS.unknown, 'Unknown');
    const at = formatDateTimeDdMmYyyy(completionState.completion_confirmed_at);
    return t(COORDINATION_I18N_KEYS.completion.confirmedMeta, 'Confirmed by {user} at {time}')
      .replace('{user}', byUser)
      .replace('{time}', at);
  }, [completionState, t]);

  const handleConfirm = async () => {
    setSaving(true);
    setError('');
    try {
      await onConfirm(commentDraft.trim());
      setCommentDraft('');
    } catch (err) {
      setError(
        toUserErrorMessage(
          err,
          t(COORDINATION_I18N_KEYS.completion.errors.confirm, 'Failed to confirm coordination completion.'),
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="detail-section ui-panel-section">
      <div className="detail-section-heading">
        <h2>{t(COORDINATION_I18N_KEYS.completion.title, 'Completion')}</h2>
        <button className="patients-cancel-btn" onClick={() => void onRefresh()}>
          {t(ACTION_I18N_KEYS.refresh, 'Refresh')}
        </button>
      </div>

      <section className="detail-section ui-panel-section">
        <p className={completionState?.completion_confirmed ? 'status success' : 'status'}>
          {completionState?.completion_confirmed
            ? t(COORDINATION_I18N_KEYS.completion.confirmed, 'Coordination is confirmed as completed.')
            : t(COORDINATION_I18N_KEYS.completion.notConfirmed, 'Coordination is not yet confirmed as completed.')}
        </p>
        {completionState?.completion_confirmed && confirmedInfo ? <p className="status">{confirmedInfo}</p> : null}
        {completionState?.completion_comment ? (
          <p className="status">{completionState.completion_comment}</p>
        ) : null}
        <textarea
          className="detail-input"
          value={commentDraft}
          placeholder={t(COORDINATION_I18N_KEYS.completion.commentPlaceholder, 'Add completion comment')}
          onChange={(event) => setCommentDraft(event.target.value)}
          rows={3}
        />
        <div className="edit-actions">
          <button className="save-btn" onClick={() => void handleConfirm()} disabled={saving}>
            {saving
              ? t(COORDINATION_I18N_KEYS.completion.confirming, 'Confirming...')
              : t(COORDINATION_I18N_KEYS.completion.confirmAction, 'Confirm completion')}
          </button>
        </div>
      </section>

      <section className="detail-section ui-panel-section">
        <TaskBoard
          declaredContextType="COORDINATION"
          title={t(COORDINATION_I18N_KEYS.completion.allTasksTitle, 'All coordination tasks')}
          hideAddButton
          includeClosedTasks
          showGroupHeadingsDefault
          criteria={{
            contextType: 'COORDINATION',
            extraParams: {
              coordination_id: completionState?.coordination_id,
            },
          }}
        />
      </section>
      <ErrorBanner message={error} />
    </section>
  );
}
