import type { AppStartPage, UserPreferences } from '../../api';
import type { StartViewOption } from '../../app/navigationConfig';

export interface PreferencesGeneralModel {
  locale: 'en' | 'de';
  startPage: AppStartPage;
  startPageOptions: StartViewOption[];
  editing: boolean;
  saving: boolean;
  dirty: boolean;
  setLocale: (locale: 'en' | 'de') => void;
  setStartPage: (startPage: AppStartPage) => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
}

export interface PreferencesActionsModel {
  saveError: string;
  saveSuccess: string;
}

export interface PreferencesViewModel {
  general: PreferencesGeneralModel;
  actions: PreferencesActionsModel;
}

export interface PreferencesViewProps {
  initialPreferences: UserPreferences;
  startPageOptions: StartViewOption[];
  onSavePreferences: (payload: UserPreferences) => Promise<void>;
}
