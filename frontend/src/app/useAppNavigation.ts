import { useEffect, useRef, useState } from 'react';

import type { Favorite } from '../api';
import type { PatientDetailTab } from '../views/patient-detail/PatientDetailTabs';
import type { ColloquiumDetailTab } from '../views/colloquiums/detail/colloquiumDetailViewModelTypes';
import type { CoordinationDetailTab } from '../views/coordinations/detail/useCoordinationDetailViewModel';

export type Page = 'my-work' | 'patients' | 'donors' | 'colloquiums' | 'coordinations' | 'reports' | 'admin' | 'e2e-tests' | 'dev-forum' | 'preferences';

interface UseAppNavigationArgs {
  canViewPatients: boolean;
  canViewDonors: boolean;
  canViewColloquiums: boolean;
  canViewCoordinations: boolean;
  canViewReports: boolean;
  canViewAdmin: boolean;
  devToolsEnabled: boolean;
  startPagePreference?: Page;
}

interface NavigationState {
  page: Page;
  selectedPatientId: number | null;
  selectedColloqiumId: number | null;
  selectedColloqiumTab: ColloquiumDetailTab | undefined;
  selectedCoordinationId: number | null;
  selectedCoordinationTab: CoordinationDetailTab | undefined;
  patientInitialTab: PatientDetailTab | undefined;
  patientInitialEpisodeId: number | null;
}

function isSameState(a: NavigationState, b: NavigationState): boolean {
  return (
    a.page === b.page
    && a.selectedPatientId === b.selectedPatientId
    && a.selectedColloqiumId === b.selectedColloqiumId
    && a.selectedColloqiumTab === b.selectedColloqiumTab
    && a.selectedCoordinationId === b.selectedCoordinationId
    && a.selectedCoordinationTab === b.selectedCoordinationTab
    && a.patientInitialTab === b.patientInitialTab
    && a.patientInitialEpisodeId === b.patientInitialEpisodeId
  );
}

function parseFavoriteContext(favorite: Favorite): Record<string, unknown> {
  const raw = favorite.context_json;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null) return parsed as Record<string, unknown>;
    return {};
  } catch {
    return {};
  }
}

