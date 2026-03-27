import { useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { api, type UserPreferences } from './api';
import AppMainRouter from './app/AppMainRouter';
import AppSidebar from './app/AppSidebar';
import DevForumPanel from './app/DevForumPanel';
import { useInformationUnreadCount } from './app/useInformationUnreadCount';
import { useMyWorkOpenTaskCount } from './app/useMyWorkOpenTaskCount';
import { useAppNavigation } from './app/useAppNavigation';
import { buildStartViewOptions } from './app/navigationConfig';
import type { Page } from './app/useAppNavigation';
import { useAppPermissions } from './app/useAppPermissions';
import { useAppSession } from './app/useAppSession';
import { useI18n } from './i18n/i18n';
import { applyDevForumHighlightFromLocation } from './views/layout/devForumHighlight';
import { DEV_FORUM_OPEN_CONTEXT_EVENT, type DevForumOpenContextDetail } from './views/layout/devForumEvents';
import { initializeErrorContextCapture } from './views/layout/errorContextCapture';
import './App.css';
import './styles/TableStyles.css';
import ColloquiumDetailView from './views/ColloquiumDetailView';
import CoordinationDetailView from './views/CoordinationDetailView';

type NumericContext = {
  keyedIds: Record<string, number>;
  fallbackIds: number[];
};

function parseCaptureState(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // keep empty object for invalid payloads
  }
  return {};
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const numeric = Number(value.trim());
    if (Number.isFinite(numeric)) return numeric;
  }
  return null;
}

function extractNumericContext(captureState: Record<string, unknown>): NumericContext {
  const keyedIds: Record<string, number> = {};
  const fallbackIds: number[] = [];
  const ids = captureState.ids;
  if (!Array.isArray(ids)) return { keyedIds, fallbackIds };
  ids.forEach((entry) => {
    const plain = toFiniteNumber(entry);
    if (plain !== null) {
      fallbackIds.push(plain);
      return;
    }
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) return;
    const key = String((entry as Record<string, unknown>).key ?? '').trim().toLowerCase();
    const value = toFiniteNumber((entry as Record<string, unknown>).value);
    if (value === null) return;
    if (key) keyedIds[key] = value;
    fallbackIds.push(value);
  });
  return { keyedIds, fallbackIds };
}

function pickId(context: NumericContext, keywords: string[]): number | null {
  const matched = Object.entries(context.keyedIds).find(([key]) => keywords.some((kw) => key.includes(kw)));
  if (matched) return matched[1];
  return context.fallbackIds[0] ?? null;
}

type ContextTarget =
  | 'my-work'
  | 'patients'
  | 'donors'
  | 'colloquiums'
  | 'coordinations'
  | 'reports'
  | 'admin'
  | 'preferences'
  | 'dev-forum'
  | 'e2e-tests'
  | '';

function resolveContextTarget(candidates: string[]): ContextTarget {
  const combined = candidates.join(' ').toLowerCase();
  if (combined.includes('my-work') || combined.includes('my work')) return 'my-work';
  if (combined.includes('coordination')) return 'coordinations';
  if (combined.includes('colloq')) return 'colloquiums';
  if (combined.includes('donor')) return 'donors';
  if (combined.includes('patient')) return 'patients';
  if (combined.includes('report')) return 'reports';
  if (combined.includes('admin')) return 'admin';
  if (combined.includes('preference')) return 'preferences';
  if (combined.includes('dev-forum') || combined.includes('dev forum')) return 'dev-forum';
  if (combined.includes('e2e')) return 'e2e-tests';
  return '';
}

function inferTargetFromErrorPath(path: string): ContextTarget {
  const normalized = (path || '').toLowerCase();
  if (!normalized) return '';
  if (normalized.includes('/e2e-tests/')) return 'e2e-tests';
  if (normalized.includes('/coordinations') || normalized.includes('/coordination_')) return 'coordinations';
  if (normalized.includes('/colloq')) return 'colloquiums';
  if (normalized.includes('/patients') || normalized.includes('/diagnoses') || normalized.includes('/episodes')) return 'patients';
  if (normalized.includes('/reports')) return 'reports';
  if (normalized.includes('/admin')) return 'admin';
  return '';
}

