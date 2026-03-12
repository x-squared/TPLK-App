import {
  request,
  type AppUser,
  type Code,
  type MedicalValueGroup,
  type MedicalValueGroupInstance,
  type MedicalValueTemplate,
} from './core';

/* ── Contact Info ── */

export interface ContactInfo {
  id: number;
  patient_id: number;
  type_id: number;
  type: Code | null;
  data: string;
  comment: string;
  main: boolean;
  pos: number;
  changed_by_id: number | null;
  changed_by_user: AppUser | null;
  created_at: string;
  updated_at: string | null;
}

export interface ContactInfoCreate {
  type_id: number;
  data: string;
  comment?: string;
  main?: boolean;
}

export interface ContactInfoUpdate {
  type_id?: number;
  data?: string;
  comment?: string;
  main?: boolean;
  pos?: number;
}

/* ── Absence ── */

export interface Absence {
  id: number;
  patient_id: number;
  start: string;
  end: string;
  comment: string;
  changed_by_id: number | null;
  changed_by_user: AppUser | null;
  created_at: string;
  updated_at: string | null;
}

export interface AbsenceCreate {
  start: string;
  end: string;
  comment?: string;
}

export interface AbsenceUpdate {
  start?: string;
  end?: string;
  comment?: string;
}

/* ── Diagnosis ── */

export interface Diagnosis {
  id: number;
  patient_id: number;
  catalogue_id: number;
  catalogue: Code | null;
  comment: string;
  is_main: boolean;
  changed_by_id: number | null;
  changed_by_user: AppUser | null;
  created_at: string;
  updated_at: string | null;
}

export interface DiagnosisCreate {
  catalogue_id: number;
  comment?: string;
  is_main?: boolean;
}

export interface DiagnosisUpdate {
  catalogue_id?: number;
  comment?: string;
  is_main?: boolean;
}

/* ── Medical Value ── */

export interface MedicalValue {
  id: number;
  patient_id: number;
  medical_value_template_id: number;
  medical_value_template: MedicalValueTemplate | null;
  datatype_id: number | null;
  datatype: Code | null;
  medical_value_group_id: number | null;
  medical_value_group_template: MedicalValueGroup | null;
  medical_value_group_instance_id: number | null;
  medical_value_group: MedicalValueGroupInstance | null;
  name: string;
  pos: number;
  value: string;
  value_input: string;
  unit_input_ucum: string | null;
  value_canonical: string;
  unit_canonical_ucum: string | null;
  normalization_status: string;
  normalization_error: string;
  renew_date: string | null;
  organ_id: number | null;
  is_donor_context: boolean;
  context_key: string | null;
  changed_by_id: number | null;
  changed_by_user: AppUser | null;
  created_at: string;
  updated_at: string | null;
}

export interface MedicalValueCreate {
  medical_value_template_id?: number | null;
  datatype_id?: number | null;
  medical_value_group_id?: number | null;
  medical_value_group_instance_id?: number | null;
  name?: string;
  pos?: number;
  value?: string;
  value_input?: string;
  unit_input_ucum?: string | null;
  renew_date?: string | null;
  organ_id?: number | null;
  is_donor_context?: boolean;
  context_key?: string | null;
}

export interface MedicalValueUpdate {
  medical_value_template_id?: number | null;
  datatype_id?: number | null;
  medical_value_group_id?: number | null;
  medical_value_group_instance_id?: number | null;
  name?: string;
  pos?: number;
  value?: string;
  value_input?: string;
  unit_input_ucum?: string | null;
  renew_date?: string | null;
  organ_id?: number | null;
  is_donor_context?: boolean;
  context_key?: string | null;
}

/* ── Episode ── */

export interface Episode {
  id: number;
  patient_id: number;
  organ_id: number;
  organ: Code | null;
  organ_ids: number[];
  organs: Code[];
  episode_organs: EpisodeOrgan[];
  start: string | null;
  end: string | null;
  fall_nr: string;
  status_id: number | null;
  status: Code | null;
  phase_id: number | null;
  phase: Code | null;
  closed: boolean;
  comment: string;
  cave: string;
  eval_start: string | null;
  eval_end: string | null;
  eval_assigned_to: string;
  eval_stat: string;
  eval_register_date: string | null;
  eval_excluded: boolean;
  eval_non_list_sent: string | null;
  list_start: string | null;
  list_end: string | null;
  list_rs_nr: string;
  list_reason_delist: string;
  list_expl_delist: string;
  list_delist_sent: string | null;
  tpl_date: string | null;
  fup_recipient_card_done: boolean;
  fup_recipient_card_date: string | null;
  changed_by_id: number | null;
  changed_by_user: AppUser | null;
  created_at: string;
  updated_at: string | null;
}

