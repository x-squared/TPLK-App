import { useEffect, useState } from 'react';

import { api, type Catalogue, type CatalogueTypeSummary } from '../../../api';
import { toUserErrorMessage } from '../../../api/error';
import { withPreservedMainContentScroll } from '../../layout/scrollPreservation';

export function useAdminCatalogues() {
  const [catalogueTypes, setCatalogueTypes] = useState<CatalogueTypeSummary[]>([]);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [catalogues, setCatalogues] = useState<Catalogue[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadTypes = async (preferredType?: string | null) => {
    const types = await api.listAdminCatalogueTypes();
    setCatalogueTypes(types);
    const nextType = preferredType && types.some((entry) => entry.type === preferredType)
      ? preferredType
      : (types[0]?.type ?? null);
    setSelectedType(nextType);
    return nextType;
  };

  const loadCatalogues = async (catalogueType: string | null) => {
    if (!catalogueType) {
      setCatalogues([]);
      return;
    }
    const rows = await api.listAdminCatalogues(catalogueType);
    setCatalogues(rows);
  };

  const refresh = async (preferredType?: string | null) => {
    setLoading(true);
    setError('');
    try {
      const nextType = await loadTypes(preferredType ?? selectedType);
      await loadCatalogues(nextType);
    } catch (err) {
      setError(toUserErrorMessage(err, 'Could not load catalogues.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const selectType = async (catalogueType: string) => {
    setSelectedType(catalogueType);
    setError('');
    try {
      await loadCatalogues(catalogueType);
    } catch (err) {
      setError(toUserErrorMessage(err, 'Could not load catalogues.'));
    }
  };

  const updateCatalogue = async (
    catalogueId: number,
    payload: Partial<Pick<Catalogue, 'pos' | 'ext_sys' | 'ext_key' | 'name_default' | 'name_en' | 'name_de'>>,
  ) => {
    setSaving(true);
    setError('');
    try {
      await withPreservedMainContentScroll(async () => {
        await api.updateAdminCatalogue(catalogueId, payload);
        await refresh(selectedType);
      });
    } catch (err) {
      setError(toUserErrorMessage(err, 'Could not update catalogue entry.'));
    } finally {
      setSaving(false);
    }
  };

  return {
    catalogueTypes,
    selectedType,
    catalogues,
    loading,
    saving,
    error,
    selectType,
    updateCatalogue,
    refresh,
  };
}
