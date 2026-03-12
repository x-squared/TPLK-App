import type { PreferencesGeneralModel } from '../types';
import { useI18n } from '../../../i18n/i18n';

interface PreferencesGeneralSectionProps {
  model: PreferencesGeneralModel;
}

export default function PreferencesGeneralSection({ model }: PreferencesGeneralSectionProps) {
  const { t } = useI18n();
  return (
    <div className="detail-grid">
      <label className="detail-field">
        <span className="detail-label">{t('app.preferences.fields.language', 'Language')}</span>
        <select
          className="detail-input"
          disabled={!model.editing || model.saving}
          value={model.locale}
          onChange={(e) => model.setLocale(e.target.value === 'de' ? 'de' : 'en')}
        >
          <option value="en">{t('app.preferences.fields.languageEn', 'English')}</option>
          <option value="de">{t('app.preferences.fields.languageDe', 'Deutsch')}</option>
        </select>
      </label>
      <label className="detail-field">
        <span className="detail-label">{t('app.preferences.fields.startView', 'Start View')}</span>
        <select
          className="detail-input"
          disabled={!model.editing || model.saving}
          value={model.startPage}
          onChange={(e) => model.setStartPage(e.target.value as typeof model.startPage)}
        >
          {model.startPageOptions.map((option) => (
            <option key={option.key} value={option.key}>
              {t(option.labelKey, option.englishDefault)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
