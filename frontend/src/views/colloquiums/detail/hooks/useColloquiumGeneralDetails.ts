import { useEffect, useMemo, useState } from 'react';
import { api, type Colloqium, type Person } from '../../../../api';
import { toUserErrorMessage } from '../../../../api/error';
import type { ColloquiumDetailTab } from '../colloquiumDetailViewModelTypes';

const formatParticipants = (people: Person[]) =>
  people
    .map((person) => `${person.first_name} ${person.surname}`.trim())
    .filter((name) => name.length > 0)
    .join(', ');

export function useColloquiumGeneralDetails(
  colloqiumId: number,
  initialTab: ColloquiumDetailTab = 'colloquium',
) {
  const [colloqium, setColloqium] = useState<Colloqium | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<ColloquiumDetailTab>('colloquium');
  const [draftName, setDraftName] = useState('');
  const [draftDate, setDraftDate] = useState('');
  const [draftParticipants, setDraftParticipants] = useState('');
  const [draftParticipantsPeople, setDraftParticipantsPeople] = useState<Person[]>([]);
  const [draftSignatoriesPeople, setDraftSignatoriesPeople] = useState<Person[]>([]);
  const [generalEditing, setGeneralEditing] = useState(false);
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [completingColloqium, setCompletingColloqium] = useState(false);
  const [generalSaveError, setGeneralSaveError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const all = await api.listColloqiums();
        const selected = all.find((item) => item.id === colloqiumId) ?? null;
        const selectedPeople = selected?.participants_people ?? [];
        setColloqium(selected);
        setDraftName(selected?.colloqium_type?.name ?? '');
        setDraftDate(selected?.date ?? '');
        setDraftParticipants(selected?.participants ?? formatParticipants(selectedPeople));
        setDraftParticipantsPeople(selectedPeople);
        setDraftSignatoriesPeople(selected?.signatories_people ?? []);
        setGeneralEditing(false);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [colloqiumId]);

  useEffect(() => {
    setTab(initialTab);
  }, [colloqiumId, initialTab]);

  const isGeneralDirty = Boolean(
    colloqium
      && (
        draftName !== (colloqium.colloqium_type?.name ?? '')
        || JSON.stringify(draftParticipantsPeople.map((person) => person.id)) !== JSON.stringify((colloqium.participant_ids ?? []))
        || JSON.stringify(draftSignatoriesPeople.map((person) => person.id)) !== JSON.stringify((colloqium.signatory_ids ?? []))
        || (draftDate || '') !== (colloqium.date ?? '')
      ),
  );

  const saveGeneralDetails = async () => {
    if (!colloqium || savingGeneral || !isGeneralDirty) return;
    setSavingGeneral(true);
    setGeneralSaveError('');
    try {
      let nextColloqium = colloqium;
      if (colloqium.colloqium_type && draftName !== (colloqium.colloqium_type.name ?? '')) {
        const updatedType = await api.updateColloqiumType(colloqium.colloqium_type.id, { name: draftName });
        nextColloqium = {
          ...nextColloqium,
          colloqium_type: { ...(nextColloqium.colloqium_type ?? updatedType), ...updatedType },
        };
      }
      const colloqiumPayload: { date?: string; participant_ids?: number[]; signatory_ids?: number[] } = {};
      if (JSON.stringify(draftParticipantsPeople.map((person) => person.id)) !== JSON.stringify((colloqium.participant_ids ?? []))) {
        colloqiumPayload.participant_ids = draftParticipantsPeople.map((person) => person.id);
      }
      if (JSON.stringify(draftSignatoriesPeople.map((person) => person.id)) !== JSON.stringify((colloqium.signatory_ids ?? []))) {
        colloqiumPayload.signatory_ids = draftSignatoriesPeople.map((person) => person.id);
      }
      if ((draftDate || '') !== (colloqium.date ?? '')) {
        colloqiumPayload.date = draftDate;
      }
      if (Object.keys(colloqiumPayload).length > 0) {
        const updatedColloqium = await api.updateColloqium(colloqium.id, colloqiumPayload);
        nextColloqium = {
          ...nextColloqium,
          ...updatedColloqium,
          colloqium_type: nextColloqium.colloqium_type ?? updatedColloqium.colloqium_type,
        };
      }
      setColloqium(nextColloqium);
      const refreshedPeople = nextColloqium.participants_people ?? [];
      setDraftParticipants(nextColloqium.participants ?? formatParticipants(refreshedPeople));
      setDraftParticipantsPeople(refreshedPeople);
      setDraftSignatoriesPeople(nextColloqium.signatories_people ?? []);
      setGeneralEditing(false);
    } catch (error) {
      setGeneralSaveError(toUserErrorMessage(error, 'Could not save colloquium details.'));
    } finally {
      setSavingGeneral(false);
    }
  };

  const completeColloqium = async () => {
    if (!colloqium || colloqium.completed || completingColloqium) return;
    setCompletingColloqium(true);
    setGeneralSaveError('');
    try {
      const updated = await api.updateColloqium(colloqium.id, {
        completed: true,
        signatory_ids: draftSignatoriesPeople.map((person) => person.id),
      });
      setColloqium((prev) => (prev ? { ...prev, ...updated } : updated));
      setTab('colloquium');
    } catch (error) {
      setGeneralSaveError(toUserErrorMessage(error, 'Could not complete colloquium.'));
    } finally {
      setCompletingColloqium(false);
    }
  };

  const startGeneralEditing = () => {
    setGeneralSaveError('');
    setGeneralEditing(true);
  };

  const cancelGeneralEditing = () => {
    if (!colloqium) return;
    setDraftName(colloqium.colloqium_type?.name ?? '');
    setDraftDate(colloqium.date ?? '');
    const colloqiumPeople = colloqium.participants_people ?? [];
    setDraftParticipants(colloqium.participants ?? formatParticipants(colloqiumPeople));
    setDraftParticipantsPeople(colloqiumPeople);
    setDraftSignatoriesPeople(colloqium.signatories_people ?? []);
    setGeneralSaveError('');
    setGeneralEditing(false);
  };

  useEffect(() => {
    setDraftParticipants(formatParticipants(draftParticipantsPeople));
  }, [draftParticipantsPeople]);

  const syncDraftFromPayload = useMemo(() => ({
    setDraftName,
    setDraftDate,
    setDraftParticipants,
    setDraftParticipantsPeople,
  }), []);

  return {
    colloqium,
    loading,
    tab,
    setTab,
    draftName,
    setDraftName,
    draftDate,
    setDraftDate,
    draftParticipants,
    setDraftParticipants,
    draftParticipantsPeople,
    setDraftParticipantsPeople,
    draftSignatoriesPeople,
    setDraftSignatoriesPeople,
    generalEditing,
    savingGeneral,
    completingColloqium,
    generalSaveError,
    isGeneralDirty,
    saveGeneralDetails,
    completeColloqium,
    startGeneralEditing,
    cancelGeneralEditing,
    syncDraftFromPayload,
  };
}
