import { request, type AppUser, type Code } from './core';

export interface LivingDonationPatientRef {
  id: number;
  pid: string;
  first_name: string;
  name: string;
}

export interface LivingDonationRecipientEpisodeRef {
  id: number;
  patient_id: number;
  fall_nr: string;
  start: string | null;
  end: string | null;
  patient: LivingDonationPatientRef | null;
}

export interface LivingDonationDonor {
  id: number;
  living_donation_episode_id: number;
  donor_patient_id: number;
  donor_patient: LivingDonationPatientRef | null;
  relation_id: number | null;
  relation: Code | null;
  status_id: number;
  status: Code | null;
  comment: string;
  changed_by_id: number | null;
  changed_by_user: AppUser | null;
  created_at: string;
  updated_at: string | null;
}

export interface LivingDonationEpisode {
  id: number;
  recipient_episode_id: number | null;
  recipient_episode: LivingDonationRecipientEpisodeRef | null;
  organ_ids: number[];
  organs: Code[];
  start: string | null;
  end: string | null;
  comment: string;
  donors: LivingDonationDonor[];
  changed_by_id: number | null;
  changed_by_user: AppUser | null;
  created_at: string;
  updated_at: string | null;
}

export interface LivingDonationEpisodeCreate {
  recipient_episode_id?: number | null;
  organ_ids?: number[];
  start?: string | null;
  end?: string | null;
  comment?: string;
}

export interface LivingDonationEpisodeUpdate {
  recipient_episode_id?: number | null;
  organ_ids?: number[];
  start?: string | null;
  end?: string | null;
  comment?: string;
}

export interface LivingDonationDonorCreate {
  donor_patient_id: number;
  relation_id?: number | null;
  status_id?: number | null;
  comment?: string;
}

export interface LivingDonationDonorUpdate {
  relation_id?: number | null;
  status_id?: number | null;
  comment?: string;
}

export const donorsApi = {
  listLivingDonations: () =>
    request<LivingDonationEpisode[]>('/living-donations/'),
  getLivingDonation: (id: number) =>
    request<LivingDonationEpisode>(`/living-donations/${id}`),
  listLivingDonationRecipientEpisodes: () =>
    request<LivingDonationRecipientEpisodeRef[]>('/living-donations/recipient-episodes'),
  createLivingDonation: (data: LivingDonationEpisodeCreate) =>
    request<LivingDonationEpisode>('/living-donations/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateLivingDonation: (id: number, data: LivingDonationEpisodeUpdate) =>
    request<LivingDonationEpisode>(`/living-donations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  closeLivingDonation: (id: number, end: string) =>
    request<LivingDonationEpisode>(`/living-donations/${id}/close`, {
      method: 'POST',
      body: JSON.stringify({ end }),
    }),
  addLivingDonationDonor: (livingDonationId: number, data: LivingDonationDonorCreate) =>
    request<LivingDonationDonor>(`/living-donations/${livingDonationId}/donors`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateLivingDonationDonor: (
    livingDonationId: number,
    donorId: number,
    data: LivingDonationDonorUpdate,
  ) =>
    request<LivingDonationDonor>(`/living-donations/${livingDonationId}/donors/${donorId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};
