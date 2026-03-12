import type React from 'react';
import type { Coordination } from '../../../api';
import { translateCodeLabel } from '../../../i18n/codeTranslations';
import { useI18n } from '../../../i18n/i18n';
import EditableSectionHeader from '../../layout/EditableSectionHeader';
import ErrorBanner from '../../layout/ErrorBanner';
import { formatDateDdMmYyyy } from '../../layout/dateFormat';

interface CoreDraft {
  start: string;
  end: string;
  swtpl_nr: string;
  national_coordinator: string;
  comment: string;
}

interface Props {
  coordination: Coordination;
  coreDraft: CoreDraft;
  setCoreDraft: React.Dispatch<React.SetStateAction<CoreDraft>>;
  coreEditing: boolean;
  coreSaving: boolean;
  coreDirty: boolean;
  coreError: string;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
}

export default function CoordinationBasicDataSection({
  coordination,
  coreDraft,
  setCoreDraft,
  coreEditing,
  coreSaving,
  coreDirty,
  coreError,
  onEdit,
  onSave,
  onCancel,
}: Props) {
  const { t } = useI18n();
  return (
    <section className="detail-section ui-panel-section">
      <EditableSectionHeader
        title={t('coordinations.basicData.title', 'Basic data')}
        editing={coreEditing}
        saving={coreSaving}
        dirty={coreDirty}
        onEdit={onEdit}
        onSave={onSave}
        onCancel={onCancel}
      />
      <div className="detail-grid">
        <div className="detail-field">
          <span className="detail-label">{t('coordinations.basicData.status', 'Status')}</span>
          <span className="detail-value">{translateCodeLabel(t, coordination.status)}</span>
        </div>
        <div className="detail-field">
          <span className="detail-label">{t('coordinations.basicData.start', 'Start')}</span>
          {coreEditing ? (
            <input
              className="detail-input"
              type="date"
              value={coreDraft.start}
              onChange={(e) => setCoreDraft((prev) => ({ ...prev, start: e.target.value }))}
            />
          ) : (
            <span className="detail-value">{formatDateDdMmYyyy(coordination.start)}</span>
          )}
        </div>
        <div className="detail-field">
          <span className="detail-label">{t('coordinations.basicData.end', 'End')}</span>
          {coreEditing ? (
            <input
              className="detail-input"
              type="date"
              value={coreDraft.end}
              onChange={(e) => setCoreDraft((prev) => ({ ...prev, end: e.target.value }))}
            />
          ) : (
            <span className="detail-value">{formatDateDdMmYyyy(coordination.end)}</span>
          )}
        </div>
        <div className="detail-field">
          <span className="detail-label">{t('coordinations.basicData.swtplNr', 'SWTPL Nr')}</span>
          {coreEditing ? (
            <input
              className="detail-input"
              value={coreDraft.swtpl_nr}
              onChange={(e) => setCoreDraft((prev) => ({ ...prev, swtpl_nr: e.target.value }))}
            />
          ) : (
            <span className="detail-value">{coordination.swtpl_nr || t('common.emptySymbol', '–')}</span>
          )}
        </div>
        <div className="detail-field">
          <span className="detail-label">{t('coordinations.basicData.nationalCoordinator', 'National coordinator')}</span>
          {coreEditing ? (
            <input
              className="detail-input"
              value={coreDraft.national_coordinator}
              onChange={(e) => setCoreDraft((prev) => ({ ...prev, national_coordinator: e.target.value }))}
            />
          ) : (
            <span className="detail-value">{coordination.national_coordinator || t('common.emptySymbol', '–')}</span>
          )}
        </div>
      </div>
      <div className="detail-field coord-comment-field">
        <span className="detail-label">{t('taskBoard.columns.comment', 'Comment')}</span>
        {coreEditing ? (
          <textarea
            className="detail-input coord-comment-input"
            value={coreDraft.comment}
            onChange={(e) => setCoreDraft((prev) => ({ ...prev, comment: e.target.value }))}
          />
        ) : (
          <div className="detail-value coord-comment-value">{coordination.comment || t('common.emptySymbol', '–')}</div>
        )}
      </div>
      <ErrorBanner message={coreError} />
    </section>
  );
}
