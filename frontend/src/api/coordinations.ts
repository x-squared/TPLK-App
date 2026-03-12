import {
  request,
  type AppUser,
  type Code,
  type CoordinationProcurementProtocolTaskGroupSelection,
  type DatatypeDefinition,
  type Person,
  type PersonTeam,
} from './core';
import type { Task } from './tasks';

export interface Coordination {
  id: number;
  start: string | null;
  end: string | null;
  status_id: number;
  status: Code | null;
  donor_nr: string;
  swtpl_nr: string;
  national_coordinator: string;
  comment: string;
  completion_confirmed: boolean;
  completion_comment: string;
  completion_confirmed_at: string | null;
  completion_confirmed_by_id: number | null;
  completion_confirmed_by_user: AppUser | null;
  changed_by_id: number | null;
  changed_by_user: AppUser | null;
  created_at: string;
  updated_at: string | null;
}

export interface CoordinationCreate {
  start?: string | null;
  end?: string | null;
  status_id?: number | null;
  donor_nr?: string;
  swtpl_nr?: string;
  national_coordinator?: string;
  comment?: string;
}

export interface CoordinationUpdate {
  start?: string | null;
  end?: string | null;
  status_id?: number | null;
  donor_nr?: string;
  swtpl_nr?: string;
  national_coordinator?: string;
  comment?: string;
}

export interface CoordinationDonor {
  id: number;
  coordination_id: number;
  full_name: string;
  sex_id: number | null;
  birth_date: string | null;
  blood_type_id: number | null;
  height: number | null;
  weight: number | null;
  organ_fo: string;
  diagnosis_id: number | null;
  death_kind_id: number | null;
  death_kind: Code | null;
  changed_by_id: number | null;
  changed_by_user: AppUser | null;
  created_at: string;
  updated_at: string | null;
}

export interface CoordinationDonorUpsert {
  full_name?: string;
  sex_id?: number | null;
  birth_date?: string | null;
  blood_type_id?: number | null;
  height?: number | null;
  weight?: number | null;
  organ_fo?: string;
  diagnosis_id?: number | null;
  death_kind_id?: number | null;
}

export interface CoordinationOrigin {
  id: number;
  coordination_id: number;
  detection_hospital_id: number | null;
  procurement_hospital_id: number | null;
  detection_hospital: Code | null;
  procurement_hospital: Code | null;
  organs_declined: boolean;
  changed_by_id: number | null;
  changed_by_user: AppUser | null;
  created_at: string;
  updated_at: string | null;
}

export interface CoordinationOriginUpsert {
  detection_hospital_id?: number | null;
  procurement_hospital_id?: number | null;
}

export interface CoordinationTimeLog {
  id: number;
  coordination_id: number;
  user_id: number;
  user: AppUser | null;
  start: string | null;
  end: string | null;
  comment: string;
  changed_by_id: number | null;
  changed_by_user: AppUser | null;
  created_at: string;
  updated_at: string | null;
}

export interface CoordinationTimeLogCreate {
  user_id: number;
  start: string | null;
  end: string | null;
  comment?: string;
}

export interface CoordinationTimeLogUpdate {
  user_id?: number;
  start?: string | null;
  end?: string | null;
  comment?: string;
}

export interface CoordinationTimeClockState {
  user_id: number;
  active_time_log: CoordinationTimeLog | null;
  active_coordination_id: number | null;
  active_on_current_coordination: boolean;
  auto_stopped_time_log_ids: number[];
  auto_stopped_coordination_ids: number[];
}

export interface CoordinationCompletionTaskGroup {
  task_group_template_id: number | null;
  group_name: string;
  due_window_days: number;
  tasks: Task[];
}

export interface CoordinationCompletionState {
  coordination_id: number;
  completion_confirmed: boolean;
  completion_comment: string;
  completion_confirmed_at: string | null;
  completion_confirmed_by_id: number | null;
  completion_confirmed_by_user: AppUser | null;
  all_tasks: Task[];
  block_1: CoordinationCompletionTaskGroup;
  block_2: CoordinationCompletionTaskGroup;
}

export interface CoordinationProtocolEventLog {
  id: number;
  coordination_id: number;
  organ_id: number;
  organ: Code | null;
  event: string;
  time: string;
  task_id: number | null;
  task_text: string | null;
  task_comment: string | null;
  changed_by_id: number | null;
  changed_by_user: AppUser | null;
  created_at: string;
  updated_at: string | null;
}

export interface CoordinationProtocolEventLogCreate {
  organ_id: number;
  event: string;
  effective_time?: string | null;
  task_id?: number | null;
  task_text?: string | null;
  task_comment?: string | null;
}

export interface CoordinationEpisodeLinkedEpisode {
  id: number;
  patient_id: number;
  fall_nr: string;
  tpl_date: string | null;
  list_rs_nr: string;
  status_id?: number | null;
  status?: Code | null;
  phase_id?: number | null;
  phase?: Code | null;
  organs?: Code[];
}

