import { useEffect, useState } from 'react';

import { api, type Person, type PersonTeam } from '../../../api';
import { toUserErrorMessage } from '../../../api/error';

export function useAdminPeopleTeams() {
  const [people, setPeople] = useState<Person[]>([]);
  const [teams, setTeams] = useState<PersonTeam[]>([]);
  const [teamMembersById, setTeamMembersById] = useState<Record<number, Person[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadPeopleAndTeams = async () => {
    setLoading(true);
    setError('');
    try {
      const [peopleRows, teamRows] = await Promise.all([
        api.listAdminPeople(),
        api.listPersonTeams(false),
      ]);
      setPeople(peopleRows);
      setTeams(teamRows);
    } catch (err) {
      setError(toUserErrorMessage(err, 'Could not load people and teams.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPeopleAndTeams();
  }, []);

  const createPerson = async (payload: { first_name: string; surname: string; user_id?: string | null }) => {
    if (!payload.first_name.trim() || !payload.surname.trim()) return;
    setSaving(true);
    setError('');
    try {
      await api.createAdminPerson({
        first_name: payload.first_name.trim(),
        surname: payload.surname.trim(),
        user_id: payload.user_id?.trim() || null,
      });
      await loadPeopleAndTeams();
    } catch (err) {
      setError(toUserErrorMessage(err, 'Could not create person.'));
    } finally {
      setSaving(false);
    }
  };

  const updatePerson = async (personId: number, payload: { first_name: string; surname: string; user_id?: string | null }) => {
    if (!payload.first_name.trim() || !payload.surname.trim()) return;
    setSaving(true);
    setError('');
    try {
      await api.updateAdminPerson(personId, {
        first_name: payload.first_name.trim(),
        surname: payload.surname.trim(),
        user_id: payload.user_id?.trim() || null,
      });
      await loadPeopleAndTeams();
    } catch (err) {
      setError(toUserErrorMessage(err, 'Could not update person.'));
    } finally {
      setSaving(false);
    }
  };

  const deletePerson = async (personId: number) => {
    setSaving(true);
    setError('');
    try {
      await api.deleteAdminPerson(personId);
      await loadPeopleAndTeams();
    } catch (err) {
      setError(toUserErrorMessage(err, 'Could not delete person.'));
    } finally {
      setSaving(false);
    }
  };

  const createTeam = async (name: string) => {
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    try {
      await api.createPersonTeam(name.trim(), []);
      await loadPeopleAndTeams();
    } catch (err) {
      setError(toUserErrorMessage(err, 'Could not create team.'));
    } finally {
      setSaving(false);
    }
  };

  const updateTeamName = async (teamId: number, name: string) => {
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    try {
      await api.updatePersonTeam(teamId, name.trim());
      await loadPeopleAndTeams();
    } catch (err) {
      setError(toUserErrorMessage(err, 'Could not update team name.'));
    } finally {
      setSaving(false);
    }
  };

  const deleteTeam = async (teamId: number) => {
    setSaving(true);
    setError('');
    try {
      await api.deletePersonTeam(teamId);
      setTeamMembersById((prev) => {
        const next = { ...prev };
        delete next[teamId];
        return next;
      });
      await loadPeopleAndTeams();
    } catch (err) {
      setError(toUserErrorMessage(err, 'Could not delete team.'));
    } finally {
      setSaving(false);
    }
  };

  const ensureTeamMembersLoaded = async (teamId: number) => {
    if (teamMembersById[teamId]) return;
    setSaving(true);
    setError('');
    try {
      const team = await api.getPersonTeam(teamId);
      setTeamMembersById((prev) => ({ ...prev, [teamId]: team.members ?? [] }));
    } catch (err) {
      setError(toUserErrorMessage(err, 'Could not load team members.'));
    } finally {
      setSaving(false);
    }
  };

  const setTeamMembers = async (teamId: number, memberIds: number[]) => {
    setSaving(true);
    setError('');
    try {
      const updated = await api.setPersonTeamMembers(teamId, memberIds);
      setTeamMembersById((prev) => ({ ...prev, [teamId]: updated.members ?? [] }));
      await loadPeopleAndTeams();
    } catch (err) {
      setError(toUserErrorMessage(err, 'Could not update team members.'));
    } finally {
      setSaving(false);
    }
  };

  return {
    people,
    teams,
    teamMembersById,
    loading,
    saving,
    error,
    createPerson,
    updatePerson,
    deletePerson,
    createTeam,
    updateTeamName,
    deleteTeam,
    ensureTeamMembersLoaded,
    setTeamMembers,
    refresh: loadPeopleAndTeams,
  };
}
