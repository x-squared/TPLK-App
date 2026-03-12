import type { AppStartPage } from '../api';

export interface StartViewOption {
  key: AppStartPage;
  labelKey: string;
  englishDefault: string;
}

export interface NavigationAccess {
  canViewPatients: boolean;
  canViewDonors: boolean;
  canViewColloquiums: boolean;
  canViewCoordinations: boolean;
  canViewReports: boolean;
  canViewAdmin: boolean;
  devToolsEnabled: boolean;
}

const START_VIEW_LABELS: Record<AppStartPage, { labelKey: string; englishDefault: string }> = {
  'my-work': { labelKey: 'sidebar.nav.myWork', englishDefault: 'My Work' },
  patients: { labelKey: 'sidebar.nav.recipients', englishDefault: 'Recipients' },
  donors: { labelKey: 'sidebar.nav.donors', englishDefault: 'Donors' },
  colloquiums: { labelKey: 'sidebar.nav.colloquiums', englishDefault: 'Colloquiums' },
  coordinations: { labelKey: 'sidebar.nav.coordinations', englishDefault: 'Coordinations' },
  reports: { labelKey: 'sidebar.nav.reports', englishDefault: 'Reports' },
  admin: { labelKey: 'sidebar.nav.admin', englishDefault: 'Admin' },
  'e2e-tests': { labelKey: 'navigation.dev.e2eTests', englishDefault: 'E2E Tests' },
  'dev-forum': { labelKey: 'navigation.dev.devForum', englishDefault: 'Dev-Forum' },
};

export function buildStartViewOptions(access: NavigationAccess): StartViewOption[] {
  const options: StartViewOption[] = [{ key: 'my-work', ...START_VIEW_LABELS['my-work'] }];
  if (access.canViewPatients) options.push({ key: 'patients', ...START_VIEW_LABELS.patients });
  if (access.canViewDonors) options.push({ key: 'donors', ...START_VIEW_LABELS.donors });
  if (access.canViewColloquiums) options.push({ key: 'colloquiums', ...START_VIEW_LABELS.colloquiums });
  if (access.canViewCoordinations) options.push({ key: 'coordinations', ...START_VIEW_LABELS.coordinations });
  if (access.canViewReports) options.push({ key: 'reports', ...START_VIEW_LABELS.reports });
  if (access.canViewAdmin) options.push({ key: 'admin', ...START_VIEW_LABELS.admin });
  if (access.devToolsEnabled) options.push({ key: 'e2e-tests', ...START_VIEW_LABELS['e2e-tests'] });
  if (access.devToolsEnabled) options.push({ key: 'dev-forum', ...START_VIEW_LABELS['dev-forum'] });
  return options;
}
