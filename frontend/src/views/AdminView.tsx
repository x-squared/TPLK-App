import { useEffect, useState } from 'react';

import { useAdminAccessRules } from './admin/hooks/useAdminAccessRules';
import { useAdminCatalogues } from './admin/hooks/useAdminCatalogues';
import { useAdminPeopleTeams } from './admin/hooks/useAdminPeopleTeams';
import { useAdminProcurementConfig } from './admin/hooks/useAdminProcurementConfig';
import { useAdminScheduler } from './admin/hooks/useAdminScheduler';
import { useAdminTaskTemplates } from './admin/hooks/useAdminTaskTemplates';
import AdminOverviewTab from './admin/tabs/AdminOverviewTab';
import AdminAccessRulesTab from './admin/tabs/AdminAccessRulesTab';
import AdminCataloguesTab from './admin/tabs/AdminCataloguesTab';
import AdminPeopleTeamsTab from './admin/tabs/AdminPeopleTeamsTab';
import AdminProcurementConfigTab from './admin/tabs/AdminProcurementConfigTab';
import AdminSchedulerTab from './admin/tabs/AdminSchedulerTab';
import AdminTaskTemplatesTab from './admin/tabs/AdminTaskTemplatesTab';
import AdminTranslationsTab from './admin/tabs/AdminTranslationsTab';
import { useI18n } from '../i18n/i18n';
import './AdminView.css';

type AdminTabKey = 'overview' | 'access-rules' | 'people-teams' | 'catalogues' | 'task-templates' | 'procurement-config' | 'scheduler' | 'translations';

