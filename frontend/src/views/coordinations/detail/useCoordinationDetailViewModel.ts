import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  api,
  type AppUser,
  type Code,
  type Coordination,
  type CoordinationCompletionState,
  type CoordinationDonor,
  type CoordinationEpisode,
  type CoordinationOrigin,
  type CoordinationProcurementFlex,
  type CoordinationTimeLog,
  type Patient,
} from '../../../api';
import { toUserErrorMessage } from '../../../api/error';

export type CoordinationDetailTab = 'coordination' | 'protocol' | 'time-log' | 'completion';

interface TimeLogDraft {
  user_id: number;
  start: string;
  end: string;
  comment: string;
}

const toInputDateTime = (value: string | null): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const sec = String(date.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${min}:${sec}`;
};

const toIsoOrNull = (value: string): string | null => (value ? new Date(value).toISOString() : null);

export function useCoordinationDetailViewModel(
  coordinationId: number,
  initialTab: CoordinationDetailTab = 'coordination',
) {
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<CoordinationDetailTab>(initialTab);
  const [coordination, setCoordination] = useState<Coordination | null>(null);
  const [donor, setDonor] = useState<CoordinationDonor | null>(null);
  const [origin, setOrigin] = useState<CoordinationOrigin | null>(null);
  const [timeLogs, setTimeLogs] = useState<CoordinationTimeLog[]>([]);
  const [coordinationEpisodes, setCoordinationEpisodes] = useState<CoordinationEpisode[]>([]);
  const [procurementFlex, setProcurementFlex] = useState<CoordinationProcurementFlex | null>(null);
  const [completionState, setCompletionState] = useState<CoordinationCompletionState | null>(null);
  const [patientsById, setPatientsById] = useState<Record<number, Patient>>({});
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [deathKinds, setDeathKinds] = useState<Code[]>([]);
  const [sexCodes, setSexCodes] = useState<Code[]>([]);
  const [organCodes, setOrganCodes] = useState<Code[]>([]);
  const [bloodTypes, setBloodTypes] = useState<Code[]>([]);
  const [diagnosisDonorOptions, setDiagnosisDonorOptions] = useState<Code[]>([]);
  const [hospitals, setHospitals] = useState<Code[]>([]);
  const [error, setError] = useState('');

  const [activeClockLog, setActiveClockLog] = useState<CoordinationTimeLog | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [stopDraftOpen, setStopDraftOpen] = useState(false);
  const [stopComment, setStopComment] = useState('');

  const [addingLog, setAddingLog] = useState(false);
  const [editingLogId, setEditingLogId] = useState<number | null>(null);
  const [logDraft, setLogDraft] = useState<TimeLogDraft>({
    user_id: 0,
    start: '',
    end: '',
    comment: '',
  });
  const [logError, setLogError] = useState('');

  const loadPatientsByEpisodes = useCallback(async (episodes: CoordinationEpisode[]) => {
    const patientIds = [...new Set(
      episodes
        .map((item) => item.episode?.patient_id)
        .filter((id): id is number => typeof id === 'number'),
    )];
    const patientEntries = await Promise.all(
      patientIds.map(async (id) => {
        try {
          const patient = await api.getPatient(id);
          return [id, patient] as const;
        } catch {
          return null;
        }
      }),
    );
    const byId: Record<number, Patient> = {};
    for (const entry of patientEntries) {
      if (!entry) continue;
      byId[entry[0]] = entry[1];
    }
    setPatientsById(byId);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const mePromise = api.getMe();
      const usersPromise = api.listUsers();
      const deathKindsPromise = api.listCodes('DEATH_KIND');
      const sexCodesPromise = api.listCodes('SEX');
      const organCodesPromise = api.listCodes('ORGAN');
      const bloodTypesPromise = api.listCodes('BLOOD_TYPE');
      const diagnosisDonorPromise = api.listCodes('DIAGNOSIS_DONOR');
      const hospitalsPromise = api.listCatalogues('HOSPITAL');
      const coordinationPromise = api.getCoordination(coordinationId);
      const timeLogsPromise = api.listCoordinationTimeLogs(coordinationId);
      const clockStatePromise = api.getCoordinationClockState(coordinationId);
      const coordinationEpisodesPromise = api.listCoordinationEpisodes(coordinationId);
      const procurementFlexPromise = api.getCoordinationProcurementFlex(coordinationId);
      const completionPromise = api.getCoordinationCompletion(coordinationId);
      const [
        me,
        userList,
        deathKindCodes,
        sexCodeValues,
        organCodeValues,
        bloodTypeValues,
        diagnosisDonorValues,
        hospitalCatalogues,
        coordinationData,
        logs,
        clockState,
        coordinationEpisodeItems,
        loadedProcurementFlex,
        loadedCompletionState,
      ] = await Promise.all([
        mePromise,
        usersPromise,
        deathKindsPromise,
        sexCodesPromise,
        organCodesPromise,
        bloodTypesPromise,
        diagnosisDonorPromise,
        hospitalsPromise,
        coordinationPromise,
        timeLogsPromise,
        clockStatePromise,
        coordinationEpisodesPromise,
        procurementFlexPromise,
        completionPromise,
      ]);
      setCurrentUser(me);
      setUsers(userList);
      setDeathKinds(deathKindCodes);
      setSexCodes(sexCodeValues);
      setOrganCodes(organCodeValues);
      setBloodTypes(bloodTypeValues);
      setDiagnosisDonorOptions(diagnosisDonorValues);
      setHospitals(hospitalCatalogues);
      setCoordination(coordinationData);
      setTimeLogs(logs);
      setActiveClockLog(clockState.active_time_log);
      setCoordinationEpisodes(coordinationEpisodeItems);
      setProcurementFlex(loadedProcurementFlex);
      setCompletionState(loadedCompletionState);
      await loadPatientsByEpisodes(coordinationEpisodeItems);
      try {
        setDonor(await api.getCoordinationDonor(coordinationId));
      } catch {
        setDonor(null);
      }
      try {
        setOrigin(await api.getCoordinationOrigin(coordinationId));
      } catch {
        setOrigin(null);
      }
    } catch (err) {
      setError(toUserErrorMessage(err, 'Failed to load coordination'));
    } finally {
      setLoading(false);
    }
  }, [coordinationId, loadPatientsByEpisodes]);

  const refreshAssignments = useCallback(async () => {
    try {
      const [coordinationEpisodeItems, loadedProcurementFlex] = await Promise.all([
        api.listCoordinationEpisodes(coordinationId),
        api.getCoordinationProcurementFlex(coordinationId),
      ]);
      setCoordinationEpisodes(coordinationEpisodeItems);
      setProcurementFlex(loadedProcurementFlex);
      await loadPatientsByEpisodes(coordinationEpisodeItems);
    } catch (err) {
      setError(toUserErrorMessage(err, 'Failed to refresh coordination assignments'));
    }
  }, [coordinationId, loadPatientsByEpisodes]);

  const refreshCompletion = useCallback(async () => {
    try {
      const nextCompletionState = await api.getCoordinationCompletion(coordinationId);
      setCompletionState(nextCompletionState);
      setCoordination((prev) => (
        prev
          ? {
            ...prev,
            completion_confirmed: nextCompletionState.completion_confirmed,
            completion_comment: nextCompletionState.completion_comment,
            completion_confirmed_at: nextCompletionState.completion_confirmed_at,
            completion_confirmed_by_id: nextCompletionState.completion_confirmed_by_id,
            completion_confirmed_by_user: nextCompletionState.completion_confirmed_by_user,
          }
          : prev
      ));
    } catch (err) {
      setError(toUserErrorMessage(err, 'Failed to load completion data'));
    }
  }, [coordinationId]);

  const confirmCompletion = useCallback(async (comment: string) => {
    const nextCompletionState = await api.confirmCoordinationCompletion(coordinationId, comment);
    setCompletionState(nextCompletionState);
    setCoordination((prev) => (
      prev
        ? {
          ...prev,
          completion_confirmed: nextCompletionState.completion_confirmed,
          completion_comment: nextCompletionState.completion_comment,
          completion_confirmed_at: nextCompletionState.completion_confirmed_at,
          completion_confirmed_by_id: nextCompletionState.completion_confirmed_by_id,
          completion_confirmed_by_user: nextCompletionState.completion_confirmed_by_user,
        }
        : prev
    ));
  }, [coordinationId]);

  const refreshClockState = useCallback(async () => {
    try {
      const state = await api.getCoordinationClockState(coordinationId);
      setActiveClockLog(state.active_time_log);
    } catch {
      // keep current state if polling fails
    }
  }, [coordinationId]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    setTab(initialTab);
  }, [coordinationId, initialTab]);

  useEffect(() => {
    if (!activeClockLog) return undefined;
    const id = window.setInterval(() => {
      void refreshClockState();
    }, 5000);
    return () => window.clearInterval(id);
  }, [activeClockLog, refreshClockState]);

  useEffect(() => {
    if (!activeClockLog?.start || activeClockLog.coordination_id !== coordinationId) {
      setElapsedSec(0);
      return;
    }
    const runningStart = new Date(activeClockLog.start);
    if (Number.isNaN(runningStart.getTime())) {
      setElapsedSec(0);
      return;
    }
    const id = window.setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - runningStart.getTime()) / 1000));
    }, 250);
    return () => window.clearInterval(id);
  }, [activeClockLog?.coordination_id, activeClockLog?.start, coordinationId]);

  const sortedLogs = useMemo(
    () =>
      [...timeLogs].sort((a, b) => {
        const aStart = a.start ?? '';
        const bStart = b.start ?? '';
        return bStart.localeCompare(aStart);
      }),
    [timeLogs],
  );

  const isClockRunningHere = activeClockLog?.coordination_id === coordinationId;

  const startClock = async () => {
    if (isClockRunningHere) return;
    try {
      const state = await api.startCoordinationClock(coordinationId);
      setActiveClockLog(state.active_time_log);
      setStopComment('');
      setTimeLogs(await api.listCoordinationTimeLogs(coordinationId));
    } catch (err) {
      setLogError(toUserErrorMessage(err, 'Failed to save time log'));
    }
  };

  const requestStopClock = () => {
    if (!isClockRunningHere) return;
    setStopDraftOpen(true);
  };

  const cancelStopClock = () => {
    setStopDraftOpen(false);
    setStopComment('');
  };

  const saveStoppedClock = async () => {
    if (!isClockRunningHere) return;
    try {
      const state = await api.stopCoordinationClock(coordinationId, stopComment.trim());
      setActiveClockLog(state.active_time_log);
      setStopDraftOpen(false);
      setStopComment('');
      setTimeLogs(await api.listCoordinationTimeLogs(coordinationId));
    } catch (err) {
      setLogError(toUserErrorMessage(err, 'Failed to save time log'));
    }
  };

  const saveCoordination = async (patch: Partial<Coordination>) => {
    if (!coordination) return;
    const updated = await api.updateCoordination(coordination.id, {
      start: patch.start ?? coordination.start,
      end: patch.end ?? coordination.end,
      status_id: patch.status_id ?? coordination.status_id,
      donor_nr: patch.donor_nr ?? coordination.donor_nr,
      swtpl_nr: patch.swtpl_nr ?? coordination.swtpl_nr,
      national_coordinator: patch.national_coordinator ?? coordination.national_coordinator,
      comment: patch.comment ?? coordination.comment,
    });
    setCoordination(updated);
  };

  const saveDonor = async (patch: Partial<CoordinationDonor>) => {
    const saved = await api.upsertCoordinationDonor(coordinationId, {
      full_name: patch.full_name ?? donor?.full_name ?? '',
      birth_date: patch.birth_date ?? donor?.birth_date ?? null,
      death_kind_id: patch.death_kind_id ?? donor?.death_kind_id ?? null,
      sex_id: patch.sex_id ?? donor?.sex_id ?? null,
      blood_type_id: patch.blood_type_id ?? donor?.blood_type_id ?? null,
      height: patch.height ?? donor?.height ?? null,
      weight: patch.weight ?? donor?.weight ?? null,
      organ_fo: patch.organ_fo ?? donor?.organ_fo ?? '',
      diagnosis_id: patch.diagnosis_id ?? donor?.diagnosis_id ?? null,
    });
    setDonor(saved);
  };

  const saveOrigin = async (patch: Partial<CoordinationOrigin>) => {
    const saved = await api.upsertCoordinationOrigin(coordinationId, {
      detection_hospital_id: patch.detection_hospital_id ?? origin?.detection_hospital_id ?? null,
      procurement_hospital_id: patch.procurement_hospital_id ?? origin?.procurement_hospital_id ?? null,
    });
    setOrigin(saved);
  };

  const openAddLog = () => {
    if (isClockRunningHere) {
      setLogError('Stop the running clock before adding a new time log.');
      return;
    }
    setLogError('');
    setAddingLog(true);
    setEditingLogId(null);
    setLogDraft({
      user_id: currentUser?.id ?? users[0]?.id ?? 0,
      start: '',
      end: '',
      comment: '',
    });
  };

  const openEditLog = (row: CoordinationTimeLog) => {
    setLogError('');
    setAddingLog(false);
    setEditingLogId(row.id);
    setLogDraft({
      user_id: row.user_id,
      start: toInputDateTime(row.start),
      end: toInputDateTime(row.end),
      comment: row.comment ?? '',
    });
  };

  const closeLogEditor = () => {
    setAddingLog(false);
    setEditingLogId(null);
    setLogError('');
  };

  const validateNoOverlap = (
    candidateStart: string | null,
    candidateEnd: string | null,
    userId: number,
    excludeId?: number,
  ) => {
    if (!candidateStart || !candidateEnd) {
      return 'Start and end are required.';
    }
    const start = new Date(candidateStart).getTime();
    const end = new Date(candidateEnd).getTime();
    if (Number.isNaN(start) || Number.isNaN(end) || start >= end) {
      return 'Start must be before end.';
    }
    if (activeClockLog?.start && isClockRunningHere) {
      const runningStartMs = new Date(activeClockLog.start).getTime();
      if (end > runningStartMs) {
        return 'End must not be after the start of the running clock.';
      }
    }
    const overlaps = sortedLogs.some((log) => {
      if (excludeId && log.id === excludeId) return false;
      if (log.user_id !== userId) return false;
      if (!log.start || !log.end) return false;
      const s = new Date(log.start).getTime();
      const e = new Date(log.end).getTime();
      return s < end && e > start;
    });
    return overlaps ? 'Interval overlaps another time log.' : '';
  };

  const saveLogDraft = async () => {
    if (addingLog && isClockRunningHere) {
      setLogError('Stop the running clock before adding a new time log.');
      return;
    }
    const startIso = toIsoOrNull(logDraft.start);
    const endIso = toIsoOrNull(logDraft.end);
    const validationError = validateNoOverlap(startIso, endIso, logDraft.user_id, editingLogId ?? undefined);
    if (validationError) {
      setLogError(validationError);
      return;
    }
    try {
      if (addingLog) {
        await api.createCoordinationTimeLog(coordinationId, {
          user_id: logDraft.user_id,
          start: startIso,
          end: endIso,
          comment: logDraft.comment.trim(),
        });
      } else if (editingLogId) {
        await api.updateCoordinationTimeLog(coordinationId, editingLogId, {
          user_id: logDraft.user_id,
          start: startIso,
          end: endIso,
          comment: logDraft.comment.trim(),
        });
      }
      setTimeLogs(await api.listCoordinationTimeLogs(coordinationId));
      closeLogEditor();
    } catch (err) {
      setLogError(toUserErrorMessage(err, 'Failed to save time log'));
    }
  };

  const deleteLog = async (id: number) => {
    await api.deleteCoordinationTimeLog(coordinationId, id);
    setTimeLogs(await api.listCoordinationTimeLogs(coordinationId));
  };

  return {
    loading,
    error,
    tab,
    setTab,
    coordination,
    donor,
    setDonor,
    origin,
    setOrigin,
    coordinationEpisodes,
    procurementFlex,
    completionState,
    patientsById,
    deathKinds,
    sexCodes,
    organCodes,
    bloodTypes,
    diagnosisDonorOptions,
    hospitals,
    users,
    currentUser,
    runningStart: isClockRunningHere && activeClockLog?.start ? new Date(activeClockLog.start) : null,
    elapsedSec,
    stopDraftOpen,
    stopComment,
    setStopComment,
    startClock,
    requestStopClock,
    cancelStopClock,
    saveStoppedClock,
    sortedLogs,
    addingLog,
    editingLogId,
    logDraft,
    setLogDraft,
    logError,
    openAddLog,
    openEditLog,
    closeLogEditor,
    saveLogDraft,
    deleteLog,
    saveCoordination,
    saveDonor,
    saveOrigin,
    refresh: loadAll,
    refreshAssignments,
    refreshCompletion,
    confirmCompletion,
  };
}