export interface EpisodeList {
  id: number;
  patient_id: number;
  organ_id: number;
  organ: Code | null;
  organs: Code[];
  start: string | null;
  end: string | null;
  fall_nr: string;
  status_id: number | null;
  status: Code | null;
  phase_id: number | null;
  phase: Code | null;
  closed: boolean;
  tpl_date: string | null;
  list_rs_nr: string;
}

export interface EpisodeOrgan {
  id: number;
  episode_id: number;
  organ_id: number;
  organ: Code | null;
  date_added: string | null;
  comment: string;
  is_active: boolean;
  date_inactivated: string | null;
  reason_activation_change: string;
}

export interface EpisodeOrganCreate {
  organ_id: number;
  date_added?: string | null;
  comment?: string;
  reason_activation_change?: string;
}

export interface EpisodeOrganUpdate {
  date_added?: string | null;
  comment?: string;
  is_active?: boolean;
  date_inactivated?: string | null;
  reason_activation_change?: string;
}

export interface EpisodeCreate {
  organ_id?: number | null;
  organ_ids?: number[];
  start?: string | null;
  end?: string | null;
  fall_nr?: string;
  status_id?: number | null;
  phase_id?: number | null;
  closed?: boolean;
  comment?: string;
  cave?: string;
  eval_start?: string | null;
  eval_end?: string | null;
  eval_assigned_to?: string;
  eval_stat?: string;
  eval_register_date?: string | null;
  eval_excluded?: boolean;
  eval_non_list_sent?: string | null;
  list_start?: string | null;
  list_end?: string | null;
  list_rs_nr?: string;
  list_reason_delist?: string;
  list_expl_delist?: string;
  list_delist_sent?: string | null;
  tpl_date?: string | null;
  fup_recipient_card_done?: boolean;
  fup_recipient_card_date?: string | null;
}

export interface EpisodeUpdate {
  organ_id?: number;
  organ_ids?: number[];
  start?: string | null;
  end?: string | null;
  fall_nr?: string;
  status_id?: number | null;
  phase_id?: number | null;
  closed?: boolean;
  comment?: string;
  cave?: string;
  eval_start?: string | null;
  eval_end?: string | null;
  eval_assigned_to?: string;
  eval_stat?: string;
  eval_register_date?: string | null;
  eval_excluded?: boolean;
  eval_non_list_sent?: string | null;
  list_start?: string | null;
  list_end?: string | null;
  list_rs_nr?: string;
  list_reason_delist?: string;
  list_expl_delist?: string;
  list_delist_sent?: string | null;
  tpl_date?: string | null;
  fup_recipient_card_done?: boolean;
  fup_recipient_card_date?: string | null;
}

export interface EpisodeStartListingRequest {
  start: string;
}

export interface EpisodeCloseRequest {
  end: string;
}

export interface EpisodeRejectRequest {
  end?: string | null;
  reason?: string;
}

export interface EpisodeCancelRequest {
  end?: string | null;
  reason?: string;
}

/* ── Patient ── */

export interface Patient {
  id: number;
  pid: string;
  first_name: string;
  name: string;
  date_of_birth: string | null;
  date_of_death: string | null;
  ahv_nr: string;
  lang: string;
  sex_id: number | null;
  sex: Code | null;
  resp_coord_id: number | null;
  resp_coord: AppUser | null;
  translate: boolean;
  contact_infos: ContactInfo[];
  absences: Absence[];
  diagnoses: Diagnosis[];
  medical_values: MedicalValue[];
  episodes: Episode[];
  changed_by_id: number | null;
  changed_by_user: AppUser | null;
  created_at: string;
  updated_at: string | null;
}

export interface PatientListItem {
  id: number;
  pid: string;
  first_name: string;
  name: string;
  date_of_birth: string | null;
  date_of_death: string | null;
  ahv_nr: string;
  lang: string;
  sex_id: number | null;
  sex: Code | null;
  resp_coord_id: number | null;
  resp_coord: AppUser | null;
  translate: boolean;
  contact_info_count: number;
  open_episode_count: number;
  open_episode_indicators: string[];
  episode_organ_ids: number[];
  open_episode_organ_ids: number[];
  static_medical_values: {
    name: string;
    value: string;
  }[];
}

export interface PatientCreate {
  pid: string;
  first_name: string;
  name: string;
  date_of_birth?: string | null;
  date_of_death?: string | null;
  ahv_nr?: string;
  translate?: boolean;
}

export interface PatientUpdate {
  pid?: string;
  first_name?: string;
  name?: string;
  date_of_birth?: string | null;
  date_of_death?: string | null;
  ahv_nr?: string;
  lang?: string;
  sex_id?: number | null;
  resp_coord_id?: number | null;
  translate?: boolean;
}

/* ── API methods ── */

