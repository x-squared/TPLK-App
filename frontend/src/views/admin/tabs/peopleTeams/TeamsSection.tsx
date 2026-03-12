import { Fragment, useEffect, useState } from 'react';
import type { Person, PersonTeam } from '../../../../api';
import { useI18n } from '../../../../i18n/i18n';
import InlineDeleteActions from '../../../layout/InlineDeleteActions';
import PersonMultiSelect from '../../../layout/PersonMultiSelect';

interface TeamsSectionProps {
  teams: PersonTeam[];
  teamMembersById: Record<number, Person[]>;
  saving: boolean;
  onCreateTeam: (name: string) => Promise<void>;
  onUpdateTeamName: (teamId: number, name: string) => Promise<void>;
  onDeleteTeam: (teamId: number) => Promise<void>;
  onEnsureTeamMembersLoaded: (teamId: number) => Promise<void>;
  onSetTeamMembers: (teamId: number, memberIds: number[]) => Promise<void>;
}

export default function TeamsSection({
  teams,
  teamMembersById,
  saving,
  onCreateTeam,
  onUpdateTeamName,
  onDeleteTeam,
  onEnsureTeamMembersLoaded,
  onSetTeamMembers,
}: TeamsSectionProps) {
  const { t } = useI18n();
  const [addingTeam, setAddingTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [editingTeamId, setEditingTeamId] = useState<number | null>(null);
  const [editingTeamName, setEditingTeamName] = useState('');
  const [confirmDeleteTeamId, setConfirmDeleteTeamId] = useState<number | null>(null);
  const [expandedTeamId, setExpandedTeamId] = useState<number | null>(null);
  const [expandingTeamId, setExpandingTeamId] = useState<number | null>(null);
  const [teamMemberDraftById, setTeamMemberDraftById] = useState<Record<number, Person[]>>({});

  useEffect(() => {
    if (expandedTeamId == null) return;
    const members = teamMembersById[expandedTeamId];
    if (!members) return;
    setTeamMemberDraftById((prev) => (prev[expandedTeamId] ? prev : { ...prev, [expandedTeamId]: members }));
  }, [expandedTeamId, teamMembersById]);

  const saveCreate = async () => {
    await onCreateTeam(newTeamName);
    setNewTeamName('');
    setAddingTeam(false);
  };

  const startEdit = (team: PersonTeam) => {
    setEditingTeamId(team.id);
    setEditingTeamName(team.name);
  };

  const saveEdit = async () => {
    if (editingTeamId == null) return;
    await onUpdateTeamName(editingTeamId, editingTeamName);
    setEditingTeamId(null);
    setEditingTeamName('');
  };

  const toggleExpanded = async (teamId: number) => {
    if (expandedTeamId === teamId) {
      setExpandedTeamId(null);
      return;
    }
    setExpandedTeamId(teamId);
    if (!teamMembersById[teamId]) {
      setExpandingTeamId(teamId);
      await onEnsureTeamMembersLoaded(teamId);
      setExpandingTeamId(null);
    }
  };

  const saveMembers = async (teamId: number) => {
    const nextMembers = teamMemberDraftById[teamId] ?? [];
    await onSetTeamMembers(teamId, nextMembers.map((person) => person.id));
  };

  const cancelMembers = (teamId: number) => {
    setTeamMemberDraftById((prev) => ({ ...prev, [teamId]: teamMembersById[teamId] ?? [] }));
  };

  return (
    <div className="admin-people-card">
      <div className="detail-section-heading">
        <h3>{t('admin.peopleTeams.teams.title', 'Teams')}</h3>
        {!addingTeam && (
          <button className="ci-add-btn" onClick={() => setAddingTeam(true)}>
            {t('information.actions.add', '+ Add')}
          </button>
        )}
      </div>
      <div className="patients-table-wrap ui-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th className="open-col" />
              <th>{t('patients.table.name', 'Name')}</th>
              <th>{t('admin.peopleTeams.members', 'Members')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {addingTeam && (
              <tr className="ci-editing-row">
                <td className="open-col" />
                <td>
                  <input
                    className="detail-input ci-inline-input"
                    value={newTeamName}
                    onChange={(event) => setNewTeamName(event.target.value)}
                    placeholder={t('admin.peopleTeams.teamName', 'Team name')}
                  />
                </td>
                <td>0</td>
                <td className="detail-ci-actions">
                  <button
                    className="ci-save-inline"
                    onClick={() => { void saveCreate(); }}
                    disabled={saving || !newTeamName.trim()}
                  >
                    ✓
                  </button>
                  <button
                    className="ci-cancel-inline"
                    onClick={() => setAddingTeam(false)}
                    disabled={saving}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            )}
            {teams.map((team) => {
              const members = teamMembersById[team.id] ?? [];
              const memberDraft = teamMemberDraftById[team.id] ?? members;
              const membersDirty = JSON.stringify(memberDraft.map((person) => person.id))
                !== JSON.stringify(members.map((person) => person.id));

              return (
                <Fragment key={team.id}>
                  {editingTeamId === team.id ? (
                    <tr className="ci-editing-row">
                      <td className="open-col">
                        <button className="open-btn" onClick={() => { void toggleExpanded(team.id); }}>
                          {expandedTeamId === team.id ? '▾' : '▸'}
                        </button>
                      </td>
                      <td>
                        <input
                          className="detail-input ci-inline-input"
                          value={editingTeamName}
                          onChange={(event) => setEditingTeamName(event.target.value)}
                        />
                      </td>
                      <td>{members.length}</td>
                      <td className="detail-ci-actions">
                        <button
                          className="ci-save-inline"
                          onClick={() => { void saveEdit(); }}
                          disabled={saving || !editingTeamName.trim()}
                        >
                          ✓
                        </button>
                        <button
                          className="ci-cancel-inline"
                          onClick={() => setEditingTeamId(null)}
                          disabled={saving}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ) : (
                    <tr className={expandedTeamId === team.id ? 'row-expanded' : ''}>
                      <td className="open-col">
                        <button
                          className="open-btn"
                          onClick={() => { void toggleExpanded(team.id); }}
                          title={t('admin.peopleTeams.toggleMembers', 'Toggle team members')}
                        >
                          {expandedTeamId === team.id ? '▲' : '▼'}
                        </button>
                      </td>
                      <td>{team.name}</td>
                      <td>
                        <button className="link-btn" onClick={() => { void toggleExpanded(team.id); }}>
                          {members.length} {expandedTeamId === team.id ? '▲' : '▼'}
                        </button>
                      </td>
                      <td className="detail-ci-actions">
                        <InlineDeleteActions
                          confirming={confirmDeleteTeamId === team.id}
                          deleting={saving}
                          onEdit={() => startEdit(team)}
                          onRequestDelete={() => setConfirmDeleteTeamId(team.id)}
                          onConfirmDelete={() => { void onDeleteTeam(team.id); }}
                          onCancelDelete={() => setConfirmDeleteTeamId(null)}
                        />
                      </td>
                    </tr>
                  )}
                  {expandedTeamId === team.id && (
                    <tr className="contact-row">
                      <td colSpan={4}>
                        <div className="contact-section">
                          {expandingTeamId === team.id && !teamMembersById[team.id] ? (
                            <p className="contact-empty">{t('admin.peopleTeams.loadingMembers', 'Loading team members...')}</p>
                          ) : (
                            <>
                              <h4>{t('admin.peopleTeams.members', 'Members')}</h4>
                              <PersonMultiSelect
                                selectedPeople={memberDraft}
                                onChange={(next) => {
                                  setTeamMemberDraftById((prev) => ({ ...prev, [team.id]: next }));
                                }}
                                disabled={saving}
                              />
                              <div className="patients-add-actions admin-team-member-actions">
                                <button
                                  className="patients-save-btn"
                                  onClick={() => { void saveMembers(team.id); }}
                                  disabled={saving || !membersDirty}
                                >
                                  {t('actions.save', 'Save')}
                                </button>
                                <button
                                  className="patients-cancel-btn"
                                  onClick={() => cancelMembers(team.id)}
                                  disabled={saving || !membersDirty}
                                >
                                  {t('actions.cancel', 'Cancel')}
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
