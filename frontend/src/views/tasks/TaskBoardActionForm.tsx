import type { TaskActionState } from './taskBoardTypes';
import { useI18n } from '../../i18n/i18n';

interface TaskBoardActionFormProps {
  actionState: TaskActionState;
  actionComment: string;
  setActionComment: (value: string) => void;
  actionEventTime: string;
  setActionEventTime: (value: string) => void;
  actionSaving: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function TaskBoardActionForm({
  actionState,
  actionComment,
  setActionComment,
  actionEventTime,
  setActionEventTime,
  actionSaving,
  onConfirm,
  onCancel,
}: TaskBoardActionFormProps) {
  const { t } = useI18n();
  const hintText = (actionState.hint ?? '').trim();
  const requiresComment = actionState.type === 'discard' || hintText.length > 0;
  const isEvent = actionState.task.kind_key === 'EVENT';
  const requiresEventTime = isEvent && actionState.type === 'complete';
  const actionLabel = actionState.type === 'complete'
    ? (isEvent
      ? t('taskBoard.actions.registerEventOccurrence', 'Register event occurrence')
      : t('taskBoard.actions.completeTask', 'Complete task'))
    : (isEvent
      ? t('taskBoard.actions.discardEvent', 'Discard event')
      : t('taskBoard.actions.discardTask', 'Discard task'));
  return (
    <div className="task-board-action-form">
      <p className="task-board-action-title">
        {actionLabel}: {actionState.task.description}
      </p>
      {hintText ? (
        <p className="task-board-action-title">
          {hintText}
        </p>
      ) : null}
      {requiresEventTime ? (
        <input
          className="task-board-action-comment"
          type="datetime-local"
          step={1}
          value={actionEventTime}
          onChange={(e) => setActionEventTime(e.target.value)}
          aria-label={t('taskBoard.eventTime.label', 'Event time')}
          title={t('taskBoard.eventTime.label', 'Event time')}
        />
      ) : null}
      <textarea
        className="task-board-action-comment"
        value={actionComment}
        onChange={(e) => setActionComment(e.target.value)}
        placeholder={hintText || (
          requiresComment
            ? t('taskBoard.comment.required', 'Comment (required)')
            : t('taskBoard.comment.optional', 'Comment (optional)')
        )}
      />
      <div className="task-board-action-buttons">
        <button
          className="save-btn"
          onClick={onConfirm}
          disabled={actionSaving || (requiresComment && actionComment.trim() === '') || (requiresEventTime && actionEventTime.trim() === '')}
          title={t('actions.confirm', 'Confirm')}
          aria-label={t('actions.confirm', 'Confirm')}
        >
          {actionSaving ? '…' : '✓'}
        </button>
        <button
          className="cancel-btn"
          onClick={onCancel}
          disabled={actionSaving}
          title={t('actions.cancel', 'Cancel')}
          aria-label={t('actions.cancel', 'Cancel')}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