function resolveCapturedTab(captureState: Record<string, unknown>): string {
  const raw = captureState.active_tab;
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return '';
  const payload = raw as Record<string, unknown>;
  const key = String(payload.key ?? '').trim().toLowerCase();
  if (key) return key;
  const label = String(payload.label ?? '').trim().toLowerCase();
  return label;
}

function resolvePatientDetailTab(tabKey: string): 'patient' | 'medical' | 'episodes' | 'tasks' | undefined {
  if (!tabKey) return undefined;
  if (tabKey.includes('medical')) return 'medical';
  if (tabKey.includes('episode')) return 'episodes';
  if (tabKey.includes('task')) return 'tasks';
  if (tabKey.includes('patient')) return 'patient';
  return undefined;
}

function resolveColloquiumDetailTab(tabKey: string): 'colloquium' | 'protocol' | undefined {
  if (!tabKey) return undefined;
  if (tabKey.includes('protocol')) return 'protocol';
  if (tabKey.includes('colloq')) return 'colloquium';
  if (tabKey.includes('agenda')) return 'colloquium';
  if (tabKey.includes('summary')) return 'colloquium';
  return undefined;
}

function resolveCoordinationDetailTab(tabKey: string): 'coordination' | 'protocol' | 'time-log' | 'completion' | undefined {
  if (!tabKey) return undefined;
  if (tabKey.includes('protocol')) return 'protocol';
  if (tabKey.includes('time')) return 'time-log';
  if (tabKey.includes('clock')) return 'time-log';
  if (tabKey.includes('completion')) return 'completion';
  if (tabKey.includes('coordination')) return 'coordination';
  return undefined;
}