export function useAppNavigation({
  canViewPatients,
  canViewDonors,
  canViewColloquiums,
  canViewCoordinations,
  canViewReports,
  canViewAdmin,
  devToolsEnabled,
  startPagePreference,
}: UseAppNavigationArgs) {
  const [page, setPage] = useState<Page>('patients');
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [selectedColloqiumId, setSelectedColloqiumId] = useState<number | null>(null);
  const [selectedColloqiumTab, setSelectedColloqiumTab] = useState<ColloquiumDetailTab | undefined>(undefined);
  const [selectedCoordinationId, setSelectedCoordinationId] = useState<number | null>(null);
  const [selectedCoordinationTab, setSelectedCoordinationTab] = useState<CoordinationDetailTab | undefined>(undefined);
  const [patientInitialTab, setPatientInitialTab] = useState<PatientDetailTab | undefined>(undefined);
  const [patientInitialEpisodeId, setPatientInitialEpisodeId] = useState<number | null>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [hasMarkedLocation, setHasMarkedLocation] = useState(false);

  const backStackRef = useRef<NavigationState[]>([]);
  const forwardStackRef = useRef<NavigationState[]>([]);
  const markedLocationRef = useRef<NavigationState | null>(null);
  const lastRecordedStateRef = useRef<NavigationState | null>(null);
  const isApplyingHistoryRef = useRef(false);
  const startPageAppliedRef = useRef<Page | null>(null);

  const buildCurrentState = (): NavigationState => ({
    page,
    selectedPatientId,
    selectedColloqiumId,
    selectedColloqiumTab,
    selectedCoordinationId,
    selectedCoordinationTab,
    patientInitialTab,
    patientInitialEpisodeId,
  });

  const setFromState = (state: NavigationState) => {
    setPage(state.page);
    setSelectedPatientId(state.selectedPatientId);
    setSelectedColloqiumId(state.selectedColloqiumId);
    setSelectedColloqiumTab(state.selectedColloqiumTab);
    setSelectedCoordinationId(state.selectedCoordinationId);
    setSelectedCoordinationTab(state.selectedCoordinationTab);
    setPatientInitialTab(state.patientInitialTab);
    setPatientInitialEpisodeId(state.patientInitialEpisodeId);
  };

  const syncHistoryAvailability = () => {
    setCanGoBack(backStackRef.current.length > 0);
    setCanGoForward(forwardStackRef.current.length > 0);
  };

  useEffect(() => {
    if (!startPagePreference) return;
    if (startPageAppliedRef.current === startPagePreference) return;
    setPage(startPagePreference);
    startPageAppliedRef.current = startPagePreference;
  }, [startPagePreference]);

  useEffect(() => {
    if (!devToolsEnabled && (page === 'e2e-tests' || page === 'dev-forum')) {
      setPage('patients');
    }
  }, [devToolsEnabled, page]);

  useEffect(() => {
    const pagePermissions: Partial<Record<Page, boolean>> = {
      preferences: true,
      patients: canViewPatients,
      donors: canViewDonors,
      colloquiums: canViewColloquiums,
      coordinations: canViewCoordinations,
      reports: canViewReports,
      admin: canViewAdmin,
    };
    const pageAllowed = pagePermissions[page];
    if (typeof pageAllowed === 'boolean' && !pageAllowed) {
      if (canViewPatients) {
        setPage('patients');
      } else {
        setPage('my-work');
      }
    }
  }, [
    canViewAdmin,
    canViewColloquiums,
    canViewCoordinations,
    canViewDonors,
    canViewPatients,
    canViewReports,
    page,
  ]);

  useEffect(() => {
    const current = buildCurrentState();
    if (lastRecordedStateRef.current === null) {
      lastRecordedStateRef.current = current;
      syncHistoryAvailability();
      return;
    }
    if (isSameState(current, lastRecordedStateRef.current)) {
      return;
    }
    if (isApplyingHistoryRef.current) {
      isApplyingHistoryRef.current = false;
      lastRecordedStateRef.current = current;
      syncHistoryAvailability();
      return;
    }
    backStackRef.current.push(lastRecordedStateRef.current);
    forwardStackRef.current = [];
    lastRecordedStateRef.current = current;
    syncHistoryAvailability();
  }, [
    page,
    selectedPatientId,
    selectedColloqiumId,
    selectedColloqiumTab,
    selectedCoordinationId,
    selectedCoordinationTab,
    patientInitialTab,
    patientInitialEpisodeId,
  ]);

  const resetSelection = () => {
    setSelectedPatientId(null);
    setSelectedColloqiumId(null);
    setSelectedColloqiumTab(undefined);
    setSelectedCoordinationId(null);
    setSelectedCoordinationTab(undefined);
    setPatientInitialTab(undefined);
    setPatientInitialEpisodeId(null);
  };

  const openFavorite = (favorite: Favorite) => {
    const context = parseFavoriteContext(favorite);
    const patientTab = context.patient_tab;
    const colloquiumTab = context.colloquium_tab;
    const coordinationTab = context.coordination_tab;
    if (favorite.favorite_type_key === 'PATIENT' && favorite.patient_id) {
      setPage('patients');
      setSelectedColloqiumId(null);
      setSelectedColloqiumTab(undefined);
      setSelectedCoordinationId(null);
      setSelectedCoordinationTab(undefined);
      setPatientInitialTab(
        patientTab === 'patient' || patientTab === 'episodes' || patientTab === 'medical' || patientTab === 'tasks'
          ? patientTab
          : undefined,
      );
      setPatientInitialEpisodeId(null);
      setSelectedPatientId(favorite.patient_id);
      return;
    }
    if (favorite.favorite_type_key === 'EPISODE' && favorite.episode_id && favorite.patient_id) {
      setPage('patients');
      setSelectedColloqiumId(null);
      setSelectedColloqiumTab(undefined);
      setSelectedCoordinationId(null);
      setSelectedCoordinationTab(undefined);
      setSelectedPatientId(favorite.patient_id);
      setPatientInitialTab('episodes');
      setPatientInitialEpisodeId(favorite.episode_id);
      return;
    }
    if (favorite.favorite_type_key === 'COLLOQUIUM' && favorite.colloqium_id) {
      setPage('colloquiums');
      setSelectedPatientId(null);
      setSelectedCoordinationId(null);
      setSelectedCoordinationTab(undefined);
      setPatientInitialTab(undefined);
      setPatientInitialEpisodeId(null);
      setSelectedColloqiumId(favorite.colloqium_id);
      setSelectedColloqiumTab(colloquiumTab === 'colloquium' || colloquiumTab === 'protocol' ? colloquiumTab : undefined);
      return;
    }
    if (favorite.favorite_type_key === 'COORDINATION' && favorite.coordination_id) {
      setPage('coordinations');
      setSelectedPatientId(null);
      setSelectedColloqiumId(null);
      setSelectedColloqiumTab(undefined);
      setPatientInitialTab(undefined);
      setPatientInitialEpisodeId(null);
      setSelectedCoordinationId(favorite.coordination_id);
      setSelectedCoordinationTab(
        coordinationTab === 'coordination' || coordinationTab === 'protocol' || coordinationTab === 'time-log' || coordinationTab === 'completion'
          ? coordinationTab
          : undefined,
      );
    }
  };

  const goBack = () => {
    const target = backStackRef.current.pop();
    if (!target) return;
    forwardStackRef.current.push(buildCurrentState());
    isApplyingHistoryRef.current = true;
    setFromState(target);
    syncHistoryAvailability();
  };

  const goForward = () => {
    const target = forwardStackRef.current.pop();
    if (!target) return;
    backStackRef.current.push(buildCurrentState());
    isApplyingHistoryRef.current = true;
    setFromState(target);
    syncHistoryAvailability();
  };

  const toggleMarkedLocation = () => {
    if (markedLocationRef.current) {
      const target = markedLocationRef.current;
      markedLocationRef.current = null;
      setHasMarkedLocation(false);
      isApplyingHistoryRef.current = true;
      setFromState(target);
      syncHistoryAvailability();
      return;
    }
    markedLocationRef.current = buildCurrentState();
    setHasMarkedLocation(true);
  };

  return {
    page,
    setPage,
    selectedPatientId,
    setSelectedPatientId,
    selectedColloqiumId,
    setSelectedColloqiumId,
    selectedColloqiumTab,
    setSelectedColloqiumTab,
    selectedCoordinationId,
    setSelectedCoordinationId,
    selectedCoordinationTab,
    setSelectedCoordinationTab,
    patientInitialTab,
    setPatientInitialTab,
    patientInitialEpisodeId,
    setPatientInitialEpisodeId,
    resetSelection,
    openFavorite,
    canGoBack,
    canGoForward,
    hasMarkedLocation,
    goBack,
    goForward,
    toggleMarkedLocation,
  };
}
