import type React from 'react';
import type {
  Absence,
  AbsenceCreate,
  AbsenceUpdate,
  AppUser,
  Code,
  ContactInfo,
  ContactInfoCreate,
  ContactInfoUpdate,
  DiagnosisCreate,
  DiagnosisUpdate,
  Episode,
  EpisodeCreate,
  EpisodeUpdate,
  MedicalValue,
  MedicalValueCreate,
  MedicalValueGroup,
  MedicalValueTemplate,
  MedicalValueUpdate,
  Patient,
} from '../../api';
import EpisodesTab from '../patient-tabs/EpisodesTab';
import MedicalDataTab from '../patient-tabs/MedicalDataTab';
import PatientTab from '../patient-tabs/PatientTab';
import TasksTab from '../patient-tabs/TasksTab';

export type PatientDetailTab = 'patient' | 'medical' | 'episodes' | 'tasks';

export interface PatientFormState {
  pid: string;
  first_name: string;
  name: string;
  date_of_birth: string;
  date_of_death: string;
  ahv_nr: string;
  lang: string;
  sex_id: number | null;
  resp_coord_id: number | null;
  translate: boolean;
}

export interface PatientCoreModel {
  editing: boolean;
  startEditing: () => void;
  saving: boolean;
  handleSave: () => Promise<void>;
  cancelEditing: () => void;
  form: PatientFormState;
  setForm: React.Dispatch<React.SetStateAction<PatientFormState>>;
  setField: (key: keyof PatientFormState, value: string | boolean) => void;
  languages: Code[];
  sexCodes: Code[];
  coordUsers: AppUser[];
}

export interface PatientContactsModel {
  addingContact: boolean;
  setAddingContact: React.Dispatch<React.SetStateAction<boolean>>;
  sortedContactInfos: ContactInfo[];
  editingCiId: number | null;
  ciEditForm: ContactInfoUpdate;
  setCiEditForm: React.Dispatch<React.SetStateAction<ContactInfoUpdate>>;
  ciSaving: boolean;
  handleSaveCi: () => Promise<void>;
  cancelEditingCi: () => void;
  ciDragId: number | null;
  ciDragOverId: number | null;
  setCiDragId: React.Dispatch<React.SetStateAction<number | null>>;
  setCiDragOverId: React.Dispatch<React.SetStateAction<number | null>>;
  handleCiDrop: (targetId: number) => Promise<void>;
  startEditingCi: (ci: ContactInfo) => void;
  confirmDeleteId: number | null;
  setConfirmDeleteId: React.Dispatch<React.SetStateAction<number | null>>;
  handleDeleteContact: (contactId: number) => Promise<void>;
  contactTypes: Code[];
  contactUseTypes: Code[];
  ciForm: ContactInfoCreate;
  setCiForm: React.Dispatch<React.SetStateAction<ContactInfoCreate>>;
  handleAddContact: () => Promise<void>;
}

export interface PatientAbsencesModel {
  addingAbsence: boolean;
  setAddingAbsence: React.Dispatch<React.SetStateAction<boolean>>;
  sortedAbsences: Absence[];
  editingAbId: number | null;
  abEditForm: AbsenceUpdate;
  setAbEditForm: React.Dispatch<React.SetStateAction<AbsenceUpdate>>;
  abSaving: boolean;
  handleSaveAb: () => Promise<void>;
  cancelEditingAb: () => void;
  startEditingAb: (ab: Absence) => void;
  confirmDeleteAbId: number | null;
  setConfirmDeleteAbId: React.Dispatch<React.SetStateAction<number | null>>;
  handleDeleteAbsence: (id: number) => Promise<void>;
  abForm: AbsenceCreate;
  setAbForm: React.Dispatch<React.SetStateAction<AbsenceCreate>>;
  handleAddAbsence: () => Promise<void>;
}

export interface PatientEpisodesModel {
  addingEpisode: boolean;
  setAddingEpisode: React.Dispatch<React.SetStateAction<boolean>>;
  editingEpId: number | null;
  epEditForm: EpisodeUpdate;
  setEpEditForm: React.Dispatch<React.SetStateAction<EpisodeUpdate>>;
  epSaving: boolean;
  handleSaveEp: () => Promise<void>;
  cancelEditingEp: () => void;
  startEditingEp: (ep: Episode) => void;
  confirmDeleteEpId: number | null;
  setConfirmDeleteEpId: React.Dispatch<React.SetStateAction<number | null>>;
  handleDeleteEpisode: (id: number) => Promise<void>;
  organCodes: Code[];
  tplStatusCodes: Code[];
  epForm: EpisodeCreate;
  setEpForm: React.Dispatch<React.SetStateAction<EpisodeCreate>>;
  handleAddEpisode: () => Promise<void>;
}

export interface PatientDiagnosesModel {
  addingDiag: boolean;
  setAddingDiag: React.Dispatch<React.SetStateAction<boolean>>;
  diagCodes: Code[];
  diagForm: DiagnosisCreate;
  setDiagForm: React.Dispatch<React.SetStateAction<DiagnosisCreate>>;
  diagSaving: boolean;
  handleAddDiag: () => Promise<void>;
  editingDiagId: number | null;
  diagEditForm: DiagnosisUpdate;
  setDiagEditForm: React.Dispatch<React.SetStateAction<DiagnosisUpdate>>;
  handleSaveDiag: () => Promise<void>;
  cancelEditingDiag: () => void;
  startEditingDiag: (d: { id: number; catalogue_id: number; comment: string; is_main: boolean }) => void;
  confirmDeleteDiagId: number | null;
  setConfirmDeleteDiagId: React.Dispatch<React.SetStateAction<number | null>>;
  handleDeleteDiag: (id: number) => Promise<void>;
}

