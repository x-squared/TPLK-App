import type { Favorite, UserPreferences } from '../api';
import type { StartViewOption } from './navigationConfig';
import AdminView from '../views/AdminView';
import ColloquiumDetailView from '../views/ColloquiumDetailView';
import ColloquiumsView from '../views/ColloquiumsView';
import CoordinationDetailView from '../views/CoordinationDetailView';
import CoordinationsView from '../views/CoordinationsView';
import DonorsView from '../views/DonorsView';
import STCSStudyView from '../views/STCSStudyView';
import E2ETestsView from '../views/E2ETestsView';
import DevForumView from '../views/DevForumView';
import GuiTemplateView from '../views/GuiTemplateView';
import MyWorkView from '../views/MyWorkView';
import PatientDetailView from '../views/PatientDetailView';
import PatientsView from '../views/PatientsView';
import PreferencesView from '../views/PreferencesView';
import ReportsView from '../views/ReportsView';
import type { TaskBoardContextTarget } from '../views/tasks/taskBoardTypes';
import type { ColloquiumDetailTab } from '../views/colloquiums/detail/colloquiumDetailViewModelTypes';
import type { CoordinationDetailTab } from '../views/coordinations/detail/useCoordinationDetailViewModel';
import type { PatientDetailTab } from '../views/patient-detail/PatientDetailTabs';

type Page = 'my-work' | 'patients' | 'donors' | 'stcs-study' | 'colloquiums' | 'coordinations' | 'reports' | 'admin' | 'e2e-tests' | 'dev-forum' | 'gui-template' | 'preferences';

interface AppMainRouterProps {
  page: Page;
  canViewPatients: boolean;
  canViewDonors: boolean;
  canViewColloquiums: boolean;
  canViewCoordinations: boolean;
  canViewReports: boolean;
  canViewAdmin: boolean;
  devToolsEnabled: boolean;
  currentUserId: number;
  selectedPatientId: number | null;
  setSelectedPatientId: React.Dispatch<React.SetStateAction<number | null>>;
  selectedColloqiumId: number | null;
  setSelectedColloqiumId: React.Dispatch<React.SetStateAction<number | null>>;
  selectedColloqiumTab: ColloquiumDetailTab | undefined;
  setSelectedColloqiumTab: React.Dispatch<React.SetStateAction<ColloquiumDetailTab | undefined>>;
  selectedCoordinationId: number | null;
  setSelectedCoordinationId: React.Dispatch<React.SetStateAction<number | null>>;
  selectedCoordinationTab: CoordinationDetailTab | undefined;
  setSelectedCoordinationTab: React.Dispatch<React.SetStateAction<CoordinationDetailTab | undefined>>;
  setPage: React.Dispatch<React.SetStateAction<Page>>;
  patientInitialTab: PatientDetailTab | undefined;
  setPatientInitialTab: React.Dispatch<React.SetStateAction<PatientDetailTab | undefined>>;
  patientInitialEpisodeId: number | null;
  setPatientInitialEpisodeId: React.Dispatch<React.SetStateAction<number | null>>;
  onOpenFavorite: (favorite: Favorite) => void;
  coordinationQuickCreateToken: number;
  onCoordinationQuickCreateHandled: () => void;
  preferences: UserPreferences;
  startPageOptions: StartViewOption[];
  onSavePreferences: (payload: UserPreferences) => Promise<void>;
}

