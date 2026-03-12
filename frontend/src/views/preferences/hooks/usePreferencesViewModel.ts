import { useEffect, useMemo, useState } from 'react';
import type { AppStartPage, UserPreferences } from '../../../api';
import type { StartViewOption } from '../../../app/navigationConfig';
import type { PreferencesViewModel } from '../types';

interface UsePreferencesViewModelArgs {
  initialPreferences: UserPreferences;
  startPageOptions: StartViewOption[];
  onSavePreferences: (payload: UserPreferences) => Promise<void>;
}

export function usePreferencesViewModel({
  initialPreferences,
  startPageOptions,
  onSavePreferences,
}: UsePreferencesViewModelArgs): PreferencesViewModel {
  const allowedStartPages = useMemo(
    () => startPageOptions.map((option) => option.key),
    [startPageOptions],
  );
  const resolvedInitialStartPage: AppStartPage = allowedStartPages.includes(initialPreferences.start_page)
    ? initialPreferences.start_page
    : (allowedStartPages[0] ?? 'my-work');
  const [locale, setLocale] = useState<'en' | 'de'>(initialPreferences.locale);
  const [startPage, setStartPage] = useState<AppStartPage>(resolvedInitialStartPage);
  const [editing, setEditing] = useState(false);
  const [originalLocale, setOriginalLocale] = useState<'en' | 'de'>(initialPreferences.locale);
  const [originalStartPage, setOriginalStartPage] = useState<AppStartPage>(resolvedInitialStartPage);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  useEffect(() => {
    if (allowedStartPages.includes(startPage)) return;
    setStartPage(allowedStartPages[0] ?? 'my-work');
  }, [allowedStartPages, startPage]);

  const onSave = async () => {
    setSaving(true);
    setSaveError('');
    setSaveSuccess('');
    try {
      await onSavePreferences({
        locale,
        start_page: startPage,
      });
      setOriginalLocale(locale);
      setOriginalStartPage(startPage);
      setEditing(false);
      setSaveSuccess('Preferences saved.');
    } catch {
      setSaveError('Could not save preferences.');
    } finally {
      setSaving(false);
    }
  };

  const onEdit = () => {
    setSaveError('');
    setSaveSuccess('');
    setEditing(true);
  };

  const onCancel = () => {
    setLocale(originalLocale);
    setStartPage(originalStartPage);
    setSaveError('');
    setSaveSuccess('');
    setEditing(false);
  };

  const dirty = locale !== originalLocale || startPage !== originalStartPage;

  return {
    general: {
      locale,
      startPage,
      startPageOptions,
      editing,
      saving,
      dirty,
      setLocale,
      setStartPage,
      onEdit,
      onSave,
      onCancel,
    },
    actions: {
      saveError,
      saveSuccess,
    },
  };
}
