import { useEffect, useMemo, useState } from 'react';

import {
  api,
  type Code,
  type LivingDonationDonor,
  type LivingDonationEpisode,
  type LivingDonationPatientRef,
  type LivingDonationRecipientEpisodeRef,
} from '../../api';
import { toUserErrorMessage } from '../../api/error';

const DONOR_TRANSITIONS: Record<string, string[]> = {
  REGISTERED: ['IN_EVALUATION', 'DEFERRED', 'REJECTED'],
  IN_EVALUATION: ['ACTIVE', 'DEFERRED', 'REJECTED'],
  ACTIVE: ['TRANSPLANTED'],
  DEFERRED: ['IN_EVALUATION', 'ACTIVE'],
  TRANSPLANTED: ['CLOSED'],
  REJECTED: ['CLOSED'],
  CLOSED: [],
};

function includesText(value: string, search: string): boolean {
  return value.toLowerCase().includes(search.toLowerCase());
}

export function useDonorsViewModel(t: (key: string, englishDefault: string) => string) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rows, setRows] = useState<LivingDonationEpisode[]>([]);
  const [filterAny, setFilterAny] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [recipientOptions, setRecipientOptions] = useState<LivingDonationRecipientEpisodeRef[]>([]);
  const [patients, setPatients] = useState<LivingDonationPatientRef[]>([]);
  const [organCodes, setOrganCodes] = useState<Code[]>([]);
  const [relationCodes, setRelationCodes] = useState<Code[]>([]);
  const [statusCodes, setStatusCodes] = useState<Code[]>([]);

  const [addingProcess, setAddingProcess] = useState(false);
  const [savingProcess, setSavingProcess] = useState(false);
  const [processError, setProcessError] = useState('');
  const [donorError, setDonorError] = useState('');
  const [closeDateInput, setCloseDateInput] = useState(() => new Date().toISOString().slice(0, 10));

  const [editForm, setEditForm] = useState({
    recipient_episode_id: '',
    organ_ids: [] as number[],
    start: '',
    comment: '',
  });
  const [createForm, setCreateForm] = useState({
    recipient_episode_id: '',
    organ_ids: [] as number[],
    start: '',
    comment: '',
  });
  const [newDonorForm, setNewDonorForm] = useState({
    donor_patient_id: '',
    relation_id: '',
    status_id: '',
    comment: '',
  });

  const loadAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [
        livingDonations,
        recipientEpisodes,
        patientRows,
        organs,
        relations,
        statuses,
      ] = await Promise.all([
        api.listLivingDonations(),
        api.listLivingDonationRecipientEpisodes(),
        api.listPatients(),
        api.listCodes('ORGAN'),
        api.listCodes('LTPL_DONOR_RELATION'),
        api.listCodes('LTPL_DONOR_STATUS'),
      ]);
      setRows(livingDonations);
      setRecipientOptions(recipientEpisodes);
      setPatients(
        patientRows.map((patient) => ({
          id: patient.id,
          pid: patient.pid,
          first_name: patient.first_name,
          name: patient.name,
        })),
      );
      setOrganCodes(organs.filter((entry) => entry.key === 'KIDNEY' || entry.key === 'LIVER'));
      setRelationCodes(relations);
      setStatusCodes(statuses);
      if (livingDonations.length > 0 && selectedId === null) {
        setSelectedId(livingDonations[0].id);
      }
    } catch (err) {
      setError(toUserErrorMessage(err, t('donors.errors.load', 'Could not load living donation data.')));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredRows = useMemo(() => {
    const query = filterAny.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) => {
      const recipient = row.recipient_episode?.patient
        ? `${row.recipient_episode.patient.first_name} ${row.recipient_episode.patient.name} ${row.recipient_episode.patient.pid}`
        : '';
      const organLabel = row.organs.map((entry) => entry.name_default).join(' ');
      const donorText = row.donors
        .map((donor) => `${donor.donor_patient?.first_name ?? ''} ${donor.donor_patient?.name ?? ''} ${donor.donor_patient?.pid ?? ''} ${donor.status?.name_default ?? ''}`)
        .join(' ');
      return includesText(`${recipient} ${organLabel} ${donorText}`, query);
    });
  }, [filterAny, rows]);

  const selected = useMemo(
    () => rows.find((row) => row.id === selectedId) ?? null,
    [rows, selectedId],
  );

  useEffect(() => {
    if (!selected) return;
    setEditForm({
      recipient_episode_id: selected.recipient_episode_id ? String(selected.recipient_episode_id) : '',
      organ_ids: selected.organ_ids ?? [],
      start: selected.start ?? '',
      comment: selected.comment ?? '',
    });
    setCloseDateInput(new Date().toISOString().slice(0, 10));
    setProcessError('');
    setDonorError('');
  }, [selected]);

  const refreshRows = async (preferSelectedId?: number | null) => {
    const data = await api.listLivingDonations();
    setRows(data);
    const candidateId = preferSelectedId ?? selectedId;
    if (candidateId !== null && data.some((entry) => entry.id === candidateId)) {
      setSelectedId(candidateId);
      return;
    }
    setSelectedId(data[0]?.id ?? null);
  };

  const toggleOrgan = (organId: number, mode: 'create' | 'edit') => {
    const current = mode === 'create' ? createForm.organ_ids : editForm.organ_ids;
    const next = current.includes(organId)
      ? current.filter((entry) => entry !== organId)
      : [...current, organId];
    if (mode === 'create') {
      setCreateForm((prev) => ({ ...prev, organ_ids: next }));
      return;
    }
    setEditForm((prev) => ({ ...prev, organ_ids: next }));
  };

  const createProcess = async () => {
    setSavingProcess(true);
    setProcessError('');
    try {
      const created = await api.createLivingDonation({
        recipient_episode_id: createForm.recipient_episode_id ? Number(createForm.recipient_episode_id) : null,
        organ_ids: createForm.organ_ids,
        start: createForm.start || null,
        comment: createForm.comment,
      });
      setAddingProcess(false);
      setCreateForm({ recipient_episode_id: '', organ_ids: [], start: '', comment: '' });
      await refreshRows(created.id);
    } catch (err) {
      setProcessError(toUserErrorMessage(err, t('donors.errors.createProcess', 'Could not create living donation process.')));
    } finally {
      setSavingProcess(false);
    }
  };

  const saveOverview = async () => {
    if (!selected) return;
    setSavingProcess(true);
    setProcessError('');
    try {
      await api.updateLivingDonation(selected.id, {
        recipient_episode_id: editForm.recipient_episode_id ? Number(editForm.recipient_episode_id) : null,
        organ_ids: editForm.organ_ids,
        start: editForm.start || null,
        comment: editForm.comment,
      });
      await refreshRows(selected.id);
    } catch (err) {
      setProcessError(toUserErrorMessage(err, t('donors.errors.saveOverview', 'Could not save living donation overview.')));
    } finally {
      setSavingProcess(false);
    }
  };

  const closeProcess = async () => {
    if (!selected || !closeDateInput) return;
    setSavingProcess(true);
    setProcessError('');
    try {
      await api.closeLivingDonation(selected.id, closeDateInput);
      await refreshRows(selected.id);
    } catch (err) {
      setProcessError(toUserErrorMessage(err, t('donors.errors.closeProcess', 'Could not close living donation process.')));
    } finally {
      setSavingProcess(false);
    }
  };

  const addDonor = async () => {
    if (!selected || !newDonorForm.donor_patient_id) return;
    setSavingProcess(true);
    setDonorError('');
    try {
      await api.addLivingDonationDonor(selected.id, {
        donor_patient_id: Number(newDonorForm.donor_patient_id),
        relation_id: newDonorForm.relation_id ? Number(newDonorForm.relation_id) : null,
        status_id: newDonorForm.status_id ? Number(newDonorForm.status_id) : null,
        comment: newDonorForm.comment,
      });
      setNewDonorForm({ donor_patient_id: '', relation_id: '', status_id: '', comment: '' });
      await refreshRows(selected.id);
    } catch (err) {
      setDonorError(toUserErrorMessage(err, t('donors.errors.addDonor', 'Could not add donor to process.')));
    } finally {
      setSavingProcess(false);
    }
  };

  const updateDonor = async (
    donor: LivingDonationDonor,
    payload: { relation_id?: number | null; status_id?: number | null; comment?: string },
  ) => {
    if (!selected) return;
    setSavingProcess(true);
    setDonorError('');
    try {
      await api.updateLivingDonationDonor(selected.id, donor.id, payload);
      await refreshRows(selected.id);
    } catch (err) {
      setDonorError(toUserErrorMessage(err, t('donors.errors.saveDonor', 'Could not update donor in process.')));
    } finally {
      setSavingProcess(false);
    }
  };

  const statusOptionsForDonor = (donor: LivingDonationDonor): Code[] => {
    const currentKey = donor.status?.key ?? '';
    const allowedNext = new Set(DONOR_TRANSITIONS[currentKey] ?? []);
    return statusCodes.filter((status) => status.id === donor.status_id || allowedNext.has(status.key));
  };

  return {
    loading,
    error,
    rows: filteredRows,
    selected,
    selectedId,
    setSelectedId,
    filterAny,
    setFilterAny,
    recipientOptions,
    patients,
    organCodes,
    relationCodes,
    statusCodes,
    addingProcess,
    setAddingProcess,
    savingProcess,
    processError,
    donorError,
    createForm,
    setCreateForm,
    editForm,
    setEditForm,
    newDonorForm,
    setNewDonorForm,
    closeDateInput,
    setCloseDateInput,
    toggleOrgan,
    createProcess,
    saveOverview,
    closeProcess,
    addDonor,
    updateDonor,
    statusOptionsForDonor,
    reload: loadAll,
  };
}
