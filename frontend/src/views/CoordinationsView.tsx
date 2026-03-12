import { useEffect, useState } from 'react';
import { useI18n } from '../i18n/i18n';
import { COMMON_I18N_KEYS, COORDINATION_I18N_KEYS } from '../i18n/keys';
import CoordinationsTable from './coordinations/list/CoordinationsTable';
import { useCoordinationsListViewModel } from './coordinations/list/useCoordinationsListViewModel';
import './layout/PanelLayout.css';
import './PatientsView.css';
import './CoordinationsView.css';

interface Props {
  onOpenCoordination: (id: number) => void;
  onOpenPatientEpisode?: (patientId: number, episodeId: number) => void;
  quickCreateToken?: number;
  onQuickCreateHandled?: () => void;
}

export default function CoordinationsView({
  onOpenCoordination,
  onOpenPatientEpisode,
  quickCreateToken = 0,
  onQuickCreateHandled,
}: Props) {
  const { t } = useI18n();
  const {
    loading,
    loadError,
    rows,
    filterAny,
    setFilterAny,
    adding,
    setAdding,
    creating,
    createError,
    handleCreate,
    deathKindCodes,
    startDateInput,
    donorFullName,
    donorBirthDateInput,
    form,
    setFormDate,
    setDonorFullName,
    setDonorBirthDate,
    setDonorDeathKind,
    setFormField,
    resetCreate,
    expandedEpisodesCoordinationId,
    episodesByCoordinationId,
    patientById,
    loadingEpisodesByCoordinationId,
    toggleAssignedEpisodes,
  } = useCoordinationsListViewModel();
  const [donorFocusToken, setDonorFocusToken] = useState(0);

  useEffect(() => {
    if (quickCreateToken <= 0) {
      return;
    }
    setAdding(true);
    setDonorFocusToken((prev) => prev + 1);
    onQuickCreateHandled?.();
  }, [onQuickCreateHandled, quickCreateToken, setAdding]);

  return (
    <>
      <header className="patients-header">
        <h1>{t(COORDINATION_I18N_KEYS.title, 'Coordinations')}</h1>
        <button className="patients-add-btn" onClick={() => setAdding(true)} disabled={adding}>
          {t(COORDINATION_I18N_KEYS.actions.add, '+ Add')}
        </button>
      </header>
      <div className="filter-bar">
        <input
          type="text"
          placeholder={t(COORDINATION_I18N_KEYS.filters.searchPlaceholder, 'Search across coordinations')}
          value={filterAny}
          onChange={(event) => setFilterAny(event.target.value)}
        />
      </div>
      {loading ? (
        <p className="status">{t(COMMON_I18N_KEYS.loading, 'Loading...')}</p>
      ) : loadError ? (
        <p className="status">{loadError}</p>
      ) : (
        <CoordinationsTable
          rows={rows}
          onOpenCoordination={onOpenCoordination}
          adding={adding}
          creating={creating}
          createError={createError}
          deathKindCodes={deathKindCodes}
          startDateInput={startDateInput}
          donorFullName={donorFullName}
          donorBirthDateInput={donorBirthDateInput}
          donorDeathKindId={form.donor_death_kind_id ?? null}
          donorNr={form.donor_nr ?? ''}
          swtplNr={form.swtpl_nr ?? ''}
          nationalCoordinator={form.national_coordinator ?? ''}
          comment={form.comment ?? ''}
          onDateChange={setFormDate}
          onDonorFullNameChange={setDonorFullName}
          onDonorBirthDateChange={setDonorBirthDate}
          onDonorDeathKindChange={setDonorDeathKind}
          onFieldChange={setFormField}
          donorFocusToken={donorFocusToken}
          expandedEpisodesCoordinationId={expandedEpisodesCoordinationId}
          episodesByCoordinationId={episodesByCoordinationId}
          patientById={patientById}
          loadingEpisodesByCoordinationId={loadingEpisodesByCoordinationId}
          onToggleAssignedEpisodes={toggleAssignedEpisodes}
          onOpenPatientEpisode={onOpenPatientEpisode}
          hasActiveFilter={filterAny.trim().length > 0}
          onSave={() => {
            void (async () => {
              const createdId = await handleCreate();
              if (typeof createdId === 'number') {
                onOpenCoordination(createdId);
              }
            })();
          }}
          onCancel={resetCreate}
        />
      )}
    </>
  );
}
