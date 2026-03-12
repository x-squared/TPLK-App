import type { Patient } from '../../../api';
import type { PatientEpisodesModel } from '../../patient-detail/PatientDetailTabs';

export type EpisodeDetailTab = 'Evaluation' | 'Listing' | 'Transplantation' | 'Follow-Up' | 'Closed';

export type EpisodeMetaForm = {
  fall_nr: string;
  comment: string;
  cave: string;
};

export type EpisodeDetailForm = Record<string, string | boolean | null>;

export interface EpisodesTabProps {
  patient: Patient;
  formatDate: (iso: string | null) => string;
  refreshPatient: () => Promise<void>;
  episodes: PatientEpisodesModel;
  initialSelectedEpisodeId?: number | null;
  onOpenColloqium: (colloqiumId: number) => void;
}
