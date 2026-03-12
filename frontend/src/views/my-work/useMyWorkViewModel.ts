import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, type Code, type Favorite, type Patient } from '../../api';
import { toUserErrorMessage } from '../../api/error';
import { translateCodeLabel } from '../../i18n/codeTranslations';
import { useI18n } from '../../i18n/i18n';
import { formatEpisodeFavoriteName, formatOrganNames } from '../layout/episodeDisplay';

const fallbackTypeLabels: Record<string, string> = {
  PATIENT: 'Patient',
  EPISODE: 'Episode',
  COLLOQUIUM: 'Colloquium',
  COORDINATION: 'Coordination',
};

export function useMyWorkViewModel() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [favoriteTypes, setFavoriteTypes] = useState<Code[]>([]);
  const [error, setError] = useState('');
  const [deletingFavoriteId, setDeletingFavoriteId] = useState<number | null>(null);
  const [draggingFavoriteId, setDraggingFavoriteId] = useState<number | null>(null);
  const [dragOverFavoriteId, setDragOverFavoriteId] = useState<number | null>(null);
  const [episodeFavoriteNames, setEpisodeFavoriteNames] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [favoriteRows, typeCodes] = await Promise.all([
        api.listFavorites(),
        api.listCodes('FAVORITE_TYPE'),
      ]);
      setFavorites(favoriteRows);
      setFavoriteTypes(typeCodes);
      const episodeFavorites = favoriteRows.filter(
        (row) => row.favorite_type_key === 'EPISODE' && row.patient_id != null && row.episode_id != null,
      );
      if (episodeFavorites.length > 0) {
        const patientIds = [...new Set(
          episodeFavorites.map((row) => row.patient_id).filter((id): id is number => typeof id === 'number'),
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
        const patientsById: Record<number, Patient> = {};
        for (const entry of patientEntries) {
          if (!entry) continue;
          patientsById[entry[0]] = entry[1];
        }
        const namesByFavoriteId: Record<number, string> = {};
        for (const row of episodeFavorites) {
          const patient = row.patient_id != null ? patientsById[row.patient_id] : undefined;
          const episode = patient?.episodes?.find((ep) => ep.id === row.episode_id);
          if (!patient || !episode) continue;
          namesByFavoriteId[row.id] = formatEpisodeFavoriteName({
            fullName: `${patient.first_name} ${patient.name}`.trim(),
            birthDate: patient.date_of_birth,
            pid: patient.pid,
            organName: formatOrganNames(
              episode.organs,
              translateCodeLabel(t, episode.organ),
              (organ) => translateCodeLabel(t, { type: 'ORGAN', key: organ.key ?? '', name_default: '' }),
            ),
            startDate: episode.start,
          });
        }
        setEpisodeFavoriteNames(namesByFavoriteId);
      } else {
        setEpisodeFavoriteNames({});
      }
    } catch (err) {
      setError(toUserErrorMessage(err, 'Failed to load favorites'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const typeLabels = useMemo(() => {
    const map: Record<string, string> = { ...fallbackTypeLabels };
    for (const code of favoriteTypes) {
      map[code.key] = translateCodeLabel(t, code);
    }
    return map;
  }, [favoriteTypes, t]);

  const deleteFavorite = useCallback(async (id: number) => {
    setDeletingFavoriteId(id);
    try {
      await api.deleteFavorite(id);
      setFavorites((prev) => prev.filter((item) => item.id !== id));
      setEpisodeFavoriteNames((prev) => {
        if (!(id in prev)) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (err) {
      setError(toUserErrorMessage(err, 'Failed to delete favorite'));
    } finally {
      setDeletingFavoriteId(null);
    }
  }, []);

  const reorderFavorites = useCallback(async (targetId: number) => {
    if (draggingFavoriteId == null || draggingFavoriteId === targetId) {
      return;
    }
    const fromIndex = favorites.findIndex((item) => item.id === draggingFavoriteId);
    const toIndex = favorites.findIndex((item) => item.id === targetId);
    if (fromIndex < 0 || toIndex < 0) {
      setDraggingFavoriteId(null);
      setDragOverFavoriteId(null);
      return;
    }
    const next = [...favorites];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    const normalized = next.map((item, index) => ({ ...item, sort_pos: index + 1 }));
    setFavorites(normalized);
    setDraggingFavoriteId(null);
    setDragOverFavoriteId(null);
    try {
      await api.reorderFavorites(normalized.map((item) => item.id));
    } catch (err) {
      setError(toUserErrorMessage(err, 'Failed to reorder favorites'));
      await load();
    }
  }, [draggingFavoriteId, favorites, load]);

  return {
    loading,
    error,
    favorites,
    typeLabels,
    deletingFavoriteId,
    draggingFavoriteId,
    dragOverFavoriteId,
    episodeFavoriteNames,
    deleteFavorite,
    setDraggingFavoriteId,
    setDragOverFavoriteId,
    reorderFavorites,
    refresh: load,
  };
}