function App() {
  const { t, setLocale, setRuntimeTranslations } = useI18n();
  const protocolParam = new URLSearchParams(window.location.search).get('protocol');
  const coordinationProtocolParam = new URLSearchParams(window.location.search).get('coordination_protocol');
  const standaloneProtocolId = protocolParam && !Number.isNaN(Number(protocolParam))
    ? Number(protocolParam)
    : null;
  const standaloneCoordinationProtocolId = coordinationProtocolParam && !Number.isNaN(Number(coordinationProtocolParam))
    ? Number(coordinationProtocolParam)
    : null;

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [coordinationQuickCreateToken, setCoordinationQuickCreateToken] = useState(0);
  const [devForumPanelOpen, setDevForumPanelOpen] = useState(false);
  const [devForumPanelWidth, setDevForumPanelWidth] = useState(420);
  const {
    user,
    authLoading,
    extId,
    setExtId,
    loginError,
    devToolsEnabled,
    handleLogin,
    handleLogout: handleSessionLogout,
  } = useAppSession('TALL');
  const {
    canViewPatients,
    canViewDonors,
    canViewColloquiums,
    canViewCoordinations,
    canViewReports,
    canViewAdmin,
  } = useAppPermissions(user);
  const hasDevRole = useMemo(() => {
    if (!user) return false;
    if (user.role?.type === 'ROLE' && user.role.key === 'DEV') return true;
    return (user.roles ?? []).some((role) => role.type === 'ROLE' && role.key === 'DEV');
  }, [user]);
  const [preferencesLoading, setPreferencesLoading] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences>({
    locale: 'en',
    start_page: 'patients',
  });
  const startViewOptions = useMemo(() => {
    return buildStartViewOptions({
      canViewPatients,
      canViewDonors,
      canViewColloquiums,
      canViewCoordinations,
      canViewReports,
      canViewAdmin,
      devToolsEnabled,
    });
  }, [canViewAdmin, canViewColloquiums, canViewCoordinations, canViewDonors, canViewPatients, canViewReports, devToolsEnabled]);
  const allowedStartPages = startViewOptions.map((option) => option.key);
  const defaultStartPage: UserPreferences['start_page'] = allowedStartPages.includes('patients') ? 'patients' : 'my-work';
  const startPagePreference: Page = allowedStartPages.includes(preferences.start_page)
    ? preferences.start_page
    : defaultStartPage;

  useEffect(() => {
    if (!user) return;
    setPreferencesLoading(true);
    api.getMyUserPreferences()
      .then(async (payload) => {
        setPreferences(payload);
        setLocale(payload.locale);
        try {
          const overrides = await api.getTranslationOverrides(payload.locale);
          setRuntimeTranslations(overrides.entries ?? {});
        } catch {
          setRuntimeTranslations({});
        }
      })
      .finally(() => setPreferencesLoading(false));
  }, [setLocale, setRuntimeTranslations, user]);

  useEffect(() => {
    applyDevForumHighlightFromLocation();
    initializeErrorContextCapture();
  }, []);

  const {
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
  } = useAppNavigation({
    canViewPatients,
    canViewDonors,
    canViewColloquiums,
    canViewCoordinations,
    canViewReports,
    canViewAdmin,
    devToolsEnabled,
    startPagePreference,
  });
  const { unreadCount: unreadInformationCount } = useInformationUnreadCount(Boolean(user));
  const { openTaskCount } = useMyWorkOpenTaskCount(Boolean(user));

  useEffect(() => {
    document.body.dataset.tplCurrentPage = page;
    if (selectedPatientId !== null) {
      document.body.dataset.tplCurrentPatientId = String(selectedPatientId);
    } else {
      delete document.body.dataset.tplCurrentPatientId;
    }
    if (selectedCoordinationId !== null) {
      document.body.dataset.tplCurrentCoordinationId = String(selectedCoordinationId);
    } else {
      delete document.body.dataset.tplCurrentCoordinationId;
    }
    if (selectedColloqiumId !== null) {
      document.body.dataset.tplCurrentColloquiumId = String(selectedColloqiumId);
    } else {
      delete document.body.dataset.tplCurrentColloquiumId;
    }
  }, [page, selectedPatientId, selectedCoordinationId, selectedColloqiumId]);

  useEffect(() => {
    const onOpenContext = (event: Event) => {
      const customEvent = event as CustomEvent<DevForumOpenContextDetail>;
      const detail = customEvent.detail;
      if (!detail) return;
      const captureState = parseCaptureState(detail.capture_state_json || '');
      const numericContext = extractNumericContext(captureState);
      const rawGuiPart = (detail.capture_gui_part ?? captureState.gui_part ?? '').toString().trim().toLowerCase();
      const statePage = String(captureState.page ?? '').trim().toLowerCase();
      const pathPart = (() => {
        try {
          const url = new URL(detail.capture_url || '/', window.location.origin);
          const pathHead = url.pathname.split('/').filter(Boolean)[0]?.toLowerCase() ?? '';
          const queryPage = url.searchParams.get('page')?.toLowerCase() ?? '';
          return [pathHead, queryPage].filter(Boolean).join(' ');
        } catch {
          return '';
        }
      })();
      const candidates = [rawGuiPart, statePage, pathPart].filter(Boolean);
      const hasPatientKey = Object.keys(numericContext.keyedIds).some((key) => key.includes('patient'));
      const hasCoordinationKey = Object.keys(numericContext.keyedIds).some((key) => key.includes('coordination'));
      const hasColloquiumKey = Object.keys(numericContext.keyedIds).some((key) => key.includes('colloq') || key.includes('colloquium'));
      const inferredFromErrorPath = inferTargetFromErrorPath(String(captureState.latest_error_path ?? ''));
      const capturedTabKey = resolveCapturedTab(captureState);
      const patientDetailTab = resolvePatientDetailTab(capturedTabKey);
      const colloquiumDetailTab = resolveColloquiumDetailTab(capturedTabKey);
      const coordinationDetailTab = resolveCoordinationDetailTab(capturedTabKey);
      const target = resolveContextTarget(candidates)
        || inferredFromErrorPath
        || (hasCoordinationKey ? 'coordinations' : hasColloquiumKey ? 'colloquiums' : hasPatientKey ? 'patients' : '');

      if (target === 'coordinations') {
        setPage('coordinations');
        setSelectedColloqiumId(null);
        setSelectedColloqiumTab(undefined);
        setSelectedPatientId(null);
        setPatientInitialTab(undefined);
        setPatientInitialEpisodeId(null);
        setSelectedCoordinationTab(coordinationDetailTab);
        const coordinationId = pickId(numericContext, ['coordination']);
        if (coordinationId !== null) setSelectedCoordinationId(coordinationId);
        return;
      }
      if (target === 'colloquiums') {
        setPage('colloquiums');
        setSelectedCoordinationId(null);
        setSelectedCoordinationTab(undefined);
        setSelectedPatientId(null);
        setPatientInitialTab(undefined);
        setPatientInitialEpisodeId(null);
        setSelectedColloqiumTab(colloquiumDetailTab);
        const colloquiumId = pickId(numericContext, ['colloq', 'colloquium', 'protocol']);
        if (colloquiumId !== null) setSelectedColloqiumId(colloquiumId);
        return;
      }
      if (target === 'patients' || target === 'donors') {
        setPage(target);
        setSelectedColloqiumId(null);
        setSelectedColloqiumTab(undefined);
        setSelectedCoordinationId(null);
        setSelectedCoordinationTab(undefined);
        setPatientInitialTab(target === 'patients' ? patientDetailTab : undefined);
        setPatientInitialEpisodeId(null);
        const patientId = pickId(numericContext, ['patient']);
        if (patientId !== null) setSelectedPatientId(patientId);
        return;
      }
      if (
        target === 'my-work'
        || target === 'reports'
        || target === 'admin'
        || target === 'preferences'
        || target === 'dev-forum'
        || target === 'e2e-tests'
      ) {
        setPage(target);
        return;
      }
      if (hasCoordinationKey || hasColloquiumKey || hasPatientKey) {
        setPage(hasCoordinationKey ? 'coordinations' : hasColloquiumKey ? 'colloquiums' : 'patients');
      }
    };
    window.addEventListener(DEV_FORUM_OPEN_CONTEXT_EVENT, onOpenContext);
    return () => {
      window.removeEventListener(DEV_FORUM_OPEN_CONTEXT_EVENT, onOpenContext);
    };
  }, [
    setPage,
    setPatientInitialEpisodeId,
    setPatientInitialTab,
    setSelectedColloqiumId,
    setSelectedColloqiumTab,
    setSelectedCoordinationId,
    setSelectedCoordinationTab,
    setSelectedPatientId,
  ]);

  const handleLogout = () => {
    handleSessionLogout();
    setUserMenuOpen(false);
  };

  const handleQuickCreateCoordination = () => {
    setPage('coordinations');
    resetSelection();
    setCoordinationQuickCreateToken((prev) => prev + 1);
  };

  const startDevForumResize = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = devForumPanelWidth;
    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = startX - moveEvent.clientX;
      const next = Math.min(700, Math.max(320, startWidth + deltaX));
      setDevForumPanelWidth(next);
    };
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  /* ── Auth loading ── */
  if (authLoading) {
    return (
      <div className="login-page">
        <p className="status">{t('app.login.loading', 'Loading...')}</p>
      </div>
    );
  }

  /* ── Login ── */
  if (!user) {
    return (
      <div className="login-page">
        <div className="login-card">
          <h1>{t('app.title', 'TPLK App')}</h1>
          <p className="subtitle">{t('app.login.subtitle', 'Please log in to continue')}</p>
          <form className="login-form" onSubmit={handleLogin}>
            <input
              type="text"
              placeholder={t('app.login.placeholder.extId', 'Enter your User ID (e.g. TKOORD)')}
              value={extId}
              onChange={(e) => setExtId(e.target.value)}
              required
            />
            <button type="submit">{t('app.login.submit', 'Log in')}</button>
          </form>
          {loginError && <p className="login-error">{loginError}</p>}
        </div>
      </div>
    );
  }

  if (preferencesLoading) {
    return (
      <div className="login-page">
        <p className="status">{t('app.login.loading', 'Loading...')}</p>
      </div>
    );
  }

  /* ── Main app ── */
  if (standaloneProtocolId !== null) {
    return (
      <div className="app-layout app-standalone">
        <main className="main-content">
          <ColloquiumDetailView
            colloqiumId={standaloneProtocolId}
            onOpenEpisode={() => undefined}
            onBack={() => window.close()}
            standalone
          />
        </main>
      </div>
    );
  }
  if (standaloneCoordinationProtocolId !== null) {
    return (
      <div className="app-layout app-standalone">
        <main className="main-content">
          <CoordinationDetailView
            coordinationId={standaloneCoordinationProtocolId}
            onBack={() => window.close()}
            onOpenPatientEpisode={() => undefined}
            initialTab="protocol"
          />
        </main>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <AppSidebar
        user={user}
        page={page}
        setPage={setPage}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        userMenuOpen={userMenuOpen}
        setUserMenuOpen={setUserMenuOpen}
        canViewPatients={canViewPatients}
        canViewDonors={canViewDonors}
        canViewColloquiums={canViewColloquiums}
        canViewCoordinations={canViewCoordinations}
        canViewReports={canViewReports}
        canViewAdmin={canViewAdmin}
        devToolsEnabled={devToolsEnabled}
        unreadInformationCount={unreadInformationCount}
        openTaskCount={openTaskCount}
        onResetSelection={resetSelection}
        canGoBack={canGoBack}
        canGoForward={canGoForward}
        hasMarkedLocation={hasMarkedLocation}
        onGoBack={goBack}
        onGoForward={goForward}
        onToggleMarkedLocation={toggleMarkedLocation}
        onQuickCreateCoordination={handleQuickCreateCoordination}
        onOpenPreferences={() => {
          setPage('preferences');
          setUserMenuOpen(false);
        }}
        onLogout={handleLogout}
        devForumPanelOpen={devForumPanelOpen}
        onToggleDevForumPanel={() => setDevForumPanelOpen((prev) => !prev)}
      />
      <div className="app-main-stack">
        <AppMainRouter
          page={page}
          canViewPatients={canViewPatients}
          canViewDonors={canViewDonors}
          canViewColloquiums={canViewColloquiums}
          canViewCoordinations={canViewCoordinations}
          canViewReports={canViewReports}
          canViewAdmin={canViewAdmin}
          devToolsEnabled={devToolsEnabled}
          currentUserId={user.id}
          selectedPatientId={selectedPatientId}
          setSelectedPatientId={setSelectedPatientId}
          selectedColloqiumId={selectedColloqiumId}
          setSelectedColloqiumId={setSelectedColloqiumId}
          selectedColloqiumTab={selectedColloqiumTab}
          setSelectedColloqiumTab={setSelectedColloqiumTab}
          selectedCoordinationId={selectedCoordinationId}
          setSelectedCoordinationId={setSelectedCoordinationId}
          selectedCoordinationTab={selectedCoordinationTab}
          setSelectedCoordinationTab={setSelectedCoordinationTab}
          setPage={setPage}
          patientInitialTab={patientInitialTab}
          setPatientInitialTab={setPatientInitialTab}
          patientInitialEpisodeId={patientInitialEpisodeId}
          setPatientInitialEpisodeId={setPatientInitialEpisodeId}
          onOpenFavorite={openFavorite}
          coordinationQuickCreateToken={coordinationQuickCreateToken}
          onCoordinationQuickCreateHandled={() => setCoordinationQuickCreateToken(0)}
          preferences={preferences}
          startPageOptions={startViewOptions}
          onSavePreferences={async (payload) => {
            const saved = await api.updateMyUserPreferences(payload);
            setPreferences(saved);
            setLocale(saved.locale);
            try {
              const overrides = await api.getTranslationOverrides(saved.locale);
              setRuntimeTranslations(overrides.entries ?? {});
            } catch {
              setRuntimeTranslations({});
            }
          }}
        />
        {devToolsEnabled && devForumPanelOpen ? (
          <>
            <div className="dev-forum-resize-handle" onMouseDown={startDevForumResize} />
            <aside className="dev-forum-panel-shell" style={{ width: `${devForumPanelWidth}px` }}>
              <DevForumPanel hasDevRole={hasDevRole} />
            </aside>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default App;