export const patientsApi = {
  listPatients: () => request<PatientListItem[]>('/patients/'),
  getPatient: (id: number) => request<Patient>(`/patients/${id}`),
  createPatient: (data: PatientCreate) =>
    request<Patient>('/patients/', { method: 'POST', body: JSON.stringify(data) }),
  updatePatient: (id: number, data: PatientUpdate) =>
    request<Patient>(`/patients/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deletePatient: (id: number) =>
    request<void>(`/patients/${id}`, { method: 'DELETE' }),

  listContactInfos: (patientId: number) =>
    request<ContactInfo[]>(`/patients/${patientId}/contacts/`),
  createContactInfo: (patientId: number, data: ContactInfoCreate) =>
    request<ContactInfo>(`/patients/${patientId}/contacts/`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateContactInfo: (patientId: number, contactId: number, data: ContactInfoUpdate) =>
    request<ContactInfo>(`/patients/${patientId}/contacts/${contactId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteContactInfo: (patientId: number, contactId: number) =>
    request<void>(`/patients/${patientId}/contacts/${contactId}`, { method: 'DELETE' }),

  listAbsences: (patientId: number) =>
    request<Absence[]>(`/patients/${patientId}/absences/`),
  createAbsence: (patientId: number, data: AbsenceCreate) =>
    request<Absence>(`/patients/${patientId}/absences/`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateAbsence: (patientId: number, absenceId: number, data: AbsenceUpdate) =>
    request<Absence>(`/patients/${patientId}/absences/${absenceId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteAbsence: (patientId: number, absenceId: number) =>
    request<void>(`/patients/${patientId}/absences/${absenceId}`, { method: 'DELETE' }),

  listDiagnoses: (patientId: number) =>
    request<Diagnosis[]>(`/patients/${patientId}/diagnoses/`),
  createDiagnosis: (patientId: number, data: DiagnosisCreate) =>
    request<Diagnosis>(`/patients/${patientId}/diagnoses/`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateDiagnosis: (patientId: number, diagnosisId: number, data: DiagnosisUpdate) =>
    request<Diagnosis>(`/patients/${patientId}/diagnoses/${diagnosisId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteDiagnosis: (patientId: number, diagnosisId: number) =>
    request<void>(`/patients/${patientId}/diagnoses/${diagnosisId}`, { method: 'DELETE' }),

  listMedicalValues: (patientId: number) =>
    request<MedicalValue[]>(`/patients/${patientId}/medical-values/`),
  createMedicalValue: (patientId: number, data: MedicalValueCreate) =>
    request<MedicalValue>(`/patients/${patientId}/medical-values/`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateMedicalValue: (patientId: number, medicalValueId: number, data: MedicalValueUpdate) =>
    request<MedicalValue>(`/patients/${patientId}/medical-values/${medicalValueId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteMedicalValue: (patientId: number, medicalValueId: number) =>
    request<void>(`/patients/${patientId}/medical-values/${medicalValueId}`, { method: 'DELETE' }),
  instantiateMedicalValues: (patientId: number, includeDonorContext = false) =>
    request<{ created_values: number }>(
      `/patients/${patientId}/medical-values/instantiate?include_donor_context=${includeDonorContext ? 'true' : 'false'}`,
      { method: 'POST' },
    ),

  listEpisodes: (patientId: number) =>
    request<EpisodeList[]>(`/patients/${patientId}/episodes/`),
  createEpisode: (patientId: number, data: EpisodeCreate) =>
    request<Episode>(`/patients/${patientId}/episodes/`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateEpisode: (patientId: number, episodeId: number, data: EpisodeUpdate) =>
    request<Episode>(`/patients/${patientId}/episodes/${episodeId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  startEpisodeListing: (patientId: number, episodeId: number, data: EpisodeStartListingRequest) =>
    request<Episode>(`/patients/${patientId}/episodes/${episodeId}/workflow/start-listing`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  closeEpisodeWorkflow: (patientId: number, episodeId: number, data: EpisodeCloseRequest) =>
    request<Episode>(`/patients/${patientId}/episodes/${episodeId}/workflow/close`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  rejectEpisodeWorkflow: (patientId: number, episodeId: number, data: EpisodeRejectRequest) =>
    request<Episode>(`/patients/${patientId}/episodes/${episodeId}/workflow/reject`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  cancelEpisodeWorkflow: (patientId: number, episodeId: number, data: EpisodeCancelRequest) =>
    request<Episode>(`/patients/${patientId}/episodes/${episodeId}/workflow/cancel`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  addEpisodeOrgan: (patientId: number, episodeId: number, data: EpisodeOrganCreate) =>
    request<Episode>(`/patients/${patientId}/episodes/${episodeId}/organs`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateEpisodeOrgan: (
    patientId: number,
    episodeId: number,
    episodeOrganId: number,
    data: EpisodeOrganUpdate,
  ) =>
    request<EpisodeOrgan>(`/patients/${patientId}/episodes/${episodeId}/organs/${episodeOrganId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteEpisode: (patientId: number, episodeId: number) =>
    request<void>(`/patients/${patientId}/episodes/${episodeId}`, { method: 'DELETE' }),
};