export interface CoordinationEpisode {
  id: number;
  coordination_id: number;
  episode_id: number;
  organ_id: number;
  organ: Code | null;
  episode: CoordinationEpisodeLinkedEpisode | null;
  tpl_date: string | null;
  procurement_team: string;
  exvivo_perfusion_done: boolean;
  is_organ_rejected: boolean;
  organ_rejection_sequel_id: number | null;
  changed_by_id: number | null;
  changed_by_user: AppUser | null;
  created_at: string;
  updated_at: string | null;
}

export type ProcurementSlotKey = 'MAIN' | 'LEFT' | 'RIGHT';
export type ProcurementValueMode = 'SCALAR' | 'PERSON_SINGLE' | 'PERSON_LIST' | 'TEAM_SINGLE' | 'TEAM_LIST' | 'EPISODE';
export type ProcurementGroupDisplayLane = 'PRIMARY' | 'SECONDARY';

export interface CoordinationProcurementFieldGroupTemplate {
  id: number;
  key: string;
  name_default: string;
  display_lane: ProcurementGroupDisplayLane;
  pos: number;
}

export interface CoordinationProcurementFieldTemplate {
  id: number;
  key: string;
  name_default: string;
  pos: number;
  group_template_id: number | null;
  group_template: CoordinationProcurementFieldGroupTemplate | null;
  value_mode: ProcurementValueMode;
  datatype_def_id: number;
  datatype_definition: DatatypeDefinition | null;
}

export interface CoordinationProcurementFieldScopeTemplate {
  id: number;
  field_template_id: number;
  organ_id: number | null;
  organ: Code | null;
  slot_key: ProcurementSlotKey;
}

export interface CoordinationProcurementValuePerson {
  id: number;
  pos: number;
  person: Person | null;
}

export interface CoordinationProcurementValueTeam {
  id: number;
  pos: number;
  team: PersonTeam | null;
}

export interface CoordinationProcurementValue {
  id: number;
  slot_id: number;
  field_template_id: number;
  value: string;
  field_template: CoordinationProcurementFieldTemplate | null;
  persons: CoordinationProcurementValuePerson[];
  teams: CoordinationProcurementValueTeam[];
  episode_ref: {
    id: number;
    episode_id: number;
    episode: CoordinationEpisodeLinkedEpisode | null;
  } | null;
}

export interface CoordinationProcurementSlot {
  id: number;
  coordination_procurement_organ_id: number;
  slot_key: ProcurementSlotKey;
  values: CoordinationProcurementValue[];
}

export interface CoordinationProcurementOrgan {
  id: number;
  coordination_id: number;
  organ_id: number;
  procurement_surgeon: string;
  organ_rejected: boolean;
  organ_rejection_comment: string;
  organ_workflow_cleared: boolean;
  organ: Code | null;
  slots: CoordinationProcurementSlot[];
}

export interface CoordinationProcurementFlex {
  field_group_templates: CoordinationProcurementFieldGroupTemplate[];
  field_templates: CoordinationProcurementFieldTemplate[];
  field_scope_templates: CoordinationProcurementFieldScopeTemplate[];
  protocol_task_group_selections: CoordinationProcurementProtocolTaskGroupSelection[];
  organs: CoordinationProcurementOrgan[];
}

export interface CoordinationProcurementValueUpsert {
  value?: string;
  person_ids?: number[];
  team_ids?: number[];
  episode_id?: number | null;
}

export interface CoordinationProcurementOrganUpsert {
  procurement_surgeon?: string;
  organ_rejected?: boolean;
  organ_rejection_comment?: string;
}

export interface CoordinationProtocolStateSlot {
  slot_key: ProcurementSlotKey;
  episode_id: number | null;
  expected_organ_ids: number[];
  patient_id: number | null;
  recipient_name: string;
  patient_pid: string;
  patient_birth_date: string | null;
  episode_fall_nr: string;
}

export interface CoordinationProtocolStateOrgan {
  organ_id: number;
  organ: Code | null;
  organ_rejected: boolean;
  organ_rejection_comment: string;
  slots: CoordinationProtocolStateSlot[];
}

export interface CoordinationProtocolState {
  coordination_id: number;
  organs: CoordinationProtocolStateOrgan[];
}

