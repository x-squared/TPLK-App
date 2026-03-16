import { request, type AppUser, type Code, type Person } from './core';

export interface ColloqiumType {
  id: number;
  name: string;
  organ_id: number;
  organ: Code | null;
  participants: string;
  participant_ids: number[];
  participants_people: Person[];
  changed_by_id: number | null;
  changed_by_user: AppUser | null;
  created_at: string;
  updated_at: string | null;
}

export interface Colloqium {
  id: number;
  colloqium_type_id: number;
  colloqium_type: ColloqiumType | null;
  date: string;
  participants: string;
  completed: boolean;
  participant_ids: number[];
  signatory_ids: number[];
  participants_people: Person[];
  signatories_people: Person[];
  changed_by_id: number | null;
  changed_by_user: AppUser | null;
  created_at: string;
  updated_at: string | null;
}

export interface ColloqiumCreate {
  colloqium_type_id: number;
  date: string;
  participants?: string;
  completed?: boolean;
  participant_ids?: number[];
  signatory_ids?: number[];
}

export interface ColloqiumUpdate {
  colloqium_type_id?: number;
  date?: string;
  participants?: string;
  completed?: boolean;
  participant_ids?: number[];
  signatory_ids?: number[];
}

export interface ColloqiumTypeUpdate {
  name?: string;
  organ_id?: number;
  participants?: string;
  participant_ids?: number[];
}

export interface ColloqiumAgenda {
  id: number;
  colloqium_id: number;
  colloqium: Colloqium | null;
  episode_id: number;
  presented_by_id: number | null;
  presented_by_person: Person | null;
  decision: string;
  decision_reason: string;
  comment: string;
  episode: {
    id: number;
    patient_id: number;
    fall_nr: string;
    organ: Code | null;
    status: Code | null;
    phase: Code | null;
    closed: boolean;
    start: string | null;
    end: string | null;
    eval_start: string | null;
    eval_end: string | null;
    list_start: string | null;
    list_end: string | null;
    tpl_date: string | null;
    fup_recipient_card_date: string | null;
  } | null;
  changed_by_id: number | null;
  changed_by_user: AppUser | null;
  created_at: string;
  updated_at: string | null;
}

export interface ColloqiumAgendaCreate {
  colloqium_id: number;
  episode_id: number;
  presented_by_id?: number | null;
  decision?: string;
  decision_reason?: string;
  comment?: string;
}

export interface ColloqiumAgendaUpdate {
  colloqium_id?: number;
  episode_id?: number;
  presented_by_id?: number | null;
  decision?: string;
  decision_reason?: string;
  comment?: string;
}

export const colloqiumsApi = {
  listColloqiumTypes: () => request<ColloqiumType[]>('/colloqium-types/'),
  updateColloqiumType: (id: number, data: ColloqiumTypeUpdate) =>
    request<ColloqiumType>(`/colloqium-types/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  listColloqiums: () => request<Colloqium[]>('/colloqiums/'),
  listColloqiumAgendas: (params: { colloqiumId?: number; episodeId?: number } = {}) => {
    const query = new URLSearchParams();
    if (params.colloqiumId !== undefined) query.set('colloqium_id', String(params.colloqiumId));
    if (params.episodeId !== undefined) query.set('episode_id', String(params.episodeId));
    const suffix = query.toString();
    return request<ColloqiumAgenda[]>(`/colloqium-agendas/${suffix ? `?${suffix}` : ''}`);
  },
  createColloqiumAgenda: (data: ColloqiumAgendaCreate) =>
    request<ColloqiumAgenda>('/colloqium-agendas/', { method: 'POST', body: JSON.stringify(data) }),
  updateColloqiumAgenda: (id: number, data: ColloqiumAgendaUpdate) =>
    request<ColloqiumAgenda>(`/colloqium-agendas/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteColloqiumAgenda: (id: number) =>
    request<void>(`/colloqium-agendas/${id}`, { method: 'DELETE' }),
  createColloqium: (data: ColloqiumCreate) =>
    request<Colloqium>('/colloqiums/', { method: 'POST', body: JSON.stringify(data) }),
  updateColloqium: (id: number, data: ColloqiumUpdate) =>
    request<Colloqium>(`/colloqiums/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
};

