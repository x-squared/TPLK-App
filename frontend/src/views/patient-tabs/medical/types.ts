import type { Patient } from '../../../api';
import type {
  PatientCoreModel,
  PatientDiagnosesModel,
  PatientMedicalValuesModel,
} from '../../patient-detail/PatientDetailTabs';

export interface MedicalDataTabProps {
  patient: Patient;
  formatDate: (iso: string | null) => string;
  core: PatientCoreModel;
  diagnoses: PatientDiagnosesModel;
  medicalValues: PatientMedicalValuesModel;
}
