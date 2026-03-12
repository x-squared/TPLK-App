import type React from 'react';
import type { Code, CoordinationDonor } from '../../../api';
import { translateCodeLabel } from '../../../i18n/codeTranslations';
import { useI18n } from '../../../i18n/i18n';
import EditableSectionHeader from '../../layout/EditableSectionHeader';
import ErrorBanner from '../../layout/ErrorBanner';
import { formatDateDdMmYyyy } from '../../layout/dateFormat';

interface DonorDraft {
  full_name: string;
  birth_date: string;
  sex_id: number | null;
  blood_type_id: number | null;
  height: number | null;
  weight: number | null;
  organ_fo: string;
  diagnosis_id: number | null;
  death_kind_id: number;
}

interface Props {
  donor: CoordinationDonor | null;
  donorDraft: DonorDraft;
  setDonorDraft: React.Dispatch<React.SetStateAction<DonorDraft>>;
  donorEditing: boolean;
  donorSaving: boolean;
  donorDirty: boolean;
  donorError: string;
  deathKinds: Code[];
  sexCodes: Code[];
  bloodTypes: Code[];
  diagnosisDonorOptions: Code[];
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
}

export default function CoordinationDonorDataSection({
  donor,
  donorDraft,
  setDonorDraft,
  donorEditing,
  donorSaving,
  donorDirty,
  donorError,
  deathKinds,
  sexCodes,
  bloodTypes,
  diagnosisDonorOptions,
  onEdit,
  onSave,
  onCancel,
}: Props) {
  const { t } = useI18n();
  return (
    <section className="detail-section ui-panel-section">
      <EditableSectionHeader
        title={t('coordinations.donorData.title', 'Donor data')}
        editing={donorEditing}
        saving={donorSaving}
        dirty={donorDirty}
        onEdit={onEdit}
        onSave={onSave}
        onCancel={onCancel}
      />
      <div className="detail-grid">
        <div className="detail-field">
          <span className="detail-label">{t('coordinations.donorData.fullName', 'Full name')}</span>
          {donorEditing ? (
            <input
              className="detail-input"
              value={donorDraft.full_name}
              onChange={(e) => setDonorDraft((prev) => ({ ...prev, full_name: e.target.value }))}
            />
          ) : (
            <span className="detail-value">{donor?.full_name || t('common.emptySymbol', '–')}</span>
          )}
        </div>
        <div className="detail-field">
          <span className="detail-label">{t('coordinations.table.dateOfBirth', 'Date of Birth')}</span>
          {donorEditing ? (
            <input
              className="detail-input"
              type="date"
              value={donorDraft.birth_date}
              onChange={(e) => setDonorDraft((prev) => ({ ...prev, birth_date: e.target.value }))}
            />
          ) : (
            <span className="detail-value">{formatDateDdMmYyyy(donor?.birth_date)}</span>
          )}
        </div>
        <div className="detail-field">
          <span className="detail-label">{t('coordinations.table.reasonOfDeath', 'Reason of Death')}</span>
          {donorEditing ? (
            <select
              className="detail-input"
              value={donorDraft.death_kind_id || ''}
              onChange={(e) =>
                setDonorDraft((prev) => ({ ...prev, death_kind_id: e.target.value ? Number(e.target.value) : 0 }))
              }
            >
              <option value="">{t('common.emptySymbol', '–')}</option>
              {deathKinds.map((kind) => (
                <option key={kind.id} value={kind.id}>
                  {translateCodeLabel(t, kind)}
                </option>
              ))}
            </select>
          ) : (
            <span className="detail-value">{translateCodeLabel(t, donor?.death_kind)}</span>
          )}
        </div>
        <div className="detail-field">
          <span className="detail-label">{t('coordinations.donorData.sex', 'Sex')}</span>
          {donorEditing ? (
            <select
              className="detail-input"
              value={donorDraft.sex_id ?? ''}
              onChange={(e) =>
                setDonorDraft((prev) => ({ ...prev, sex_id: e.target.value ? Number(e.target.value) : null }))
              }
            >
              <option value="">{t('common.emptySymbol', '–')}</option>
              {sexCodes.map((sex) => (
                <option key={sex.id} value={sex.id}>
                  {translateCodeLabel(t, sex)}
                </option>
              ))}
            </select>
          ) : (
            <span className="detail-value">{translateCodeLabel(t, sexCodes.find((s) => s.id === donor?.sex_id))}</span>
          )}
        </div>
        <div className="detail-field">
          <span className="detail-label">{t('coordinations.donorData.bloodType', 'Blood type')}</span>
          {donorEditing ? (
            <select
              className="detail-input"
              value={donorDraft.blood_type_id ?? ''}
              onChange={(e) =>
                setDonorDraft((prev) => ({ ...prev, blood_type_id: e.target.value ? Number(e.target.value) : null }))
              }
            >
              <option value="">{t('common.emptySymbol', '–')}</option>
              {bloodTypes.map((bt) => (
                <option key={bt.id} value={bt.id}>
                  {translateCodeLabel(t, bt)}
                </option>
              ))}
            </select>
          ) : (
            <span className="detail-value">{translateCodeLabel(t, bloodTypes.find((bt) => bt.id === donor?.blood_type_id))}</span>
          )}
        </div>
        <div className="detail-field">
          <span className="detail-label">{t('coordinations.donorData.heightCm', 'Height (cm)')}</span>
          {donorEditing ? (
            <input
              className="detail-input"
              type="number"
              value={donorDraft.height ?? ''}
              onChange={(e) =>
                setDonorDraft((prev) => ({ ...prev, height: e.target.value ? Number(e.target.value) : null }))
              }
            />
          ) : (
            <span className="detail-value">{donor?.height ?? t('common.emptySymbol', '–')}</span>
          )}
        </div>
        <div className="detail-field">
          <span className="detail-label">{t('coordinations.donorData.weightKg', 'Weight (kg)')}</span>
          {donorEditing ? (
            <input
              className="detail-input"
              type="number"
              value={donorDraft.weight ?? ''}
              onChange={(e) =>
                setDonorDraft((prev) => ({ ...prev, weight: e.target.value ? Number(e.target.value) : null }))
              }
            />
          ) : (
            <span className="detail-value">{donor?.weight ?? t('common.emptySymbol', '–')}</span>
          )}
        </div>
        <div className="detail-field">
          <span className="detail-label">{t('coordinations.donorData.organFo', 'Organ FO')}</span>
          {donorEditing ? (
            <input
              className="detail-input"
              value={donorDraft.organ_fo}
              onChange={(e) => setDonorDraft((prev) => ({ ...prev, organ_fo: e.target.value }))}
            />
          ) : (
            <span className="detail-value">{donor?.organ_fo || t('common.emptySymbol', '–')}</span>
          )}
        </div>
        <div className="detail-field">
          <span className="detail-label">{t('coordinations.donorData.diagnosis', 'Diagnosis')}</span>
          {donorEditing ? (
            <select
              className="detail-input"
              value={donorDraft.diagnosis_id ?? ''}
              onChange={(e) =>
                setDonorDraft((prev) => ({ ...prev, diagnosis_id: e.target.value ? Number(e.target.value) : null }))
              }
            >
              <option value="">{t('common.emptySymbol', '–')}</option>
              {diagnosisDonorOptions.map((diag) => (
                <option key={diag.id} value={diag.id}>
                  {translateCodeLabel(t, diag)}
                </option>
              ))}
            </select>
          ) : (
            <span className="detail-value">
              {translateCodeLabel(t, diagnosisDonorOptions.find((diag) => diag.id === donor?.diagnosis_id))}
            </span>
          )}
        </div>
      </div>
      <ErrorBanner message={donorError} />
    </section>
  );
}
