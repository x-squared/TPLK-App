import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, type Favorite, type FavoriteCreate } from '../../api';

export interface FavoriteTarget extends FavoriteCreate {
  name: string;
}

const matchesFavorite = (row: Favorite, target: FavoriteTarget): boolean => {
  if (row.favorite_type_key !== target.favorite_type_key) return false;
  if (target.favorite_type_key === 'PATIENT') return row.patient_id === (target.patient_id ?? null);
  if (target.favorite_type_key === 'EPISODE') return row.episode_id === (target.episode_id ?? null);
  if (target.favorite_type_key === 'COLLOQUIUM') return row.colloqium_id === (target.colloqium_id ?? null);
  return row.coordination_id === (target.coordination_id ?? null);
};

export function useFavoriteToggle(target: FavoriteTarget | null) {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const targetType = target?.favorite_type_key ?? null;
  const targetPatientId = target?.patient_id ?? null;
  const targetEpisodeId = target?.episode_id ?? null;
  const targetColloqiumId = target?.colloqium_id ?? null;
  const targetCoordinationId = target?.coordination_id ?? null;
  const targetContextJson = target?.context_json ?? null;
  const targetName = target?.name ?? '';

  const stableTarget = useMemo<FavoriteTarget | null>(() => {
    if (!targetType) return null;
    return {
      favorite_type_key: targetType,
      patient_id: targetPatientId,
      episode_id: targetEpisodeId,
      colloqium_id: targetColloqiumId,
      coordination_id: targetCoordinationId,
      context_json: targetContextJson,
      name: targetName,
    };
  }, [targetColloqiumId, targetContextJson, targetCoordinationId, targetEpisodeId, targetName, targetPatientId, targetType]);

  const refresh = useCallback(async () => {
    if (!stableTarget) {
      setFavorites([]);
      return;
    }
    setLoading(true);
    try {
      setFavorites(await api.listFavorites());
    } finally {
      setLoading(false);
    }
  }, [stableTarget]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const favorite = useMemo(
    () => (stableTarget ? favorites.find((row) => matchesFavorite(row, stableTarget)) ?? null : null),
    [favorites, stableTarget],
  );

  const toggle = useCallback(async () => {
    if (!stableTarget || saving) return;
    setSaving(true);
    try {
      if (favorite) {
        await api.deleteFavorite(favorite.id);
      } else {
        await api.createFavorite(stableTarget);
      }
      setFavorites(await api.listFavorites());
    } finally {
      setSaving(false);
    }
  }, [favorite, saving, stableTarget]);

  return {
    loading,
    saving,
    isFavorite: Boolean(favorite),
    favorite,
    toggle,
    refresh,
  };
}
