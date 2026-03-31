import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, type GuiSpecImplLinkUpsert, type GuiSpecNote, type GuiSpecNoteUpdate, type GuiSpecRegion, type GuiSpecRegionCreate, type GuiSpecRegionStatusUpdate, type GuiSpecViewCreate, type GuiSpecViewListItem } from '../../api';
import { toUserErrorMessage } from '../../api/error';
import { setGuiSpecsIntegrationContext } from '../../api/guiSpecs';
import { getCurrentCaptureContext } from '../dev-forum/devForumCaptureUtils';

export type GuiSpecsOverlayMode = 'idle' | 'pickingExistingPart' | 'drawingNewPart';

export function useGuiSpecsViewModel({ hasDevRole }: { hasDevRole: boolean }) {
  const [views, setViews] = useState<GuiSpecViewListItem[]>([]);
  const [activeViewId, setActiveViewIdState] = useState<number | null>(null);
  const [regions, setRegions] = useState<GuiSpecRegion[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<number | null>(null);
  const [showDoneParts, setShowDoneParts] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [overlayActive, setOverlayActive] = useState(false);
  const [overlayMode, setOverlayMode] = useState<GuiSpecsOverlayMode>('idle');
  const [integrationReady, setIntegrationReady] = useState(false);

  const activeView = useMemo(() => views.find((v) => v.id === activeViewId) ?? null, [activeViewId, views]);
  const selectedRegion = useMemo(() => regions.find((r) => r.id === selectedRegionId) ?? null, [regions, selectedRegionId]);

  const refreshViews = useCallback(async () => {
    if (!hasDevRole || !integrationReady) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.listGuiSpecViews();
      setViews(data);
      if (data.length > 0 && activeViewId === null) setActiveViewIdState(data[0].id);
    } catch (err) {
      setError(toUserErrorMessage(err, 'Could not load GUI spec views.'));
    } finally {
      setLoading(false);
    }
  }, [activeViewId, hasDevRole, integrationReady]);

  const refreshRegions = useCallback(async () => {
    if (!hasDevRole || !integrationReady || activeViewId === null) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.listGuiSpecRegions(activeViewId, { include_done: showDoneParts });
      setRegions(data);
      if (selectedRegionId !== null && !data.some((r) => r.id === selectedRegionId)) setSelectedRegionId(null);
    } catch (err) {
      setError(toUserErrorMessage(err, 'Could not load GUI spec regions.'));
    } finally {
      setLoading(false);
    }
  }, [activeViewId, hasDevRole, integrationReady, selectedRegionId, showDoneParts]);

  useEffect(() => {
    if (!hasDevRole) {
      setGuiSpecsIntegrationContext({ userId: null, roleKeys: [] });
      setIntegrationReady(false);
      return;
    }
    let disposed = false;
    api.getMe()
      .then((me) => {
        if (disposed) return;
        const roleKeys = [
          me.role?.key ?? '',
          ...(me.roles ?? []).map((role) => role.key),
        ]
          .map((value) => String(value).trim().toUpperCase())
          .filter((value) => value.length > 0);
        if (roleKeys.includes('DEV') && !roleKeys.includes('DEVELOPER')) roleKeys.push('DEVELOPER');
        setGuiSpecsIntegrationContext({ userId: me.id, roleKeys });
        setIntegrationReady(true);
      })
      .catch(() => {
        if (disposed) return;
        setGuiSpecsIntegrationContext({ userId: null, roleKeys: [] });
        setIntegrationReady(false);
      });
    return () => { disposed = true; };
  }, [hasDevRole]);
  useEffect(() => { void refreshViews(); }, [refreshViews]);
  useEffect(() => { void refreshRegions(); }, [refreshRegions]);

  const setActiveViewId = useCallback((id: number | null) => {
    setActiveViewIdState(id);
    setRegions([]);
    setSelectedRegionId(null);
  }, []);

  const createScratchView = useCallback(async (payload: GuiSpecViewCreate) => {
    setError('');
    try {
      const capture = getCurrentCaptureContext();
      const created = await api.createGuiSpecView({
        ...payload,
        capture_url: capture.capture_url,
        capture_gui_part: capture.capture_gui_part,
        capture_state_json: capture.capture_state_json,
        view_type: payload.view_type ?? 'SCRATCH_VIEW',
      });
      setViews((prev) => [{
        id: created.id,
        name: created.name,
        view_type: created.view_type,
        open_regions_count: 0,
        done_regions_count: 0,
        created_at: created.created_at,
        updated_at: created.updated_at ?? null,
      }, ...prev]);
      setActiveViewIdState(created.id);
      setRegions([]);
      setSelectedRegionId(null);
      return created;
    } catch (err) {
      setError(toUserErrorMessage(err, 'Could not create GUI spec view.'));
      return null;
    }
  }, []);

  const startOverlay = useCallback((mode: GuiSpecsOverlayMode) => {
    setOverlayMode(mode);
    setOverlayActive(true);
  }, []);
  const exitOverlay = useCallback(() => {
    setOverlayMode('idle');
    setOverlayActive(false);
  }, []);

  const createRegion = useCallback(async (payload: Omit<GuiSpecRegionCreate, 'view_id'>): Promise<GuiSpecRegion | null> => {
    if (!hasDevRole || activeViewId === null) return null;
    setError('');
    try {
      const created = await api.createGuiSpecRegion(activeViewId, payload);
      setRegions((prev) => [...prev, created]);
      setSelectedRegionId(created.id);
      return created;
    } catch (err) {
      setError(toUserErrorMessage(err, 'Could not create GUI spec region.'));
      return null;
    }
  }, [activeViewId, hasDevRole]);

  const setRegionNote = useCallback(async (regionId: number, payload: GuiSpecNoteUpdate) => {
    setError('');
    try {
      const updated: GuiSpecNote = await api.setGuiSpecRegionNote(regionId, payload);
      setRegions((prev) => prev.map((r) => (r.id === regionId ? { ...r, note: updated } : r)));
    } catch (err) {
      setError(toUserErrorMessage(err, 'Could not update region note.'));
    }
  }, []);

  const setRegionStatus = useCallback(async (regionId: number, payload: GuiSpecRegionStatusUpdate) => {
    setError('');
    try {
      const updated = await api.setGuiSpecRegionStatus(regionId, payload);
      if (!showDoneParts && payload.status === 'DONE' && regionId === selectedRegionId) setSelectedRegionId(null);
      setRegions((prev) => {
        const next = prev.map((r) => (r.id === regionId ? updated : r));
        if (!showDoneParts && payload.status === 'DONE') return next.filter((r) => r.status !== 'DONE');
        return next;
      });
    } catch (err) {
      setError(toUserErrorMessage(err, 'Could not update region status.'));
    }
  }, [selectedRegionId, showDoneParts]);

  const upsertImplLink = useCallback(async (regionId: number, payload: GuiSpecImplLinkUpsert) => {
    setError('');
    try {
      const updated = await api.upsertGuiSpecImplLink(regionId, payload);
      setRegions((prev) => prev.map((r) => (r.id === regionId ? { ...r, impl_link: updated } : r)));
    } catch (err) {
      setError(toUserErrorMessage(err, 'Could not update implementation link.'));
    }
  }, []);

  const deleteRegion = useCallback(async (regionId: number) => {
    setError('');
    try {
      await api.deleteGuiSpecRegion(regionId);
      setRegions((prev) => prev.filter((r) => r.id !== regionId));
      if (selectedRegionId === regionId) setSelectedRegionId(null);
    } catch (err) {
      setError(toUserErrorMessage(err, 'Could not delete captured region.'));
    }
  }, [selectedRegionId]);

  return {
    views,
    activeView,
    activeViewId,
    setActiveViewId,
    regions,
    selectedRegionId,
    setSelectedRegionId,
    selectedRegion,
    showDoneParts,
    setShowDoneParts,
    loading,
    error,
    overlayActive,
    overlayMode,
    setOverlayMode,
    startOverlay,
    exitOverlay,
    createScratchView,
    createRegion,
    setRegionNote,
    setRegionStatus,
    upsertImplLink,
    deleteRegion,
  };
}

