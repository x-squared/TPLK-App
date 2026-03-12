import type { Patient } from '../../../api';
import type {
  PatientAbsencesModel,
  PatientContactsModel,
  PatientCoreModel,
} from '../../patient-detail/PatientDetailTabs';

export interface PatientTabProps {
  patient: Patient;
  formatDate: (iso: string | null) => string;
  core: PatientCoreModel;
  contacts: PatientContactsModel;
  absences: PatientAbsencesModel;
}