export default function AdminView() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<AdminTabKey>('overview');
  const accessRules = useAdminAccessRules();
  const peopleTeams = useAdminPeopleTeams();
  const catalogues = useAdminCatalogues();
  const taskTemplates = useAdminTaskTemplates();
  const procurementConfig = useAdminProcurementConfig();
  const scheduler = useAdminScheduler();

  useEffect(() => {
    if (activeTab === 'procurement-config') {
      void procurementConfig.refresh();
    }
  }, [activeTab]);

  return (
    <>
      <header className="patients-header">
        <h1>{t('app.admin.title', 'Admin')}</h1>
      </header>

      <nav className="detail-tabs">
        <button
          className={`detail-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
          type="button"
        >
          {t('app.admin.tabs.overview', 'Overview')}
        </button>
        <button
          className={`detail-tab ${activeTab === 'access-rules' ? 'active' : ''}`}
          onClick={() => setActiveTab('access-rules')}
          type="button"
        >
          {t('app.admin.tabs.accessRules', 'Access Rules')}
        </button>
        <button
          className={`detail-tab ${activeTab === 'people-teams' ? 'active' : ''}`}
          onClick={() => setActiveTab('people-teams')}
          type="button"
        >
          {t('app.admin.tabs.peopleTeams', 'People & Teams')}
        </button>
        <button
          className={`detail-tab ${activeTab === 'catalogues' ? 'active' : ''}`}
          onClick={() => setActiveTab('catalogues')}
          type="button"
        >
          {t('app.admin.tabs.catalogues', 'Catalogues')}
        </button>
        <button
          className={`detail-tab ${activeTab === 'task-templates' ? 'active' : ''}`}
          onClick={() => setActiveTab('task-templates')}
          type="button"
        >
          {t('app.admin.tabs.taskTemplates', 'Task Templates')}
        </button>
        <button
          className={`detail-tab ${activeTab === 'procurement-config' ? 'active' : ''}`}
          onClick={() => setActiveTab('procurement-config')}
          type="button"
        >
          {t('app.admin.tabs.protocolConfig', 'Protocol Config')}
        </button>
        <button
          className={`detail-tab ${activeTab === 'scheduler' ? 'active' : ''}`}
          onClick={() => setActiveTab('scheduler')}
          type="button"
        >
          {t('app.admin.tabs.scheduler', 'Scheduler')}
        </button>
        <button
          className={`detail-tab ${activeTab === 'translations' ? 'active' : ''}`}
          onClick={() => setActiveTab('translations')}
          type="button"
        >
          {t('app.admin.tabs.translations', 'Translations')}
        </button>
      </nav>

      {activeTab === 'overview' && <AdminOverviewTab />}
      {activeTab === 'access-rules' && (
        <AdminAccessRulesTab
          matrix={accessRules.matrix}
          selectedRoleKey={accessRules.selectedRoleKey}
          selectedPermissionKeys={accessRules.selectedPermissionKeys}
          loading={accessRules.loading}
          saving={accessRules.saving}
          error={accessRules.error}
          status={accessRules.status}
          dirty={accessRules.dirty}
          onSelectRole={accessRules.selectRole}
          onTogglePermission={accessRules.togglePermission}
          onSave={accessRules.savePermissions}
        />
      )}
      {activeTab === 'people-teams' && (
        <AdminPeopleTeamsTab
          people={peopleTeams.people}
          teams={peopleTeams.teams}
          teamMembersById={peopleTeams.teamMembersById}
          loading={peopleTeams.loading}
          saving={peopleTeams.saving}
          error={peopleTeams.error}
          onCreatePerson={peopleTeams.createPerson}
          onUpdatePerson={peopleTeams.updatePerson}
          onDeletePerson={peopleTeams.deletePerson}
          onCreateTeam={peopleTeams.createTeam}
          onUpdateTeamName={peopleTeams.updateTeamName}
          onDeleteTeam={peopleTeams.deleteTeam}
          onEnsureTeamMembersLoaded={peopleTeams.ensureTeamMembersLoaded}
          onSetTeamMembers={peopleTeams.setTeamMembers}
        />
      )}
      {activeTab === 'catalogues' && (
        <AdminCataloguesTab
          catalogueTypes={catalogues.catalogueTypes}
          selectedType={catalogues.selectedType}
          catalogues={catalogues.catalogues}
          loading={catalogues.loading}
          saving={catalogues.saving}
          error={catalogues.error}
          onSelectType={catalogues.selectType}
          onUpdateCatalogue={catalogues.updateCatalogue}
        />
      )}
      {activeTab === 'task-templates' && (
        <AdminTaskTemplatesTab
          templates={taskTemplates.templates}
          groupTemplates={taskTemplates.groupTemplates}
          taskScopeCodes={taskTemplates.taskScopeCodes}
          organCodes={taskTemplates.organCodes}
          priorityCodes={taskTemplates.priorityCodes}
          loading={taskTemplates.loading}
          saving={taskTemplates.saving}
          error={taskTemplates.error}
          onCreateGroupTemplate={taskTemplates.createGroupTemplate}
          onUpdateGroupTemplate={taskTemplates.updateGroupTemplate}
          onReorderGroupTemplates={taskTemplates.reorderGroupTemplates}
          onCreateTemplate={taskTemplates.createTemplate}
          onUpdateTemplate={taskTemplates.updateTemplate}
          onReorderTemplates={taskTemplates.reorderTemplates}
        />
      )}
      {activeTab === 'procurement-config' && (
        <AdminProcurementConfigTab
          config={procurementConfig.config}
          loading={procurementConfig.loading}
          saving={procurementConfig.saving}
          error={procurementConfig.error}
          status={procurementConfig.status}
          scopesByFieldId={procurementConfig.scopesByFieldId}
          onCreateGroup={procurementConfig.createGroup}
          onUpdateGroup={procurementConfig.updateGroup}
          onReorderGroups={procurementConfig.reorderGroups}
          onDeleteGroup={procurementConfig.deleteGroup}
          onUpdateField={procurementConfig.updateField}
          onReorderFields={procurementConfig.reorderFields}
          onCreateScope={procurementConfig.createScope}
          onDeleteScope={procurementConfig.deleteScope}
          coordinationProtocolTaskGroupTemplates={procurementConfig.coordinationProtocolTaskGroupTemplates}
          onCreateProtocolTaskGroupSelection={procurementConfig.createProtocolTaskGroupSelection}
          onReorderProtocolTaskGroupSelections={procurementConfig.reorderProtocolTaskGroupSelections}
          onDeleteProtocolTaskGroupSelection={procurementConfig.deleteProtocolTaskGroupSelection}
        />
      )}
      {activeTab === 'scheduler' && (
        <AdminSchedulerTab
          jobs={scheduler.jobs}
          selectedJobKey={scheduler.selectedJobKey}
          onSelectJobKey={scheduler.setSelectedJobKey}
          runs={scheduler.selectedRuns}
          loading={scheduler.loading}
          saving={scheduler.saving}
          error={scheduler.error}
          statusKey={scheduler.statusKey}
          onRefresh={() => { void scheduler.refresh(); }}
          onTriggerJob={(jobKey) => { void scheduler.triggerJob(jobKey); }}
          onSetJobEnabled={(jobKey, enabled) => { void scheduler.setJobEnabled(jobKey, enabled); }}
        />
      )}
      {activeTab === 'translations' && (
        <AdminTranslationsTab />
      )}
    </>
  );
}
