import type React from 'react';
import type { PatientCreate } from '../../api';
import { useI18n } from '../../i18n/i18n';
import ErrorBanner from '../layout/ErrorBanner';

interface Props {
  newPatient: PatientCreate;
  setNewPatient: React.Dispatch<React.SetStateAction<PatientCreate>>;
  creatingPatient: boolean;
  createPatientError: string;
  setAddingPatient: React.Dispatch<React.SetStateAction<boolean>>;
  setCreatePatientError: React.Dispatch<React.SetStateAction<string>>;
  handleCreatePatient: () => Promise<void>;
}

export default function PatientsAddForm({
  newPatient,
  setNewPatient,
  creatingPatient,
  createPatientError,
  setAddingPatient,
  setCreatePatientError,
  handleCreatePatient,
}: Props) {
  const { t } = useI18n();
  return (
    <div className="patients-add-form">
      <input
        type="text"
        placeholder={t('patients.addForm.pidRequired', 'PID *')}
        value={newPatient.pid}
        onChange={(e) => setNewPatient((p) => ({ ...p, pid: e.target.value }))}
      />
      <input
        type="text"
        placeholder={t('patients.addForm.firstNameRequired', 'First name *')}
        value={newPatient.first_name}
        onChange={(e) => setNewPatient((p) => ({ ...p, first_name: e.target.value }))}
      />
      <input
        type="text"
        placeholder={t('patients.addForm.lastNameRequired', 'Name *')}
        value={newPatient.name}
        onChange={(e) => setNewPatient((p) => ({ ...p, name: e.target.value }))}
      />
      <input
        type="date"
        value={newPatient.date_of_birth ?? ''}
        onChange={(e) => setNewPatient((p) => ({ ...p, date_of_birth: e.target.value }))}
      />
      <div className="patients-add-actions">
        <button
          className="patients-save-btn"
          onClick={handleCreatePatient}
          disabled={creatingPatient || !newPatient.pid?.trim() || !newPatient.first_name?.trim() || !newPatient.name?.trim() || !newPatient.date_of_birth}
        >
          {creatingPatient ? t('coordinations.form.saving', 'Saving...') : t('actions.save', 'Save')}
        </button>
        <button
          className="patients-cancel-btn"
          onClick={() => {
            setAddingPatient(false);
            setCreatePatientError('');
          }}
          disabled={creatingPatient}
        >
          {t('actions.cancel', 'Cancel')}
        </button>
      </div>
      <ErrorBanner message={createPatientError} />
    </div>
  );
}
