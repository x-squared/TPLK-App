import { useI18n } from '../../../i18n/i18n';

export default function AdminOverviewTab() {
  const { t } = useI18n();
  return (
    <section className="detail-section ui-panel-section">
      <header>
        <h2>{t('app.admin.tabs.overview', 'Overview')}</h2>
      </header>
      <p className="status">{t('admin.overview.intro', 'Use the tabs to manage system configuration and operational master data.')}</p>
      <div className="detail-list">
        <p><strong>{t('app.admin.tabs.overview', 'Overview')}:</strong> {t('admin.overview.tabs.overview', 'Quick orientation and guidance for all admin areas.')}</p>
        <p><strong>{t('app.admin.tabs.accessRules', 'Access Rules')}:</strong> {t('admin.overview.tabs.accessRules', 'Assign and maintain role-based permissions that control which features users can view or edit.')}</p>
        <p><strong>{t('app.admin.tabs.peopleTeams', 'People & Teams')}:</strong> {t('admin.overview.tabs.peopleTeams', 'Create and update persons and teams, maintain memberships, and keep assignment data up to date for protocol/task workflows.')}</p>
        <p><strong>{t('app.admin.tabs.catalogues', 'Catalogues')}:</strong> {t('admin.overview.tabs.catalogues', 'Review existing catalogue types and maintain localized catalogue values without creating new catalogue types.')}</p>
        <p><strong>{t('app.admin.tabs.taskTemplates', 'Task Templates')}:</strong> {t('admin.overview.tabs.taskTemplates', 'Manage protocol task group templates and task templates, including order, defaults, and activation state.')}</p>
        <p><strong>{t('app.admin.tabs.protocolConfig', 'Protocol Config')}:</strong> {t('admin.overview.tabs.protocolConfig', 'Configure procurement/protocol data structures such as grouped fields, scopes, and protocol task-group selections per organ.')}</p>
        <p><strong>{t('app.admin.tabs.scheduler', 'Scheduler')}:</strong> {t('admin.overview.tabs.scheduler', 'Monitor scheduled jobs, inspect run history, and run or pause jobs manually.')}</p>
        <p><strong>{t('app.admin.tabs.translations', 'Translations')}:</strong> {t('admin.overview.tabs.translations', 'Edit UI text translations by locale, search keys/text, and review missing translations.')}</p>
      </div>
    </section>
  );
}