export const coordinationsApi = {
  listCoordinations: () => request<Coordination[]>('/coordinations/'),
  createCoordination: (data: CoordinationCreate) =>
    request<Coordination>('/coordinations/', { method: 'POST', body: JSON.stringify(data) }),
  getCoordination: (id: number) => request<Coordination>(`/coordinations/${id}`),
  updateCoordination: (id: number, data: CoordinationUpdate) =>
    request<Coordination>(`/coordinations/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  getCoordinationCompletion: (coordinationId: number) =>
    request<CoordinationCompletionState>(`/coordinations/${coordinationId}/completion`),
  confirmCoordinationCompletion: (coordinationId: number, comment: string) =>
    request<CoordinationCompletionState>(`/coordinations/${coordinationId}/completion/confirm`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    }),

  getCoordinationDonor: (coordinationId: number) =>
    request<CoordinationDonor>(`/coordinations/${coordinationId}/donor/`),
  upsertCoordinationDonor: (coordinationId: number, data: CoordinationDonorUpsert) =>
    request<CoordinationDonor>(`/coordinations/${coordinationId}/donor/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getCoordinationOrigin: (coordinationId: number) =>
    request<CoordinationOrigin>(`/coordinations/${coordinationId}/origin/`),
  upsertCoordinationOrigin: (coordinationId: number, data: CoordinationOriginUpsert) =>
    request<CoordinationOrigin>(`/coordinations/${coordinationId}/origin/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  listCoordinationTimeLogs: (coordinationId: number) =>
    request<CoordinationTimeLog[]>(`/coordinations/${coordinationId}/time-logs/`),
  createCoordinationTimeLog: (coordinationId: number, data: CoordinationTimeLogCreate) =>
    request<CoordinationTimeLog>(`/coordinations/${coordinationId}/time-logs/`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateCoordinationTimeLog: (coordinationId: number, logId: number, data: CoordinationTimeLogUpdate) =>
    request<CoordinationTimeLog>(`/coordinations/${coordinationId}/time-logs/${logId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteCoordinationTimeLog: (coordinationId: number, logId: number) =>
    request<void>(`/coordinations/${coordinationId}/time-logs/${logId}`, { method: 'DELETE' }),
  getCoordinationClockState: (coordinationId: number) =>
    request<CoordinationTimeClockState>(`/coordinations/${coordinationId}/time-logs/clock-state`),
  startCoordinationClock: (coordinationId: number) =>
    request<CoordinationTimeClockState>(`/coordinations/${coordinationId}/time-logs/clock/start`, {
      method: 'POST',
      body: JSON.stringify({ comment: '' }),
    }),
  stopCoordinationClock: (coordinationId: number, comment: string) =>
    request<CoordinationTimeClockState>(`/coordinations/${coordinationId}/time-logs/clock/stop`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    }),

  listCoordinationProtocolEvents: (coordinationId: number, organId: number) =>
    request<CoordinationProtocolEventLog[]>(`/coordinations/${coordinationId}/protocol-events/?organ_id=${organId}`),
  createCoordinationProtocolEvent: (coordinationId: number, data: CoordinationProtocolEventLogCreate) =>
    request<CoordinationProtocolEventLog>(`/coordinations/${coordinationId}/protocol-events/`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  listCoordinationEpisodes: (
    coordinationId: number,
    params?: { recipientSelection?: boolean; organId?: number | null },
  ) => {
    const query = new URLSearchParams();
    if (params?.recipientSelection) {
      query.set('recipient_selection', 'true');
    }
    if (typeof params?.organId === 'number') {
      query.set('organ_id', String(params.organId));
    }
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return request<CoordinationEpisode[]>(`/coordinations/${coordinationId}/episodes/${suffix}`);
  },
  listCoordinationRecipientSelectableEpisodes: (coordinationId: number, organId: number) =>
    request<CoordinationEpisodeLinkedEpisode[]>(`/coordinations/${coordinationId}/episodes/recipient-selectable?organ_id=${organId}`),
  getCoordinationProtocolState: (coordinationId: number) =>
    request<CoordinationProtocolState>(`/coordinations/${coordinationId}/protocol-state/`),
  getCoordinationProcurementFlex: (coordinationId: number) =>
    request<CoordinationProcurementFlex>(`/coordinations/${coordinationId}/procurement-flex/`),
  upsertCoordinationProcurementOrgan: (
    coordinationId: number,
    organId: number,
    data: CoordinationProcurementOrganUpsert,
  ) =>
    request<CoordinationProcurementOrgan>(
      `/coordinations/${coordinationId}/procurement-flex/organs/${organId}`,
      { method: 'PUT', body: JSON.stringify(data) },
    ),
  clearCoordinationRejectedOrganWorkflow: (coordinationId: number, organId: number) =>
    request<CoordinationProcurementOrgan>(
      `/coordinations/${coordinationId}/procurement-flex/organs/${organId}/rejected-workflow/clear`,
      { method: 'POST' },
    ),
  upsertCoordinationProcurementValue: (
    coordinationId: number,
    organId: number,
    slotKey: ProcurementSlotKey,
    fieldTemplateId: number,
    data: CoordinationProcurementValueUpsert,
  ) =>
    request<CoordinationProcurementValue>(
      `/coordinations/${coordinationId}/procurement-flex/organs/${organId}/slots/${encodeURIComponent(slotKey)}/values/${fieldTemplateId}`,
      { method: 'PUT', body: JSON.stringify(data) },
    ),
};
