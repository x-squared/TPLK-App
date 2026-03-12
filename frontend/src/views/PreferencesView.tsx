import type { PreferencesViewProps } from './preferences/types';
import { usePreferencesViewModel } from './preferences/hooks/usePreferencesViewModel';
import PreferencesGeneralSection from './preferences/sections/PreferencesGeneralSection';
import EditableSectionHeader from './layout/EditableSectionHeader';
import { useI18n } from '../i18n/i18n';
import './preferences/PreferencesView.css';

export default function PreferencesView({
  initialPreferences,
  startPageOptions,
  onSavePreferences,
}: PreferencesViewProps) {
  const { t } = useI18n();
  const model = usePreferencesViewModel({
    initialPreferences,
    startPageOptions,
    onSavePreferences,
  });

  return (
    <>
      <header className="patients-header">
        <h1>{t('app.preferences.title', 'User Preferences')}</h1>
      </header>
      <section className="detail-section ui-panel-section">
        <EditableSectionHeader
          title={t('app.preferences.sections.general', 'General')}
          editing={model.general.editing}
          saving={model.general.saving}
          dirty={model.general.dirty}
          onEdit={model.general.onEdit}
          onSave={() => {
            void model.general.onSave();
          }}
          onCancel={model.general.onCancel}
          editLabel={t('actions.edit', 'Edit')}
          saveLabel={t('actions.save', 'Save')}
          savingLabel={t('app.preferences.actions.saving', 'Saving...')}
        />
        <PreferencesGeneralSection model={model.general} />
        {model.actions.saveError ? <p className="login-error">{model.actions.saveError}</p> : null}
        {model.actions.saveSuccess ? <p className="status">{model.actions.saveSuccess}</p> : null}
      </section>
    </>
  );
}
