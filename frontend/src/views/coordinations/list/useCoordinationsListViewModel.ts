import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, type Code, type Coordination, type CoordinationCreate, type CoordinationDonor, type CoordinationEpisode, type PatientListItem } from '../../../api';
import { toUserErrorMessage } from '../../../api/error';

export interface CoordinationListRow {
  coordination: Coordination;
  donor: CoordinationDonor | null;
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

const emptyCreateForm: CoordinationCreate = {
  start: todayIsoDate(),
  end: null,
  donor_nr: '',
  swtpl_nr: '',
  national_coordinator: '',
  comment: '',
};

type CoordinationCreateForm = CoordinationCreate & {
  donor_full_name?: string;
  donor_birth_date?: string | null;
  donor_death_kind_id?: number | null;
};

const emptyCreateFormWithDonor: CoordinationCreateForm = {
  ...emptyCreateForm,
  donor_full_name: '',
  donor_birth_date: null,
  donor_death_kind_id: null,
};

export function useCoordinationsListViewModel() {
  const [rows, setRows] = useState<CoordinationListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [filterAny, setFilterAny] = useState('');
  const [adding, setAdding] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [form, setForm] = useState<CoordinationCreateForm>(emptyCreateFormWithDonor);
  const [deathKindCodes, setDeathKindCodes] = useState<Code[]>([]);
  const [expandedEpisodesCoordinationId, setExpandedEpisodesCoordinationId] = useState<number | null>(null);
  const [episodesByCoordinationId, setEpisodesByCoordinationId] = useState<Record<number, CoordinationEpisode[]>>({});
  const [loadingEpisodesByCoordinationId, setLoadingEpisodesByCoordinationId] = useState<Record<number, boolean>>({});
  const [loadedEpisodesByCoordinationId, setLoadedEpisodesByCoordinationId] = useState<Record<number, boolean>>({});
  const [patientById, setPatientById] = useState<Record<number, PatientListItem>>({});

  const loadRows = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [coordinations, patients] = await Promise.all([
        api.listCoordinations(),
        api.listPatients(),
      ]);
      const donorEntries = await Promise.all(
        coordinations.map(async (coordination) => {
          try {
            const donor = await api.getCoordinationDonor(coordination.id);
            return { coordination, donor } as CoordinationListRow;
          } catch {
            return { coordination, donor: null } as CoordinationListRow;
          }
        }),
      );
      setRows(donorEntries);
      setPatientById(Object.fromEntries(patients.map((patient) => [patient.id, patient])));
      setExpandedEpisodesCoordinationId(null);
      setEpisodesByCoordinationId({});
      setLoadingEpisodesByCoordinationId({});
      setLoadedEpisodesByCoordinationId({});
    } catch (err) {
      setLoadError(toUserErrorMessage(err, 'Failed to load coordinations'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRows();
    api.listCodes('DEATH_KIND').then(setDeathKindCodes);
  }, [loadRows]);

  useEffect(() => {
    rows.forEach((row) => {
      const coordinationId = row.coordination.id;
      if (loadedEpisodesByCoordinationId[coordinationId]) {
        return;
      }
      if (loadingEpisodesByCoordinationId[coordinationId]) {
        return;
      }
      setLoadingEpisodesByCoordinationId((prev) => ({ ...prev, [coordinationId]: true }));
      void (async () => {
        try {
          const episodes = await api.listCoordinationEpisodes(coordinationId);
          setEpisodesByCoordinationId((prev) => ({ ...prev, [coordinationId]: episodes }));
          setLoadedEpisodesByCoordinationId((prev) => ({ ...prev, [coordinationId]: true }));
        } catch {
          // Keep "not loaded" so manual expand can retry.
        } finally {
          setLoadingEpisodesByCoordinationId((prev) => ({ ...prev, [coordinationId]: false }));
        }
      })();
    });
  }, [loadedEpisodesByCoordinationId, loadingEpisodesByCoordinationId, rows]);

  const handleCreate = useCallback(async (): Promise<number | null> => {
    const donorFullName = form.donor_full_name?.trim() ?? '';
    if (!donorFullName) {
      setCreateError('Donor name is required.');
      return null;
    }
    try {
      setCreateError('');
      setCreating(true);
      const created = await api.createCoordination({
        start: form.start ?? null,
        end: form.end ?? null,
        donor_nr: form.donor_nr?.trim() ?? '',
        swtpl_nr: form.swtpl_nr?.trim() ?? '',
        national_coordinator: form.national_coordinator?.trim() ?? '',
        comment: form.comment?.trim() ?? '',
      });
      await api.upsertCoordinationDonor(created.id, {
        full_name: donorFullName,
        birth_date: form.donor_birth_date || null,
        death_kind_id: form.donor_death_kind_id ?? null,
      });
      setAdding(false);
      setForm(emptyCreateFormWithDonor);
      await loadRows();
      return created.id;
    } catch (err) {
      setCreateError(toUserErrorMessage(err, 'Failed to create coordination'));
      return null;
    } finally {
      setCreating(false);
    }
  }, [form, loadRows]);

  const setFormDate = (value: string) => {
    setForm((prev) => ({ ...prev, start: value || null }));
  };

  const setDonorBirthDate = (value: string) => {
    setForm((prev) => ({ ...prev, donor_birth_date: value || null }));
  };

  const setDonorDeathKind = (value: string) => {
    setForm((prev) => ({ ...prev, donor_death_kind_id: value ? Number(value) : null }));
  };

  const setDonorFullName = (value: string) => {
    setForm((prev) => ({ ...prev, donor_full_name: value }));
  };

  const setFormField = (
    key: 'donor_nr' | 'swtpl_nr' | 'national_coordinator' | 'comment',
    value: string,
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const startDateInput = form.start ? form.start.slice(0, 10) : '';
  const donorBirthDateInput = form.donor_birth_date ? form.donor_birth_date.slice(0, 10) : '';
  const resetCreate = () => {
    setAdding(false);
    setCreateError('');
    setForm({ ...emptyCreateFormWithDonor, start: todayIsoDate() });
  };

  const sortedRows = useMemo(
    () =>
      [...rows].sort((a, b) => {
        const aDate = a.coordination.start ?? '';
        const bDate = b.coordination.start ?? '';
        return bDate.localeCompare(aDate);
      }),
    [rows],
  );

  const filteredRows = useMemo(() => {
    const query = filterAny.trim().toLowerCase();
    if (!query) return sortedRows;
    const formatIsoAsDdMmYyyy = (value: string | null | undefined): string => {
      if (!value) return '';
      const parts = value.slice(0, 10).split('-');
      if (parts.length !== 3) return value;
      const [y, m, d] = parts;
      return `${d}.${m}.${y}`;
    };
    return sortedRows.filter((row) => {
      const searchParts = [
        row.coordination.id.toString(),
        row.coordination.donor_nr,
        row.coordination.swtpl_nr,
        row.coordination.national_coordinator,
        row.coordination.comment,
        row.coordination.start ?? '',
        row.coordination.end ?? '',
        formatIsoAsDdMmYyyy(row.coordination.start),
        formatIsoAsDdMmYyyy(row.coordination.end),
        row.coordination.status?.key ?? '',
        row.coordination.status?.name_default ?? '',
        row.donor?.full_name ?? '',
        row.donor?.birth_date ?? '',
        formatIsoAsDdMmYyyy(row.donor?.birth_date),
        row.donor?.death_kind?.key ?? '',
        row.donor?.death_kind?.name_default ?? '',
      ];
      return searchParts.join(' ').toLowerCase().includes(query);
    });
  }, [filterAny, sortedRows]);

  const toggleAssignedEpisodes = useCallback(async (coordinationId: number) => {
    if (expandedEpisodesCoordinationId === coordinationId) {
      setExpandedEpisodesCoordinationId(null);
      return;
    }
    setExpandedEpisodesCoordinationId(coordinationId);
    if (loadedEpisodesByCoordinationId[coordinationId]) {
      return;
    }
    if (loadingEpisodesByCoordinationId[coordinationId]) {
      return;
    }
    setLoadingEpisodesByCoordinationId((prev) => ({ ...prev, [coordinationId]: true }));
    try {
      const episodes = await api.listCoordinationEpisodes(coordinationId);
      setEpisodesByCoordinationId((prev) => ({ ...prev, [coordinationId]: episodes }));
      setLoadedEpisodesByCoordinationId((prev) => ({ ...prev, [coordinationId]: true }));
    } catch {
      // Keep not-loaded state so user can retry by toggling again.
    } finally {
      setLoadingEpisodesByCoordinationId((prev) => ({ ...prev, [coordinationId]: false }));
    }
  }, [expandedEpisodesCoordinationId, loadedEpisodesByCoordinationId, loadingEpisodesByCoordinationId]);

  return {
    loading,
    loadError,
    rows: filteredRows,
    filterAny,
    setFilterAny,
    adding,
    setAdding,
    creating,
    createError,
    handleCreate,
    deathKindCodes,
    startDateInput,
    donorFullName: form.donor_full_name ?? '',
    donorBirthDateInput,
    form,
    setFormDate,
    setDonorFullName,
    setDonorBirthDate,
    setDonorDeathKind,
    setFormField,
    resetCreate,
    expandedEpisodesCoordinationId,
    episodesByCoordinationId,
    patientById,
    loadingEpisodesByCoordinationId,
    toggleAssignedEpisodes,
  };
}
