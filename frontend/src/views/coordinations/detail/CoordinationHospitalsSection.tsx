import type React from 'react';
import type { Code, CoordinationOrigin } from '../../../api';
import { translateCodeLabel } from '../../../i18n/codeTranslations';
import { useI18n } from '../../../i18n/i18n';
import EditableSectionHeader from '../../layout/EditableSectionHeader';
import ErrorBanner from '../../layout/ErrorBanner';

interface OriginDraft {
  detection_hospital_id: number;
  procurement_hospital_id: number;
}

interface Props {
  origin: CoordinationOrigin | null;
  originDraft: OriginDraft;
  setOriginDraft: React.Dispatch<React.SetStateAction<OriginDraft>>;
  originEditing: boolean;
  originSaving: boolean;
  originDirty: boolean;
  originError: string;
  hospitals: Code[];
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
}

export default function CoordinationHospitalsSection({
  origin,
  originDraft,
  setOriginDraft,
  originEditing,
  originSaving,
  originDirty,
  originError,
  hospitals,
  onEdit,
  onSave,
  onCancel,
}: Props) {
  const { t } = useI18n();
  return (
    <section className="detail-section ui-panel-section">
      <EditableSectionHeader
        title={t('coordinations.hospitals.title', 'Hospitals')}
        editing={originEditing}
        saving={originSaving}
        dirty={originDirty}
        onEdit={onEdit}
        onSave={onSave}
        onCancel={onCancel}
      />
      <div className="detail-grid">
        <div className="detail-field">
          <span className="detail-label">{t('coordinations.hospitals.detection', 'Detection hospital')}</span>
          {originEditing ? (
            <select
              className="detail-input"
              value={originDraft.detection_hospital_id || ''}
              onChange={(e) =>
                setOriginDraft((prev) => ({
                  ...prev,
                  detection_hospital_id: e.target.value ? Number(e.target.value) : 0,
                }))
              }
            >
              <option value="">{t('common.emptySymbol', '–')}</option>
              {hospitals.map((h) => (
                <option key={h.id} value={h.id}>
                  {translateCodeLabel(t, h)}
                </option>
              ))}
            </select>
          ) : (
            <span className="detail-value">{translateCodeLabel(t, origin?.detection_hospital)}</span>
          )}
        </div>
        <div className="detail-field">
          <span className="detail-label">{t('coordinations.hospitals.procurement', 'Procurement hospital')}</span>
          {originEditing ? (
            <select
              className="detail-input"
              value={originDraft.procurement_hospital_id || ''}
              onChange={(e) =>
                setOriginDraft((prev) => ({
                  ...prev,
                  procurement_hospital_id: e.target.value ? Number(e.target.value) : 0,
                }))
              }
            >
              <option value="">{t('common.emptySymbol', '–')}</option>
              {hospitals.map((h) => (
                <option key={h.id} value={h.id}>
                  {translateCodeLabel(t, h)}
                </option>
              ))}
            </select>
          ) : (
            <span className="detail-value">{translateCodeLabel(t, origin?.procurement_hospital)}</span>
          )}
        </div>
      </div>
      <ErrorBanner message={originError} />
    </section>
  );
}
