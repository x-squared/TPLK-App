import type { AppUser } from '../api';

export function useAppPermissions(user: AppUser | null) {
  const hasPermission = (permissionKey: string) => !!user?.permissions?.includes(permissionKey);
  const hasAnyPermission = (permissionKeys: string[]) => permissionKeys.some((entry) => hasPermission(entry));

  return {
    canViewPatients: hasPermission('view.patients'),
    canViewDonors: hasAnyPermission(['view.donors', 'view.donations']),
    canViewColloquiums: hasPermission('view.colloquiums'),
    canViewCoordinations: hasPermission('view.coordinations'),
    canViewReports: hasPermission('view.reports'),
    canViewAdmin: hasPermission('view.admin'),
  };
}
