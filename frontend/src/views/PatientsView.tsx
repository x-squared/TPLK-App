import TaskBoard from './tasks/TaskBoard';
import { useI18n } from '../i18n/i18n';
import PatientsAddForm from './patients/PatientsAddForm';
import PatientsFilters from './patients/PatientsFilters';
import PatientsTable from './patients/PatientsTable';
import { usePatientsViewModel } from './patients/usePatientsViewModel';
import './layout/PanelLayout.css';
import './PatientsView.css';

interface Props {
  onSelectPatient: (id: number) => void;
}

export default function PatientsView({ onSelectPatient }: Props) {
  const { t } = useI18n();
  const {
    patientDetails,
    loadingDetails,
    loading,
    filterPid,
    setFilterPid,
    filterFirstName,
    setFilterFirstName,
    filterName,
    setFilterName,
    filterDob,
    setFilterDob,
    filterAny,
    setFilterAny,
    filterOrgan,
    setFilterOrgan,
    filterOpenOnly,
    setFilterOpenOnly,
    organCodes,
    expandedContacts,
    expandedEpisodes,
    expandedMedical,
    addingPatient,
    setAddingPatient,
    creatingPatient,
    createPatientError,
    setCreatePatientError,
    selectedTaskPatientId,
    setSelectedTaskPatientId,
    newPatient,
    setNewPatient,
    toggleContacts,
    toggleEpisodes,
    toggleMedical,
    handleCreatePatient,
    filteredPatients,
  } = usePatientsViewModel();

  return (
    <>
      <header className="patients-header">
        <h1>{t('patients.title', 'Patients')}</h1>
        {!addingPatient && (
          <button className="patients-add-btn" onClick={() => setAddingPatient(true)}>
            {t('patients.actions.addPatient', '+ Add Patient')}
          </button>
        )}
      </header>

      {addingPatient && (
        <PatientsAddForm
          newPatient={newPatient}
          setNewPatient={setNewPatient}
          creatingPatient={creatingPatient}
          createPatientError={createPatientError}
          setAddingPatient={setAddingPatient}
          setCreatePatientError={setCreatePatientError}
          handleCreatePatient={handleCreatePatient}
        />
      )}

      <PatientsFilters
        filterAny={filterAny}
        setFilterAny={setFilterAny}
        filterPid={filterPid}
        setFilterPid={setFilterPid}
        filterName={filterName}
        setFilterName={setFilterName}
        filterFirstName={filterFirstName}
        setFilterFirstName={setFilterFirstName}
        filterDob={filterDob}
        setFilterDob={setFilterDob}
        filterOrgan={filterOrgan}
        setFilterOrgan={setFilterOrgan}
        organCodes={organCodes}
        filterOpenOnly={filterOpenOnly}
        setFilterOpenOnly={setFilterOpenOnly}
      />

      {loading ? (
        <p className="status">{t('common.loading', 'Loading...')}</p>
      ) : filteredPatients.length === 0 ? (
        <p className="status">{t('patients.emptyFiltered', 'No patients match the filter.')}</p>
      ) : (
        <PatientsTable
          filteredPatients={filteredPatients}
          expandedContacts={expandedContacts}
          expandedEpisodes={expandedEpisodes}
          expandedMedical={expandedMedical}
          selectedTaskPatientId={selectedTaskPatientId}
          setSelectedTaskPatientId={setSelectedTaskPatientId}
          organCodes={organCodes}
          onSelectPatient={onSelectPatient}
          toggleEpisodes={toggleEpisodes}
          toggleContacts={toggleContacts}
          toggleMedical={toggleMedical}
          loadingDetails={loadingDetails}
          patientDetails={patientDetails}
        />
      )}

      <section className="patients-tasks-section ui-panel-section">
        <TaskBoard
          declaredContextType="ALL"
          criteria={{
            patientId: selectedTaskPatientId ?? undefined,
          }}
          title={t('taskBoard.title', 'Tasks')}
          maxTableHeight={360}
          onAddClick={() => undefined}
          headerMeta={(
            <>
              <p className="patients-tasks-selection-hint">
                ({selectedTaskPatientId !== null
                  ? `${t('patients.tasks.filteredToPatient', 'filtered to patient')} #${selectedTaskPatientId}`
                  : t('patients.tasks.showingAll', 'showing tasks for all patients')})
              </p>
              {selectedTaskPatientId !== null && (
                <button className="patients-clear-selection-btn" onClick={() => setSelectedTaskPatientId(null)}>
                  {t('patients.tasks.clearSelection', 'Clear patient selection')}
                </button>
              )}
            </>
          )}
        />
      </section>
    </>
  );
}
