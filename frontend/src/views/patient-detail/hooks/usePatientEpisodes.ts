import { useEffect, useState } from 'react';
import { api, type Code, type EpisodeCreate, type EpisodeUpdate, type Patient } from '../../../api';

export function usePatientEpisodes(patientId: number, patient: Patient | null, refreshPatient: () => Promise<void>) {
  const [organCodes, setOrganCodes] = useState<Code[]>([]);
  const [tplStatusCodes, setTplStatusCodes] = useState<Code[]>([]);
  const [addingEpisode, setAddingEpisode] = useState(false);
  const [epSaving, setEpSaving] = useState(false);
  const [epForm, setEpForm] = useState<EpisodeCreate>({ organ_id: 0 });
  const [confirmDeleteEpId, setConfirmDeleteEpId] = useState<number | null>(null);
  const [editingEpId, setEditingEpId] = useState<number | null>(null);
  const [epEditForm, setEpEditForm] = useState<EpisodeUpdate>({});

  useEffect(() => {
    api.listCodes('ORGAN').then((codes) => {
      setOrganCodes(codes);
      if (codes.length > 0) setEpForm((f) => ({ ...f, organ_id: codes[0].id }));
    });
    api.listCodes('TPL_STATUS').then(setTplStatusCodes);
  }, [patientId]);

  const handleAddEpisode = async () => {
    if (!patient || !epForm.organ_id) return;
    setEpSaving(true);
    try {
      await api.createEpisode(patient.id, epForm);
      await refreshPatient();
      setEpForm({ organ_id: organCodes[0]?.id ?? 0 });
      setAddingEpisode(false);
    } finally {
      setEpSaving(false);
    }
  };

  const handleDeleteEpisode = async (id: number) => {
    if (!patient) return;
    await api.deleteEpisode(patient.id, id);
    setConfirmDeleteEpId(null);
    await refreshPatient();
  };

  const startEditingEp = (ep: {
    id: number;
    organ_id: number;
    start: string | null;
    end: string | null;
    fall_nr: string;
    status_id: number | null;
    closed: boolean;
    tpl_date: string | null;
    comment: string;
    cave: string;
    fup_recipient_card_done: boolean;
    fup_recipient_card_date: string | null;
  }) => {
    setEditingEpId(ep.id);
    setEpEditForm({
      organ_id: ep.organ_id,
      start: ep.start,
      end: ep.end,
      fall_nr: ep.fall_nr,
      status_id: ep.status_id,
      closed: ep.closed,
      tpl_date: ep.tpl_date,
      comment: ep.comment,
      cave: ep.cave,
      fup_recipient_card_done: ep.fup_recipient_card_done,
      fup_recipient_card_date: ep.fup_recipient_card_date,
    });
    setConfirmDeleteEpId(null);
  };

  const cancelEditingEp = () => {
    setEditingEpId(null);
  };

  const handleSaveEp = async () => {
    if (!patient || editingEpId === null) return;
    if (epEditForm.closed && !epEditForm.end) return;
    setEpSaving(true);
    try {
      await api.updateEpisode(patient.id, editingEpId, epEditForm);
      setEditingEpId(null);
      await refreshPatient();
    } finally {
      setEpSaving(false);
    }
  };

  return {
    organCodes,
    tplStatusCodes,
    addingEpisode,
    setAddingEpisode,
    epSaving,
    epForm,
    setEpForm,
    confirmDeleteEpId,
    setConfirmDeleteEpId,
    editingEpId,
    epEditForm,
    setEpEditForm,
    handleAddEpisode,
    handleDeleteEpisode,
    startEditingEp,
    cancelEditingEp,
    handleSaveEp,
  };
}
