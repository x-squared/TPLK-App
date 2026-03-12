import { request } from './core';

export type FavoriteTypeKey = 'PATIENT' | 'EPISODE' | 'COLLOQUIUM' | 'COORDINATION';

export interface Favorite {
  id: number;
  user_id: number;
  favorite_type_key: FavoriteTypeKey;
  name: string;
  patient_id: number | null;
  episode_id: number | null;
  colloqium_id: number | null;
  coordination_id: number | null;
  context_json: string | null;
  sort_pos: number;
  created_at: string;
  updated_at: string | null;
}

export interface FavoriteCreate {
  favorite_type_key: FavoriteTypeKey;
  name?: string;
  patient_id?: number | null;
  episode_id?: number | null;
  colloqium_id?: number | null;
  coordination_id?: number | null;
  context_json?: string | null;
}

export const favoritesApi = {
  listFavorites: () => request<Favorite[]>('/favorites/'),
  createFavorite: (data: FavoriteCreate) =>
    request<Favorite>('/favorites/', { method: 'POST', body: JSON.stringify(data) }),
  reorderFavorites: (favoriteIds: number[]) =>
    request<Favorite[]>('/favorites/order', {
      method: 'PATCH',
      body: JSON.stringify({ favorite_ids: favoriteIds }),
    }),
  deleteFavorite: (id: number) => request<void>(`/favorites/${id}`, { method: 'DELETE' }),
};
