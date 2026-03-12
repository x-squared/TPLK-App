import { useI18n } from '../../i18n/i18n';

interface InlineDeleteActionsProps {
  confirming: boolean;
  onRequestDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  onEdit?: () => void;
  deleting?: boolean;
}

export default function InlineDeleteActions({
  confirming,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
  onEdit,
  deleting = false,
}: InlineDeleteActionsProps) {
  const { t } = useI18n();
  if (confirming) {
    return (
      <span className="ci-confirm">
        <span className="ci-confirm-text">{t('common.delete.confirmPrompt', 'Delete?')}</span>
        <button className="ci-confirm-yes" onClick={onConfirmDelete} disabled={deleting}>
          {t('common.delete.yes', 'Yes')}
        </button>
        <button className="ci-confirm-no" onClick={onCancelDelete} disabled={deleting}>
          {t('common.delete.no', 'No')}
        </button>
      </span>
    );
  }

  return (
    <>
      {onEdit ? (
        <button className="ci-edit-inline" onClick={onEdit} title={t('actions.edit', 'Edit')}>
          ✎
        </button>
      ) : null}
      <button className="ci-delete-btn" onClick={onRequestDelete} title={t('actions.delete', 'Delete')} disabled={deleting}>
        {deleting ? '…' : '×'}
      </button>
    </>
  );
}
