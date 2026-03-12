import { useEffect, useMemo, useState } from 'react';
import { api, type Colloqium, type ColloqiumAgenda, type ColloqiumCreate, type ColloqiumType } from '../../../api';
import { toUserErrorMessage } from '../../../api/error';
import type { ColloquiumCreateFormState, ColloquiumsListRangeFilterState } from './listTypes';
import { daysBetween, todayIso } from './listUtils';

export function useColloquiumsListViewModel() {
  const [colloqiums, setColloqiums] = useState<Colloqium[]>([]);
  const [types, setTypes] = useState<ColloqiumType[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [expandedAgendaColloqiumId, setExpandedAgendaColloqiumId] = useState<number | null>(null);
  const [agendasByColloqium, setAgendasByColloqium] = useState<Record<number, ColloqiumAgenda[]>>({});
  const [loadingAgendasByColloqium, setLoadingAgendasByColloqium] = useState<Record<number, boolean>>({});
  const [typeId, setTypeId] = useState('');
  const [listFilters, setListFilters] = useState<ColloquiumsListRangeFilterState>({
    anchorDate: '',
    rangeDays: 14,
  });
  const [form, setForm] = useState<ColloquiumCreateFormState>({
    colloqium_type_id: '',
    date: todayIso(),
    participant_ids: [],
    participants_people: [],
  });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [loadedColloqiums, loadedTypes] = await Promise.all([
        api.listColloqiums(),
        api.listColloqiumTypes(),
      ]);
      setColloqiums(loadedColloqiums);
      setTypes(loadedTypes);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAll();
  }, []);

  const ensureAgendasLoaded = async (colloqiumId: number) => {
    if (agendasByColloqium[colloqiumId] || loadingAgendasByColloqium[colloqiumId]) return;
    setLoadingAgendasByColloqium((prev) => ({ ...prev, [colloqiumId]: true }));
    try {
      const agendas = await api.listColloqiumAgendas({ colloqiumId });
      setAgendasByColloqium((prev) => ({ ...prev, [colloqiumId]: agendas }));
    } finally {
      setLoadingAgendasByColloqium((prev) => ({ ...prev, [colloqiumId]: false }));
    }
  };

  const typeFiltered = useMemo(() => {
    return colloqiums.filter((item) => {
      if (!typeId) return true;
      return item.colloqium_type_id === Number(typeId);
    });
  }, [colloqiums, typeId]);

  const listFiltered = useMemo(() => {
    return typeFiltered.filter((item) => {
      if (listFilters.anchorDate) {
        if (daysBetween(item.date, listFilters.anchorDate) > listFilters.rangeDays) return false;
      }
      return true;
    });
  }, [listFilters.anchorDate, listFilters.rangeDays, typeFiltered]);

  const handleCreate = async () => {
    if (!form.colloqium_type_id || !form.date) return;
    setCreateError('');
    const typeId = Number(form.colloqium_type_id);

    const duplicate = colloqiums.some(
      (item) => item.colloqium_type_id === typeId && item.date === form.date,
    );
    if (duplicate) {
      setCreateError('A colloquium with this type and date already exists.');
      return;
    }

    const payload: ColloqiumCreate = {
      colloqium_type_id: typeId,
      date: form.date,
      participant_ids: form.participant_ids,
    };

    setCreating(true);
    try {
      await api.createColloqium(payload);
      await fetchAll();
      setAdding(false);
      setForm({ colloqium_type_id: '', date: todayIso(), participant_ids: [], participants_people: [] });
    } catch (err) {
      setCreateError(toUserErrorMessage(err, 'Could not create colloquium.'));
    } finally {
      setCreating(false);
    }
  };

  const toggleAgenda = (colloqiumId: number) => {
    setExpandedAgendaColloqiumId((prev) => (prev === colloqiumId ? null : colloqiumId));
    void ensureAgendasLoaded(colloqiumId);
  };

  return {
    loading,
    adding,
    setAdding,
    creating,
    createError,
    setCreateError,
    form,
    setForm,
    types,
    typeId,
    setTypeId,
    listFilters,
    setListFilters,
    typeFiltered,
    listFiltered,
    expandedAgendaColloqiumId,
    agendasByColloqium,
    loadingAgendasByColloqium,
    handleCreate,
    toggleAgenda,
  };
}
