import type { Person, PersonTeam } from '../../../api';
import ErrorBanner from '../../layout/ErrorBanner';
import PersonsSection from './peopleTeams/PersonsSection';
import TeamsSection from './peopleTeams/TeamsSection';
import type { PersonUpsertPayload } from './peopleTeams/types';
import { useI18n } from '../../../i18n/i18n';

interface AdminPeopleTeamsTabProps {
  people: Person[];
  teams: PersonTeam[];
  teamMembersById: Record<number, Person[]>;
  loading: boolean;
  saving: boolean;
  error: string;
  onCreatePerson: (payload: PersonUpsertPayload) => Promise<void>;
  onUpdatePerson: (personId: number, payload: PersonUpsertPayload) => Promise<void>;
  onDeletePerson: (personId: number) => Promise<void>;
  onCreateTeam: (name: string) => Promise<void>;
  onUpdateTeamName: (teamId: number, name: string) => Promise<void>;
  onDeleteTeam: (teamId: number) => Promise<void>;
  onEnsureTeamMembersLoaded: (teamId: number) => Promise<void>;
  onSetTeamMembers: (teamId: number, memberIds: number[]) => Promise<void>;
}

export default function AdminPeopleTeamsTab({
  people,
  teams,
  teamMembersById,
  loading,
  saving,
  error,
  onCreatePerson,
  onUpdatePerson,
  onDeletePerson,
  onCreateTeam,
  onUpdateTeamName,
  onDeleteTeam,
  onEnsureTeamMembersLoaded,
  onSetTeamMembers,
}: AdminPeopleTeamsTabProps) {
  const { t } = useI18n();
  return (
    <section className="detail-section ui-panel-section">
      <div className="detail-section-heading">
        <h2>{t('app.admin.tabs.peopleTeams', 'People & Teams')}</h2>
      </div>
      {loading && <p className="status">{t('admin.peopleTeams.loading', 'Loading people and teams...')}</p>}
      {error && <ErrorBanner message={error} />}
      {!loading && (
        <>
          <PersonsSection
            people={people}
            saving={saving}
            onCreatePerson={onCreatePerson}
            onUpdatePerson={onUpdatePerson}
            onDeletePerson={onDeletePerson}
          />
          <TeamsSection
            teams={teams}
            teamMembersById={teamMembersById}
            saving={saving}
            onCreateTeam={onCreateTeam}
            onUpdateTeamName={onUpdateTeamName}
            onDeleteTeam={onDeleteTeam}
            onEnsureTeamMembersLoaded={onEnsureTeamMembersLoaded}
            onSetTeamMembers={onSetTeamMembers}
          />
        </>
      )}
    </section>
  );
}
