import { useCallback, useEffect, useState } from 'react';
import { api, type Code, type Information } from '../../api';
import { toUserErrorMessage } from '../../api/error';
import type { InformationDraft, InformationSectionModel } from './types';
import { toCreatePayload, toUpdatePayload } from './types';

const todayIso = (): string => new Date().toISOString().slice(0, 10);
const nextWorkingDayIso = (): string => {
  const current = new Date();
  current.setDate(current.getDate() + 1);
  while (current.getDay() === 0 || current.getDay() === 6) {
    current.setDate(current.getDate() + 1);
  }
  return current.toISOString().slice(0, 10);
};
const INFORMATION_CHANGED_EVENT = 'tpl:information-changed';

const notifyInformationChanged = () => {
  window.dispatchEvent(new Event(INFORMATION_CHANGED_EVENT));
};

const emptyDraft = (authorId: number | null): InformationDraft => ({
  context_id: null,
  context_ids: [],
  area_context_id: null,
  text: '',
  author_id: authorId ?? 0,
  date: todayIso(),
  valid_from: nextWorkingDayIso(),
});

export function useInformationViewModel(): InformationSectionModel {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [rows, setRows] = useState<Information[]>([]);
  const [organContexts, setOrganContexts] = useState<Code[]>([]);
  const [areaContexts, setAreaContexts] = useState<Code[]>([]);
  const [authors, setAuthors] = useState<Array<{ id: number; name: string }>>([]);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [hideRead, setHideRead] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [currentUserIsAdmin, setCurrentUserIsAdmin] = useState(false);
  const [draft, setDraft] = useState<InformationDraft>(emptyDraft(null));

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [items, organs, areas, users, me] = await Promise.all([
        api.listInformation(),
        api.listCodes('ORGAN'),
        api.listCodes('INFORMATION_AREA'),
        api.listUsers(),
        api.getMe(),
      ]);
      setRows(items);
      setOrganContexts(organs);
      setAreaContexts(areas);
      const userOptions = users.map((user) => ({ id: user.id, name: user.name }));
      setAuthors(userOptions);
      setCurrentUserId(me.id);
      setCurrentUserIsAdmin(me.permissions.includes('view.admin'));
      setDraft((prev) => ({
        ...prev,
        author_id: prev.author_id || me.id,
      }));
    } catch (err) {
      setError(toUserErrorMessage(err, 'Failed to load information.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const startAdd = () => {
    const generalAreaId = areaContexts.find((entry) => entry.key === 'GENERAL')?.id ?? null;
    setAdding(true);
    setEditingId(null);
    setError('');
    setDraft({
      ...emptyDraft(currentUserId),
      area_context_id: generalAreaId,
      context_ids: generalAreaId != null ? [generalAreaId] : [],
      context_id: generalAreaId,
    });
  };

  const startEdit = (row: Information) => {
    setAdding(false);
    setEditingId(row.id);
    setError('');
    const allContextIds = row.context_ids?.length
      ? row.context_ids
      : (row.context_id != null ? [row.context_id] : []);
    const areaCode = (row.contexts ?? []).find((context) => context.type === 'INFORMATION_AREA');
    const hasOrganContexts = (row.contexts ?? []).some((context) => context.type === 'ORGAN');
    const inferredAreaId = areaCode?.id
      ?? (hasOrganContexts ? areaContexts.find((entry) => entry.key === 'ORGAN')?.id ?? null : areaContexts.find((entry) => entry.key === 'GENERAL')?.id ?? null);
    const contextIdsWithArea = inferredAreaId != null && !allContextIds.includes(inferredAreaId)
      ? [inferredAreaId, ...allContextIds]
      : allContextIds;
    setDraft({
      context_id: row.context_id,
      context_ids: contextIdsWithArea,
      area_context_id: inferredAreaId,
      text: row.text,
      author_id: row.author_id,
      date: row.date,
      valid_from: row.valid_from < nextWorkingDayIso() ? nextWorkingDayIso() : row.valid_from,
    });
  };

  const cancelDraft = () => {
    setAdding(false);
    setEditingId(null);
    setError('');
    setDraft(emptyDraft(currentUserId));
  };

  const saveDraft = useCallback(async () => {
    if (!draft.text.trim() || draft.text.trim().length > 1024 || !draft.author_id || !draft.date || !draft.valid_from) {
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editingId != null) {
        await api.updateInformation(editingId, toUpdatePayload(draft));
      } else {
        await api.createInformation(toCreatePayload(draft));
      }
      notifyInformationChanged();
      await loadAll();
      cancelDraft();
    } catch (err) {
      setError(toUserErrorMessage(err, 'Failed to save information.'));
    } finally {
      setSaving(false);
    }
  }, [draft, editingId, loadAll]);

  const deleteRow = useCallback(async (id: number) => {
    setSaving(true);
    setError('');
    try {
      await api.deleteInformation(id);
      await loadAll();
      notifyInformationChanged();
      if (editingId === id) cancelDraft();
    } catch (err) {
      setError(toUserErrorMessage(err, 'Failed to delete information.'));
    } finally {
      setSaving(false);
    }
  }, [editingId, loadAll]);

  const markRowRead = useCallback(async (id: number) => {
    setSaving(true);
    setError('');
    try {
      const updated = await api.markInformationRead(id);
      setRows((prev) => prev.map((row) => (row.id === id ? updated : row)));
      notifyInformationChanged();
    } catch (err) {
      setError(toUserErrorMessage(err, 'Failed to mark information as read.'));
    } finally {
      setSaving(false);
    }
  }, []);

  const draftTextLength = draft.text.trim().length;
  const minValidFrom = nextWorkingDayIso();
  const unreadCount = rows.filter((row) => !row.current_user_read_at).length;
  const totalCount = rows.length;
  const selectedAreaKey = areaContexts.find((entry) => entry.id === draft.area_context_id)?.key ?? 'GENERAL';
  const selectedOrganContextCount = draft.context_ids.filter((contextId) =>
    organContexts.some((context) => context.id === contextId)).length;
  const hasValidAreaScope = selectedAreaKey !== 'ORGAN' || selectedOrganContextCount > 0;
  const canSaveDraft = !!draft.author_id
    && !!draft.date
    && !!draft.valid_from
    && draft.valid_from >= minValidFrom
    && draftTextLength > 0
    && draftTextLength <= 1024
    && hasValidAreaScope;
  const sortedRows = [...rows].sort((a, b) => {
    const byDate = b.date.localeCompare(a.date);
    if (byDate !== 0) return byDate;
    return b.id - a.id;
  }).filter((row) => !hideRead || !row.current_user_read_at);

  return {
    loading,
    saving,
    error,
    totalCount,
    unreadCount,
    rows: sortedRows,
    organContexts,
    areaContexts,
    authors,
    adding,
    editingId,
    hideRead,
    currentUserId,
    currentUserIsAdmin,
    minValidFrom,
    draft,
    draftTextLength,
    canSaveDraft,
    setDraft,
    setDraftText: (next: string) => setDraft((prev) => ({ ...prev, text: next })),
    setHideRead,
    startAdd,
    startEdit,
    cancelDraft,
    saveDraft,
    deleteRow,
    markRowRead,
  };
}
