import type { PatientListItem } from '../../../api';
import type { AgendaDraft } from '../tabs/protocol/ColloquiumProtocolTab';

export type ColloquiumDetailTab = 'colloquium' | 'protocol';

export interface ProtocolDraftPayload {
  colloqiumId: number;
  draftName: string;
  draftDate: string;
  draftParticipants: string;
  agendaDrafts: Record<number, AgendaDraft>;
  updatedAt: number;
  sourceId: string;
}

export interface AgendaEditForm {
  episode_id: number | null;
  episode_ids: number[];
  presented_by_id: number | null;
  decision: string;
  decision_reason: string;
  comment: string;
}

export interface EpisodeChoice {
  episodeId: number;
  patientId: number;
  patientName: string;
  patientFirstName: string;
  patientPid: string;
  fallNr: string;
  organName: string;
  statusName: string;
  phaseName: string;
  statusReference: string;
  start: string | null;
  end: string | null;
}

export interface PickerRow {
  patient: PatientListItem;
  episodes: EpisodeChoice[];
}

export interface EpisodePreview {
  episodeId: number;
  patientName: string;
  patientFirstName: string;
  patientPid: string;
  fallNr: string;
  organName: string;
  statusName: string;
  phaseName: string;
  statusReference: string;
  start: string | null;
  end: string | null;
}