export interface PatientMedicalValuesModel {
  addingMv: boolean;
  setAddingMv: React.Dispatch<React.SetStateAction<boolean>>;
  handleAddAllMv: () => Promise<void>;
  mvSaving: boolean;
  sortedMedicalValues: MedicalValue[];
  groupedMedicalValues: Array<{ group: MedicalValueGroup; values: MedicalValue[] }>;
  medicalValueGroups: MedicalValueGroup[];
  toggleMvSort: (key: 'pos' | 'name' | 'renew_date') => void;
  mvSortIndicator: (key: 'pos' | 'name' | 'renew_date') => string;
  editingMvId: number | null;
  mvEditForm: MedicalValueUpdate;
  setMvEditForm: React.Dispatch<React.SetStateAction<MedicalValueUpdate>>;
  mvTemplates: MedicalValueTemplate[];
  renderValueInput: (
    value: string,
    dt: Code | null,
    onChange: (v: string) => void,
    className: string,
    unitValue?: string | null,
    onUnitChange?: (unit: string | null) => void,
  ) => React.ReactNode;
  resolveDt: (templateId?: number | null, datatypeId?: number | null) => Code | null;
  handleSaveMv: () => Promise<void>;
  cancelEditingMv: () => void;
  validateValue: (value: string, datatype: Code | null) => boolean;
  confirmDeleteMvId: number | null;
  setConfirmDeleteMvId: React.Dispatch<React.SetStateAction<number | null>>;
  handleDeleteMv: (id: number) => Promise<void>;
  startEditingMv: (mv: {
    id: number;
    medical_value_template_id: number | null;
    medical_value_group_id?: number | null;
    name: string;
    value: string;
    value_input?: string | null;
    unit_input_ucum?: string | null;
    renew_date: string | null;
  }) => void;
  mvSortKey: 'pos' | 'name' | 'renew_date';
  mvSortAsc: boolean;
  mvDragId: number | null;
  mvDragOverId: number | null;
  setMvDragId: React.Dispatch<React.SetStateAction<number | null>>;
  setMvDragOverId: React.Dispatch<React.SetStateAction<number | null>>;
  handleMvDrop: (targetId: number) => Promise<void>;
  formatValue: (value: string, datatype: Code | null, catalogueEntries?: Code[]) => string;
  catalogueCache: Record<string, Code[]>;
  getCatalogueType: (datatype: Code | null) => string;
  mvAddMode: 'template' | 'custom';
  setMvAddMode: React.Dispatch<React.SetStateAction<'template' | 'custom'>>;
  mvForm: MedicalValueCreate;
  setMvForm: React.Dispatch<React.SetStateAction<MedicalValueCreate>>;
  datatypeCodes: Code[];
  handleAddMv: () => Promise<void>;
  editingGroupRenewId: number | null;
  groupRenewDraft: string;
  setGroupRenewDraft: React.Dispatch<React.SetStateAction<string>>;
  startEditingGroupRenew: (group: MedicalValueGroup) => void;
  cancelEditingGroupRenew: () => void;
  saveGroupRenewDate: (groupId: number) => Promise<void>;
}

export interface PatientDetailTabsProps {
  tab: PatientDetailTab;
  setTab: (tab: PatientDetailTab) => void;
  patient: Patient;
  formatDate: (iso: string | null) => string;
  refreshPatient: () => Promise<void>;
  initialEpisodeId?: number | null;
  onOpenColloqium: (colloqiumId: number) => void;
  core: PatientCoreModel;
  contacts: PatientContactsModel;
  absences: PatientAbsencesModel;
  episodes: PatientEpisodesModel;
  diagnoses: PatientDiagnosesModel;
  medicalValues: PatientMedicalValuesModel;
}

export default function PatientDetailTabs(props: PatientDetailTabsProps) {
  const {
    tab,
    setTab,
    patient,
    formatDate,
    refreshPatient,
    initialEpisodeId,
    onOpenColloqium,
    core,
    contacts,
    absences,
    episodes,
    diagnoses,
    medicalValues,
  } = props;
  return (
    <>
      <nav className="detail-tabs">
        <button className={`detail-tab ${tab === 'patient' ? 'active' : ''}`} onClick={() => setTab('patient')}>Patient</button>
        <button className={`detail-tab ${tab === 'episodes' ? 'active' : ''}`} onClick={() => setTab('episodes')}>Episodes</button>
        <button className={`detail-tab ${tab === 'medical' ? 'active' : ''}`} onClick={() => setTab('medical')}>Medical Data</button>
        <button className={`detail-tab ${tab === 'tasks' ? 'active' : ''}`} onClick={() => setTab('tasks')}>Tasks</button>
      </nav>

      {tab === 'patient' && (
        <PatientTab
          patient={patient}
          formatDate={formatDate}
          core={core}
          contacts={contacts}
          absences={absences}
        />
      )}
      {tab === 'episodes' && (
        <EpisodesTab
          patient={patient}
          formatDate={formatDate}
          refreshPatient={refreshPatient}
          episodes={episodes}
          initialSelectedEpisodeId={initialEpisodeId ?? null}
          onOpenColloqium={onOpenColloqium}
        />
      )}
      {tab === 'medical' && (
        <MedicalDataTab
          patient={patient}
          formatDate={formatDate}
          core={core}
          diagnoses={diagnoses}
          medicalValues={medicalValues}
        />
      )}
      {tab === 'tasks' && <TasksTab patientId={patient.id} />}
    </>
  );
}