export default function AppMainRouter({
  page,
  canViewPatients,
  canViewDonors,
  canViewColloquiums,
  canViewCoordinations,
  canViewReports,
  canViewAdmin,
  devToolsEnabled,
  currentUserId,
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
  setPage,
  patientInitialTab,
  setPatientInitialTab,
  patientInitialEpisodeId,
  setPatientInitialEpisodeId,
  onOpenFavorite,
  coordinationQuickCreateToken,
  onCoordinationQuickCreateHandled,
  preferences,
  startPageOptions,
  onSavePreferences,
}: AppMainRouterProps) {
  return (
    <main className="main-content">
      {page === 'my-work' && (
        <MyWorkView
          onOpenFavorite={onOpenFavorite}
          currentUserId={currentUserId}
          onOpenTaskContext={(target: TaskBoardContextTarget) => {
            if (target.type === 'COORDINATION' && canViewCoordinations) {
              setPage('coordinations');
              setSelectedPatientId(null);
              setSelectedColloqiumId(null);
              setSelectedColloqiumTab(undefined);
              setPatientInitialTab(undefined);
              setPatientInitialEpisodeId(null);
              setSelectedCoordinationId(target.coordinationId);
              setSelectedCoordinationTab(undefined);
              return;
            }
            if (target.type === 'COLLOQUIUM' && canViewColloquiums) {
              setPage('colloquiums');
              setSelectedPatientId(null);
              setSelectedCoordinationId(null);
              setSelectedCoordinationTab(undefined);
              setPatientInitialTab(undefined);
              setPatientInitialEpisodeId(null);
              setSelectedColloqiumId(target.colloqiumId);
              setSelectedColloqiumTab(undefined);
              return;
            }
            if (target.type === 'EPISODE' && canViewPatients) {
              setPage('patients');
              setSelectedColloqiumId(null);
              setSelectedColloqiumTab(undefined);
              setSelectedCoordinationId(null);
              setSelectedCoordinationTab(undefined);
              setSelectedPatientId(target.patientId);
              setPatientInitialTab('episodes');
              setPatientInitialEpisodeId(target.episodeId);
              return;
            }
            if (target.type === 'PATIENT' && canViewPatients) {
              setPage('patients');
              setSelectedColloqiumId(null);
              setSelectedColloqiumTab(undefined);
              setSelectedCoordinationId(null);
              setSelectedCoordinationTab(undefined);
              setSelectedPatientId(target.patientId);
              setPatientInitialTab(undefined);
              setPatientInitialEpisodeId(null);
            }
          }}
        />
      )}
      {page === 'patients' && canViewPatients && !selectedPatientId && (
        <PatientsView
          onSelectPatient={(id) => {
            setPatientInitialTab(undefined);
            setPatientInitialEpisodeId(null);
            setSelectedPatientId(id);
          }}
        />
      )}
      {page === 'patients' && canViewPatients && selectedPatientId && (
        <PatientDetailView
          patientId={selectedPatientId}
          initialTab={patientInitialTab}
          initialEpisodeId={patientInitialEpisodeId}
          onOpenColloqium={(colloqiumId) => {
            setPage('colloquiums');
            setSelectedCoordinationId(null);
            setSelectedCoordinationTab(undefined);
            setSelectedPatientId(null);
            setPatientInitialTab(undefined);
            setPatientInitialEpisodeId(null);
            setSelectedColloqiumId(colloqiumId);
            setSelectedColloqiumTab(undefined);
          }}
          onTabChange={setPatientInitialTab}
          onBack={() => {
            setSelectedPatientId(null);
            setPatientInitialTab(undefined);
            setPatientInitialEpisodeId(null);
          }}
        />
      )}
      {page === 'donors' && canViewDonors && <DonorsView />}
      {page === 'stcs-study' && canViewDonors && <STCSStudyView />}
      {page === 'colloquiums' && canViewColloquiums && selectedColloqiumId === null && (
        <ColloquiumsView onOpenColloqium={(id) => setSelectedColloqiumId(id)} />
      )}
      {page === 'colloquiums' && canViewColloquiums && selectedColloqiumId !== null && (
        <ColloquiumDetailView
          colloqiumId={selectedColloqiumId}
          initialTab={selectedColloqiumTab}
          onTabChange={setSelectedColloqiumTab}
          onOpenEpisode={(patientId, episodeId) => {
            setPage('patients');
            setSelectedColloqiumId(null);
            setSelectedColloqiumTab(undefined);
            setSelectedCoordinationId(null);
            setSelectedCoordinationTab(undefined);
            setSelectedPatientId(patientId);
            setPatientInitialTab('episodes');
            setPatientInitialEpisodeId(episodeId);
          }}
          onBack={() => {
            setSelectedColloqiumId(null);
            setSelectedColloqiumTab(undefined);
          }}
        />
      )}
      {page === 'coordinations' && canViewCoordinations && selectedCoordinationId === null && (
        <CoordinationsView
          onOpenCoordination={(id) => {
            setSelectedCoordinationId(id);
            setSelectedCoordinationTab(undefined);
          }}
          onOpenPatientEpisode={(patientId, episodeId) => {
            setPage('patients');
            setSelectedColloqiumId(null);
            setSelectedColloqiumTab(undefined);
            setSelectedCoordinationId(null);
            setSelectedCoordinationTab(undefined);
            setSelectedPatientId(patientId);
            setPatientInitialTab('episodes');
            setPatientInitialEpisodeId(episodeId);
          }}
          quickCreateToken={coordinationQuickCreateToken}
          onQuickCreateHandled={onCoordinationQuickCreateHandled}
        />
      )}
      {page === 'coordinations' && canViewCoordinations && selectedCoordinationId !== null && (
        <CoordinationDetailView
          coordinationId={selectedCoordinationId}
          initialTab={selectedCoordinationTab}
          onTabChange={setSelectedCoordinationTab}
          onBack={() => {
            setSelectedCoordinationId(null);
            setSelectedCoordinationTab(undefined);
          }}
          onOpenPatientEpisode={(patientId, episodeId) => {
            setPage('patients');
            setSelectedColloqiumId(null);
            setSelectedColloqiumTab(undefined);
            setSelectedPatientId(patientId);
            setPatientInitialTab('episodes');
            setPatientInitialEpisodeId(episodeId);
          }}
        />
      )}
      {page === 'reports' && canViewReports && <ReportsView />}
      {page === 'admin' && canViewAdmin && <AdminView />}
      {page === 'preferences' && (
        <PreferencesView
          initialPreferences={preferences}
          startPageOptions={startPageOptions}
          onSavePreferences={onSavePreferences}
        />
      )}
      {page === 'e2e-tests' && devToolsEnabled && <E2ETestsView />}
      {page === 'gui-template' && devToolsEnabled && <GuiTemplateView />}
      {page === 'dev-forum' && devToolsEnabled && <DevForumView />}
    </main>
  );
}
