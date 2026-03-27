import type { AppUser } from '../api';
import { useI18n } from '../i18n/i18n';

type Page = 'my-work' | 'patients' | 'donors' | 'stcs-study' | 'colloquiums' | 'coordinations' | 'reports' | 'admin' | 'e2e-tests' | 'dev-forum' | 'gui-template' | 'preferences';

interface AppSidebarProps {
  user: AppUser;
  page: Page;
  setPage: (page: Page) => void;
  sidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  userMenuOpen: boolean;
  setUserMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  canViewPatients: boolean;
  canViewDonors: boolean;
  canViewColloquiums: boolean;
  canViewCoordinations: boolean;
  canViewReports: boolean;
  canViewAdmin: boolean;
  devToolsEnabled: boolean;
  unreadInformationCount: number;
  openTaskCount: number;
  onResetSelection: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
  hasMarkedLocation: boolean;
  onGoBack: () => void;
  onGoForward: () => void;
  onToggleMarkedLocation: () => void;
  onQuickCreateCoordination: () => void;
  onOpenPreferences: () => void;
  onLogout: () => void;
  devForumPanelOpen: boolean;
  onToggleDevForumPanel: () => void;
}

export default function AppSidebar({
  user,
  page,
  setPage,
  sidebarOpen,
  setSidebarOpen,
  userMenuOpen,
  setUserMenuOpen,
  canViewPatients,
  canViewDonors,
  canViewColloquiums,
  canViewCoordinations,
  canViewReports,
  canViewAdmin,
  devToolsEnabled,
  unreadInformationCount,
  openTaskCount,
  onResetSelection,
  canGoBack,
  canGoForward,
  hasMarkedLocation,
  onGoBack,
  onGoForward,
  onToggleMarkedLocation,
  onQuickCreateCoordination,
  onOpenPreferences,
  onLogout,
  devForumPanelOpen,
  onToggleDevForumPanel,
}: AppSidebarProps) {
  const { t } = useI18n();

  return (
    <aside className={`sidebar ${sidebarOpen ? 'open' : 'collapsed'}`}>
      <div className="sidebar-top">
        <button
          className="sidebar-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          title={sidebarOpen ? t('sidebar.actions.collapse', 'Collapse') : t('sidebar.actions.expand', 'Expand')}
        >
          {sidebarOpen ? '\u2039' : '\u203A'}
        </button>
        {sidebarOpen && <span className="sidebar-brand">{t('sidebar.brand', 'TPL App')}</span>}
        {sidebarOpen && canViewCoordinations ? (
          <button
            type="button"
            className="sidebar-alert-btn"
            title={t('sidebar.actions.createCoordinationNow', 'Create coordination now')}
            aria-label={t('sidebar.actions.createCoordinationNow', 'Create coordination now')}
            onClick={onQuickCreateCoordination}
          />
        ) : null}
      </div>

      <nav className="sidebar-nav">
        <button
          className={`nav-item ${page === 'my-work' ? 'active' : ''}`}
          onClick={() => {
            setPage('my-work');
            onResetSelection();
          }}
          title={`${t('sidebar.nav.myWork', 'My Work')} (${openTaskCount} | ${unreadInformationCount})`}
        >
          <span className="nav-icon">{'\u2606'}</span>
          {sidebarOpen && <span className="nav-label">{`${t('sidebar.nav.myWork', 'My Work')} (${openTaskCount} | ${unreadInformationCount})`}</span>}
        </button>
        {canViewPatients && (
          <button
            className={`nav-item ${page === 'patients' ? 'active' : ''}`}
            onClick={() => {
              setPage('patients');
              onResetSelection();
            }}
            title={t('sidebar.nav.recipients', 'Recipients')}
          >
            <span className="nav-icon">{'\u2695'}</span>
            {sidebarOpen && <span className="nav-label">{t('sidebar.nav.recipients', 'Recipients')}</span>}
          </button>
        )}
        {canViewDonors && (
          <button
            className={`nav-item ${page === 'donors' ? 'active' : ''}`}
            onClick={() => {
              setPage('donors');
              onResetSelection();
            }}
            title={t('sidebar.nav.donors', 'Donors')}
          >
            <span className="nav-icon">{'\u25C8'}</span>
            {sidebarOpen && <span className="nav-label">{t('sidebar.nav.donors', 'Donors')}</span>}
          </button>
        )}
        {canViewDonors && (
          <button
            className={`nav-item ${page === 'stcs-study' ? 'active' : ''}`}
            onClick={() => {
              setPage('stcs-study');
              onResetSelection();
            }}
            title={t('sidebar.nav.stcsStudy', 'STCS Study')}
          >
            <span className="nav-icon">{'\u263A'}</span>
            {sidebarOpen && <span className="nav-label">{t('sidebar.nav.stcsStudy', 'STCS Study')}</span>}
          </button>
        )}
        {canViewColloquiums && (
          <button
            className={`nav-item ${page === 'colloquiums' ? 'active' : ''}`}
            onClick={() => {
              setPage('colloquiums');
              onResetSelection();
            }}
            title={t('sidebar.nav.colloquiums', 'Colloquiums')}
          >
            <span className="nav-icon">{'\u2263'}</span>
            {sidebarOpen && <span className="nav-label">{t('sidebar.nav.colloquiums', 'Colloquiums')}</span>}
          </button>
        )}
        {canViewCoordinations && (
          <button
            className={`nav-item ${page === 'coordinations' ? 'active' : ''}`}
            onClick={() => {
              setPage('coordinations');
              onResetSelection();
            }}
            title={t('sidebar.nav.coordinations', 'Coordinations')}
          >
            <span className="nav-icon">{'\u23F1'}</span>
            {sidebarOpen && <span className="nav-label">{t('sidebar.nav.coordinations', 'Coordinations')}</span>}
          </button>
        )}
        {canViewReports && (
          <button
            className={`nav-item ${page === 'reports' ? 'active' : ''}`}
            onClick={() => {
              setPage('reports');
              onResetSelection();
            }}
            title={t('sidebar.nav.reports', 'Reports')}
          >
            <span className="nav-icon">{'\u25A4'}</span>
            {sidebarOpen && <span className="nav-label">{t('sidebar.nav.reports', 'Reports')}</span>}
          </button>
        )}
        {canViewAdmin && (
          <>
            <div className="nav-divider-dev" aria-hidden="true">
              <span className="nav-divider-line" />
              {sidebarOpen && <span className="nav-divider-label">{t('sidebar.sections.admin', 'ADMIN')}</span>}
              <span className="nav-divider-line" />
            </div>
            <button
              className={`nav-item ${page === 'admin' ? 'active' : ''}`}
              onClick={() => {
                setPage('admin');
                onResetSelection();
              }}
              title={t('sidebar.nav.admin', 'Admin')}
            >
              <span className="nav-icon">{'\u2699'}</span>
              {sidebarOpen && <span className="nav-label">{t('sidebar.nav.admin', 'Admin')}</span>}
            </button>
          </>
        )}
        {devToolsEnabled && (
          <>
            <div className="nav-divider-dev" aria-hidden="true">
              <span className="nav-divider-line" />
              {sidebarOpen && <span className="nav-divider-label">{t('sidebar.sections.dev', 'DEV')}</span>}
              <span className="nav-divider-line" />
            </div>
            <button
              className={`nav-item ${page === 'e2e-tests' ? 'active' : ''}`}
              onClick={() => {
                setPage('e2e-tests');
                onResetSelection();
              }}
              title={t('navigation.dev.e2eTests', 'E2E Tests')}
            >
              <span className="nav-icon">{'\u2699'}</span>
              {sidebarOpen && <span className="nav-label">{t('navigation.dev.e2eTests', 'E2E Tests')}</span>}
            </button>
            <button
              className={`nav-item ${page === 'gui-template' ? 'active' : ''}`}
              onClick={() => {
                setPage('gui-template');
                onResetSelection();
              }}
              title={t('navigation.dev.guiTemplate', 'GUI Template')}
            >
              <span className="nav-icon">{'\u25A6'}</span>
              {sidebarOpen && <span className="nav-label">{t('navigation.dev.guiTemplate', 'GUI Template')}</span>}
            </button>
            <div className={`nav-item-with-toggle ${page === 'dev-forum' ? 'active' : ''}`}>
              <button
                className={`nav-item ${page === 'dev-forum' ? 'active' : ''}`}
                onClick={() => {
                  setPage('dev-forum');
                  onResetSelection();
                }}
                title={t('navigation.dev.devForum', 'Dev-Forum')}
              >
                <span className="nav-icon">{'\u270E'}</span>
                {sidebarOpen && <span className="nav-label">{t('navigation.dev.devForum', 'Dev-Forum')}</span>}
              </button>
              <button
                className={`history-nav-btn dev-forum-panel-toggle ${devForumPanelOpen ? 'enabled' : 'disabled'}`}
                type="button"
                onClick={onToggleDevForumPanel}
                title={devForumPanelOpen
                  ? t('devForum.panel.hide', 'Hide Dev-Forum panel')
                  : t('devForum.panel.show', 'Show Dev-Forum panel')}
                aria-label={devForumPanelOpen
                  ? t('devForum.panel.hide', 'Hide Dev-Forum panel')
                  : t('devForum.panel.show', 'Show Dev-Forum panel')}
              >
                {devForumPanelOpen ? '\u25B6' : '\u25C0'}
              </button>
            </div>
          </>
        )}
      </nav>

      <div className="sidebar-history" aria-label={t('sidebar.history.label', 'Navigation history')}>
        <button
          className={`history-nav-btn ${canGoBack ? 'enabled' : 'disabled'}`}
          onClick={onGoBack}
          disabled={!canGoBack}
          title={t('sidebar.history.back', 'Go back')}
          type="button"
        >
          {canGoBack ? '\u25C0' : '\u25C1'}
        </button>
        <button
          className={`history-nav-btn history-mark-btn ${hasMarkedLocation ? 'enabled' : 'disabled'}`}
          onClick={onToggleMarkedLocation}
          title={hasMarkedLocation
            ? t('sidebar.history.returnToMarkedLocation', 'Return to marked location')
            : t('sidebar.history.markCurrentLocation', 'Mark current location')}
          type="button"
        >
          {hasMarkedLocation ? '\u25CF' : '\u25CB'}
        </button>
        <button
          className={`history-nav-btn ${canGoForward ? 'enabled' : 'disabled'}`}
          onClick={onGoForward}
          disabled={!canGoForward}
          title={t('sidebar.history.forward', 'Go forward')}
          type="button"
        >
          {canGoForward ? '\u25B6' : '\u25B7'}
        </button>
      </div>

      <div className="sidebar-bottom">
        <button
          className="nav-item user-trigger"
          onClick={() => setUserMenuOpen(!userMenuOpen)}
          title={user.name}
        >
          <span className="nav-icon user-avatar">
            {user.name.charAt(0).toUpperCase()}
          </span>
          {sidebarOpen && <span className="nav-label">{user.name}</span>}
        </button>
        {userMenuOpen && (
          <div className="user-menu">
            <div className="user-menu-info">
              <strong>{user.name}</strong>
              <span>{user.ext_id}</span>
            </div>
            <button
              className="user-menu-action"
              onClick={onOpenPreferences}
            >
              {t('sidebar.user.preferences', 'Preferences')}
            </button>
            <button className="user-menu-action" onClick={onLogout}>
              {t('sidebar.user.logout', 'Log out')}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
