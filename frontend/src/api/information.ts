import { request, type AppUser, type Code } from './core';

export interface Information {
  id: number;
  context_id: number | null;
  context_ids: number[];
  context: Code | null;
  contexts: Code[];
  text: string;
  author_id: number;
  author: AppUser | null;
  date: string;
  valid_from: string;
  withdrawn: boolean;
  has_reads: boolean;
  current_user_read_at: string | null;
}

export interface InformationCreate {
  context_id?: number | null;
  context_ids?: number[];
  text: string;
  author_id: number;
  date: string;
  valid_from: string;
}

export interface InformationUpdate {
  context_id?: number | null;
  context_ids?: number[];
  text?: string;
  author_id?: number;
  date?: string;
  valid_from?: string;
}

export const informationApi = {
  listInformation: () => request<Information[]>('/information/'),
  createInformation: (payload: InformationCreate) =>
    request<Information>('/information/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateInformation: (id: number, payload: InformationUpdate) =>
    request<Information>(`/information/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  deleteInformation: (id: number) =>
    request<void>(`/information/${id}`, {
      method: 'DELETE',
    }),
  markInformationRead: (id: number) =>
    request<Information>(`/information/${id}/mark-read`, {
      method: 'POST',
    }),
};
