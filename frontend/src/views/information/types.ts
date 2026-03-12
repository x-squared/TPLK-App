import type { Code, Information, InformationCreate, InformationUpdate } from '../../api';

export interface InformationDraft {
  context_id: number | null;
  context_ids: number[];
  area_context_id: number | null;
  text: string;
  author_id: number;
  date: string;
  valid_from: string;
}

export interface InformationSectionModel {
  loading: boolean;
  saving: boolean;
  error: string;
  totalCount: number;
  unreadCount: number;
  rows: Information[];
  organContexts: Code[];
  areaContexts: Code[];
  authors: Array<{ id: number; name: string }>;
  adding: boolean;
  editingId: number | null;
  hideRead: boolean;
  currentUserId: number | null;
  currentUserIsAdmin: boolean;
  minValidFrom: string;
  draft: InformationDraft;
  draftTextLength: number;
  canSaveDraft: boolean;
  setDraft: (next: InformationDraft) => void;
  setDraftText: (next: string) => void;
  setHideRead: (next: boolean) => void;
  startAdd: () => void;
  startEdit: (row: Information) => void;
  cancelDraft: () => void;
  saveDraft: () => Promise<void>;
  deleteRow: (id: number) => Promise<void>;
  markRowRead: (id: number) => Promise<void>;
}

export const toCreatePayload = (draft: InformationDraft): InformationCreate => ({
  context_id: draft.area_context_id ?? draft.context_ids[0] ?? draft.context_id,
  context_ids: draft.area_context_id != null && !draft.context_ids.includes(draft.area_context_id)
    ? [draft.area_context_id, ...draft.context_ids]
    : draft.context_ids,
  text: draft.text,
  author_id: draft.author_id,
  date: draft.date,
  valid_from: draft.valid_from,
});

export const toUpdatePayload = (draft: InformationDraft): InformationUpdate => ({
  context_id: draft.area_context_id ?? draft.context_ids[0] ?? draft.context_id,
  context_ids: draft.area_context_id != null && !draft.context_ids.includes(draft.area_context_id)
    ? [draft.area_context_id, ...draft.context_ids]
    : draft.context_ids,
  text: draft.text,
  author_id: draft.author_id,
  date: draft.date,
  valid_from: draft.valid_from,
});
