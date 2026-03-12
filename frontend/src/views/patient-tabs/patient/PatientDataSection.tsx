import type { Patient } from '../../../api';
import { translateCodeLabel } from '../../../i18n/codeTranslations';
import { useI18n } from '../../../i18n/i18n';
import type { PatientCoreModel } from '../../patient-detail/PatientDetailTabs';
import EditableSectionHeader from '../../layout/EditableSectionHeader';

type PatientDataSectionProps = {
  patient: Patient;
  formatDate: (iso: string | null) => string;
} & Pick<
  PatientCoreModel,
  | 'editing'
  | 'startEditing'
  | 'saving'
  | 'handleSave'
  | 'cancelEditing'
  | 'form'
  | 'setForm'
  | 'setField'
  | 'languages'
  | 'sexCodes'
  | 'coordUsers'
>;

export default function PatientDataSection({
  patient,
  editing,
  startEditing,
  saving,
  handleSave,
  cancelEditing,
  form,
  setForm,
  setField,
  formatDate,
  languages,
  sexCodes,
  coordUsers,
}: PatientDataSectionProps) {
  const { t } = useI18n();
  return (
    <section className="detail-section">
      <EditableSectionHeader
        title={t('patients.section.basicData', 'Basic data')}
        editing={editing}
        saving={saving}
        onEdit={startEditing}
        onSave={handleSave}
        onCancel={cancelEditing}
      />
      <div className="detail-grid">
        <div className="detail-field">
          <span className="detail-label">{t('patients.filters.pid', 'PID')}</span>
          {editing ? (
            <input className="detail-input" value={form.pid} onChange={(e) => setField('pid', e.target.value)} />
          ) : (
            <span className="detail-value">{patient.pid}</span>
          )}
        </div>
        <div className="detail-field">
          <span className="detail-label">{t('patients.table.lastName', 'Last Name')}</span>
          {editing ? (
            <input className="detail-input" value={form.name} onChange={(e) => setField('name', e.target.value)} />
          ) : (
            <span className="detail-value">{patient.name}</span>
          )}
        </div>
        <div className="detail-field">
          <span className="detail-label">{t('patients.table.firstName', 'First Name')}</span>
          {editing ? (
            <input className="detail-input" value={form.first_name} onChange={(e) => setField('first_name', e.target.value)} />
          ) : (
            <span className="detail-value">{patient.first_name}</span>
          )}
        </div>
        <div className="detail-field">
          <span className="detail-label">{t('patients.table.dateOfBirth', 'Date of Birth')}</span>
          {editing ? (
            <input className="detail-input" type="date" value={form.date_of_birth} onChange={(e) => setField('date_of_birth', e.target.value)} />
          ) : (
            <span className="detail-value">{formatDate(patient.date_of_birth)}</span>
          )}
        </div>
        <div className="detail-field">
          <span className="detail-label">{t('patient.basicData.dateOfDeath', 'Date of Death')}</span>
          {editing ? (
            <input className="detail-input" type="date" value={form.date_of_death} onChange={(e) => setField('date_of_death', e.target.value)} />
          ) : (
            <span className="detail-value">{formatDate(patient.date_of_death)}</span>
          )}
        </div>
        <div className="detail-field">
          <span className="detail-label">{t('patients.table.ahvNr', 'AHV Nr.')}</span>
          {editing ? (
            <input className="detail-input" value={form.ahv_nr} onChange={(e) => setField('ahv_nr', e.target.value)} />
          ) : (
            <span className="detail-value">{patient.ahv_nr || t('common.emptySymbol', '–')}</span>
          )}
        </div>
        <div className="detail-field">
          <span className="detail-label">{t('patients.table.language', 'Language')}</span>
          {editing ? (
            languages.length > 0 && !languages.some((l) => l.name_default === form.lang) && form.lang !== '' ? (
              <div className="lang-custom-row">
                <input
                  className="detail-input"
                  value={form.lang}
                  onChange={(e) => setField('lang', e.target.value)}
                  placeholder={t('patient.basicData.enterLanguage', 'Enter language...')}
                />
                <button
                  type="button"
                  className="lang-switch-btn"
                  onClick={() => setField('lang', languages[0]?.name_default ?? '')}
                  title={t('patient.basicData.pickFromList', 'Pick from list')}
                >▼</button>
              </div>
            ) : (
              <div className="lang-custom-row">
                <select
                  className="detail-input"
                  value={form.lang}
                  onChange={(e) => {
                    if (e.target.value === '__other__') {
                      setField('lang', '');
                    } else {
                      setField('lang', e.target.value);
                    }
                  }}
                >
                  <option value="">{t('common.emptySymbol', '–')}</option>
                  {languages.map((l: any) => (
                    <option key={l.id} value={l.name_default}>{l.name_default}</option>
                  ))}
                  <option value="__other__">{t('patient.basicData.other', 'Other...')}</option>
                </select>
              </div>
            )
          ) : (
            <span className="detail-value">{patient.lang || t('common.emptySymbol', '–')}</span>
          )}
        </div>
        <div className="detail-field">
          <span className="detail-label">{t('coordinations.donorData.sex', 'Sex')}</span>
          {editing ? (
            <select
              className="detail-input"
              value={form.sex_id ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, sex_id: e.target.value ? Number(e.target.value) : null }))}
            >
              <option value="">{t('common.emptySymbol', '–')}</option>
              {sexCodes.map((sex) => (
                <option key={sex.id} value={sex.id}>{translateCodeLabel(t, sex)}</option>
              ))}
            </select>
          ) : (
            <span className="detail-value">{translateCodeLabel(t, patient.sex)}</span>
          )}
        </div>
        <div className="detail-field">
          <span className="detail-label">{t('patient.basicData.responsibleCoordinator', 'Responsible Coordinator')}</span>
          {editing ? (
            <select
              className="detail-input"
              value={form.resp_coord_id ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, resp_coord_id: e.target.value ? Number(e.target.value) : null }))}
            >
              <option value="">{t('common.emptySymbol', '–')}</option>
              {coordUsers.map((u: any) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          ) : (
            <span className="detail-value">{patient.resp_coord?.name ?? t('common.emptySymbol', '–')}</span>
          )}
        </div>
        <div className="detail-field">
          <span className="detail-label">{t('patient.basicData.translate', 'Translate')}</span>
          {editing ? (
            <label className="detail-checkbox">
              <input type="checkbox" checked={form.translate} onChange={(e) => setField('translate', e.target.checked)} />
              {t('common.yes', 'Yes')}
            </label>
          ) : (
            <span className="detail-value">{patient.translate ? t('common.yes', 'Yes') : t('common.no', 'No')}</span>
          )}
        </div>
      </div>
    </section>
  );
}
