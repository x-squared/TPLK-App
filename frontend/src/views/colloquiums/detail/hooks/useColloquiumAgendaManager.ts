import { useEffect, useMemo, useState } from 'react';
import { api, type Code, type ColloqiumAgenda, type Patient, type PatientListItem } from '../../../../api';
import { toUserErrorMessage } from '../../../../api/error';
import { translateCodeLabel } from '../../../../i18n/codeTranslations';
import { useI18n } from '../../../../i18n/i18n';
import { formatEpisodeDisplayName, formatEpisodeStatusReference } from '../../../layout/episodeDisplay';
import type { AgendaDraft } from '../../tabs/protocol/ColloquiumProtocolTab';
import type { AgendaEditForm, EpisodeChoice, EpisodePreview, PickerRow } from '../colloquiumDetailViewModelTypes';

export function useColloquiumAgendaManager(colloqiumId: number, organId: number | null | undefined) {
  const { t } = useI18n();
  const [agendas, setAgendas] = useState<ColloqiumAgenda[]>([]);
  const [loadingAgendas, setLoadingAgendas] = useState(true);
  const [agendaDrafts, setAgendaDrafts] = useState<Record<number, AgendaDraft>>({});
  const [editingAgendaId, setEditingAgendaId] = useState<number | null>(null);
  const [agendaSaving, setAgendaSaving] = useState(false);
  const [agendaDeletingId, setAgendaDeletingId] = useState<number | null>(null);
  const [agendaSaveError, setAgendaSaveError] = useState('');
  const [decisionOptions, setDecisionOptions] = useState<Code[]>([]);
  const [agendaForm, setAgendaForm] = useState<AgendaEditForm>({
    episode_id: null,
    episode_ids: [],
    presented_by_id: null,
    decision: '',
    decision_reason: '',
    comment: '',
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerRows, setPickerRows] = useState<PickerRow[]>([]);
  const [patientsById, setPatientsById] = useState<Record<number, PatientListItem>>({});

  useEffect(() => {
    let isActive = true;
    const loadPatients = async () => {
      const items = await api.listPatients();
      if (!isActive) return;
      const next: Record<number, PatientListItem> = {};
      items.forEach((item) => {
        next[item.id] = item;
      });
      setPatientsById(next);
    };
    void loadPatients();
    return () => {
      isActive = false;
    };
  }, [colloqiumId]);

  useEffect(() => {
    const loadAgendas = async () => {
      setLoadingAgendas(true);
      try {
        const items = await api.listColloqiumAgendas({ colloqiumId });
        setAgendas(items);
      } finally {
        setLoadingAgendas(false);
      }
    };
    void loadAgendas();
  }, [colloqiumId]);

  const reloadAgendas = async () => {
    setLoadingAgendas(true);
    try {
      const items = await api.listColloqiumAgendas({ colloqiumId });
      setAgendas(items);
    } finally {
      setLoadingAgendas(false);
    }
  };

  useEffect(() => {
    let isActive = true;
    const loadDecisionOptions = async () => {
      const options = await api.listCodes('COLLOQUIUM_DECISION');
      if (!isActive) return;
      setDecisionOptions(options);
    };
    void loadDecisionOptions();
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    const next: Record<number, AgendaDraft> = {};
    agendas.forEach((agenda) => {
      next[agenda.id] = {
        presented_by_id: agenda.presented_by_id ?? null,
        decision: agenda.decision ?? '',
        decision_reason: agenda.decision_reason ?? '',
        comment: agenda.comment ?? '',
      };
    });
    setAgendaDrafts((prev) => ({ ...next, ...prev }));
  }, [agendas]);

  useEffect(() => {
    if (agendas.length === 0) return;
    const timeoutId = window.setTimeout(async () => {
      try {
        for (const agenda of agendas) {
          const draft = agendaDrafts[agenda.id];
          if (!draft) continue;
          const isDecisionReasonInvalid = Boolean(draft.decision?.trim()) && !draft.decision_reason?.trim();
          if (isDecisionReasonInvalid) continue;
          const payload: Partial<AgendaDraft> = {};
          if ((draft.presented_by_id ?? null) !== (agenda.presented_by_id ?? null)) payload.presented_by_id = draft.presented_by_id ?? null;
          if (draft.decision !== (agenda.decision ?? '')) payload.decision = draft.decision;
          if (draft.decision_reason !== (agenda.decision_reason ?? '')) payload.decision_reason = draft.decision_reason;
          if (draft.comment !== (agenda.comment ?? '')) payload.comment = draft.comment;
          if (Object.keys(payload).length === 0) continue;
          const updated = await api.updateColloqiumAgenda(agenda.id, payload);
          setAgendas((prev) => prev.map((item) => (item.id === agenda.id ? { ...item, ...updated } : item)));
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes('API 404')) {
          await reloadAgendas();
        }
      }
    }, 700);

    return () => window.clearTimeout(timeoutId);
  }, [agendas, agendaDrafts]);

  const episodePreviewById = useMemo(() => {
    const map: Record<number, EpisodePreview> = {};
    agendas.forEach((agenda) => {
      const episode = agenda.episode;
      if (!episode) return;
      const patient = patientsById[episode.patient_id];
      map[episode.id] = {
        episodeId: episode.id,
        patientName: patient?.name ?? '–',
        patientFirstName: patient?.first_name ?? '–',
        patientPid: patient?.pid ?? '–',
        fallNr: episode.fall_nr || `#${episode.id}`,
        organName: translateCodeLabel(t, episode.organ),
        statusName: translateCodeLabel(t, episode.status),
        phaseName: translateCodeLabel(t, episode.phase),
        statusReference: formatEpisodeStatusReference({
          phaseLabel: translateCodeLabel(t, episode.phase),
          processInfo: '(-)',
          emptySymbol: t('common.emptySymbol', '–'),
        }),
        start: episode.start,
        end: episode.end,
      };
    });
    pickerRows.forEach((row) => {
      row.episodes.forEach((episode) => {
        map[episode.episodeId] = {
          episodeId: episode.episodeId,
          patientName: episode.patientName,
          patientFirstName: episode.patientFirstName,
          patientPid: episode.patientPid,
          fallNr: episode.fallNr || `#${episode.episodeId}`,
          organName: episode.organName,
          statusName: episode.statusName,
          phaseName: episode.phaseName,
          statusReference: episode.statusReference,
          start: episode.start,
          end: episode.end,
        };
      });
    });
    return map;
  }, [agendas, patientsById, pickerRows, t]);

  const selectedEpisodePreviews = useMemo(() => {
    const ids = agendaForm.episode_ids.length > 0
      ? agendaForm.episode_ids
      : (agendaForm.episode_id ? [agendaForm.episode_id] : []);
    return ids
      .map((id) => episodePreviewById[id])
      .filter((item): item is EpisodePreview => Boolean(item));
  }, [agendaForm.episode_id, agendaForm.episode_ids, episodePreviewById]);

  const selectedEpisodeLabel = (() => {
    if (agendaForm.episode_ids.length > 1) return `${agendaForm.episode_ids.length} episodes selected`;
    if (!agendaForm.episode_id) return 'Select episode';
    const preview = episodePreviewById[agendaForm.episode_id];
    if (!preview) return `Episode #${agendaForm.episode_id}`;
    return formatEpisodeDisplayName({
      patientName: `${preview.patientFirstName} ${preview.patientName}`.trim(),
      organName: preview.organName,
      startDate: preview.start,
    });
  })();

  const pickerNonSelectableEpisodeIds = useMemo(() => {
    const currentEditedAgenda = editingAgendaId && editingAgendaId > 0
      ? agendas.find((agenda) => agenda.id === editingAgendaId)
      : null;
    const currentEditedEpisodeId = currentEditedAgenda?.episode_id ?? null;
    return agendas
      .map((agenda) => agenda.episode_id)
      .filter((episodeId) => episodeId !== currentEditedEpisodeId);
  }, [agendas, editingAgendaId]);

  const startAddAgenda = () => {
    setAgendaSaveError('');
    setEditingAgendaId(0);
    setAgendaForm({ episode_id: null, episode_ids: [], presented_by_id: null, decision: '', decision_reason: '', comment: '' });
  };

  const startEditAgenda = (agenda: ColloqiumAgenda) => {
    setAgendaSaveError('');
    setEditingAgendaId(agenda.id);
    setAgendaForm({
      episode_id: agenda.episode_id,
      episode_ids: [agenda.episode_id],
      presented_by_id: agenda.presented_by_id ?? null,
      decision: agenda.decision ?? '',
      decision_reason: agenda.decision_reason ?? '',
      comment: agenda.comment ?? '',
    });
  };

  const cancelEditAgenda = () => {
    setAgendaSaveError('');
    setEditingAgendaId(null);
    setAgendaForm({ episode_id: null, episode_ids: [], presented_by_id: null, decision: '', decision_reason: '', comment: '' });
    setPickerOpen(false);
  };

  const saveAgenda = async () => {
    if (editingAgendaId === null) return;
    if (agendaForm.decision.trim() && !agendaForm.decision_reason.trim()) {
      return;
    }
    const existingEpisodeIds = new Set(
      agendas
        .filter((agenda) => editingAgendaId === 0 || agenda.id !== editingAgendaId)
        .map((agenda) => agenda.episode_id),
    );
    const selectedEpisodeIds = agendaForm.episode_ids.length > 0
      ? [...new Set(agendaForm.episode_ids)]
      : (agendaForm.episode_id ? [agendaForm.episode_id] : []);
    setAgendaSaving(true);
    setAgendaSaveError('');
    try {
      if (editingAgendaId === 0) {
        const nonDuplicateEpisodeIds = selectedEpisodeIds.filter((episodeId) => !existingEpisodeIds.has(episodeId));
        if (nonDuplicateEpisodeIds.length === 0) return;
        for (const episodeId of nonDuplicateEpisodeIds) {
          await api.createColloqiumAgenda({
            colloqium_id: colloqiumId,
            episode_id: episodeId,
            presented_by_id: agendaForm.presented_by_id,
          });
        }
      } else {
        const currentAgenda = agendas.find((agenda) => agenda.id === editingAgendaId);
        if (!currentAgenda) return;
        const desiredEpisodeId = selectedEpisodeIds[0] ?? currentAgenda.episode_id;
        const episodeChanged = desiredEpisodeId !== currentAgenda.episode_id;
        if (episodeChanged && existingEpisodeIds.has(desiredEpisodeId)) {
          return;
        }
        await api.updateColloqiumAgenda(editingAgendaId, {
          episode_id: desiredEpisodeId,
          presented_by_id: agendaForm.presented_by_id,
          decision: agendaForm.decision,
          decision_reason: agendaForm.decision_reason,
          comment: agendaForm.comment,
        });
      }
      await reloadAgendas();
      cancelEditAgenda();
    } catch (error) {
      setAgendaSaveError(
        toUserErrorMessage(
          error,
          t('colloquiums.agenda.saveError', 'Could not save agenda changes.'),
        ),
      );
    } finally {
      setAgendaSaving(false);
    }
  };

  const deleteAgenda = async (agendaId: number) => {
    setAgendaDeletingId(agendaId);
    setAgendaSaveError('');
    try {
      await api.deleteColloqiumAgenda(agendaId);
      await reloadAgendas();
    } catch (error) {
      setAgendaSaveError(
        toUserErrorMessage(
          error,
          t('colloquiums.agenda.deleteError', 'Could not delete agenda entry.'),
        ),
      );
    } finally {
      setAgendaDeletingId(null);
    }
  };

  const openEpisodePicker = async () => {
    if (!organId) return;
    setPickerOpen(true);
    setPickerLoading(true);
    try {
      const patients = await api.listPatients();
      const matchingPatients = patients.filter((p) =>
        p.open_episode_organ_ids.includes(organId),
      );

      const details: Patient[] = await Promise.all(
        matchingPatients.map((patient) => api.getPatient(patient.id)),
      );

      const rows: PickerRow[] = matchingPatients.map((patient) => {
        const detail = details.find((entry) => entry.id === patient.id);
        const episodes: EpisodeChoice[] = (detail?.episodes ?? [])
          .filter((ep) => !ep.closed && ep.organ_id === organId)
          .map((ep) => ({
            episodeId: ep.id,
            patientId: patient.id,
            patientName: patient.name,
            patientFirstName: patient.first_name,
            patientPid: patient.pid,
            fallNr: ep.fall_nr,
            organName: translateCodeLabel(t, ep.organ),
            statusName: translateCodeLabel(t, ep.status),
            phaseName: translateCodeLabel(t, ep.phase),
            statusReference: formatEpisodeStatusReference({
              phaseLabel: translateCodeLabel(t, ep.phase),
              processInfo: '(-)',
              emptySymbol: t('common.emptySymbol', '–'),
            }),
            start: ep.start,
            end: ep.end,
          }));
        return { patient, episodes };
      }).filter((row) => row.episodes.length > 0);
      setPickerRows(rows);
    } finally {
      setPickerLoading(false);
    }
  };

  return {
    agendas,
    setAgendas,
    loadingAgendas,
    agendaDrafts,
    setAgendaDrafts,
    editingAgendaId,
    agendaSaving,
    agendaDeletingId,
    agendaSaveError,
    decisionOptions,
    agendaForm,
    setAgendaForm,
    pickerOpen,
    setPickerOpen,
    pickerLoading,
    pickerRows,
    patientsById,
    selectedEpisodeLabel,
    selectedEpisodePreviews,
    pickerNonSelectableEpisodeIds,
    startAddAgenda,
    startEditAgenda,
    cancelEditAgenda,
    saveAgenda,
    deleteAgenda,
    openEpisodePicker,
  };
}
