import { useMemo } from 'react';
import type { CoordinationEpisodeLinkedEpisode, MedicalValue, PatientListItem } from '../../../api';
import { useI18n } from '../../../i18n/i18n';
import { translateCodeLabel } from '../../../i18n/codeTranslations';
import { formatDefaultEpisodeReference, formatEpisodeStatusReference } from '../../layout/episodeDisplay';
import type { CoordinationEpisodePickerRow } from './CoordinationEpisodePickerDialog';

interface UseCoordinationEpisodePickerModelArgs {
  episodes: CoordinationEpisodeLinkedEpisode[];
  patientById: Map<number, PatientListItem>;
  medicalValuesByPatientId: Map<number, MedicalValue[]>;
  getOrganLabel: (key: string, fallback: string) => string;
}

export function useCoordinationEpisodePickerModel({
  episodes,
  patientById,
  medicalValuesByPatientId,
  getOrganLabel,
}: UseCoordinationEpisodePickerModelArgs) {
  const { t } = useI18n();

  return useMemo(() => {
    const empty = t('common.emptySymbol', '–');
    const basicColumns: string[] = [];
    const basicColumnSet = new Set<string>();
    const detailColumns: string[] = [];
    const detailColumnSet = new Set<string>();
    const basicLower = new Set<string>();

    for (const episode of episodes) {
      const patient = patientById.get(episode.patient_id);
      if (!patient) continue;
      for (const item of patient.static_medical_values ?? []) {
        const name = item.name?.trim();
        if (!name) continue;
        if (!basicColumnSet.has(name)) {
          basicColumnSet.add(name);
          basicColumns.push(name);
          basicLower.add(name.toLowerCase());
        }
      }
      const medicalRows = medicalValuesByPatientId.get(patient.id) ?? [];
      const sortedMedicalRows = [...medicalRows].sort((a, b) => {
        const ga = a.medical_value_group_template?.pos ?? 999;
        const gb = b.medical_value_group_template?.pos ?? 999;
        if (ga !== gb) return ga - gb;
        const na = (a.medical_value_group_template?.key ?? '').toLowerCase();
        const nb = (b.medical_value_group_template?.key ?? '').toLowerCase();
        if (na !== nb) return na.localeCompare(nb);
        const pa = a.pos ?? 999;
        const pb = b.pos ?? 999;
        if (pa !== pb) return pa - pb;
        return (a.name ?? '').localeCompare(b.name ?? '');
      });
      for (const item of sortedMedicalRows) {
        const name = item.name?.trim();
        if (!name) continue;
        if (basicLower.has(name.toLowerCase())) continue;
        if (!detailColumnSet.has(name)) {
          detailColumnSet.add(name);
          detailColumns.push(name);
        }
      }
    }

    const rows: CoordinationEpisodePickerRow[] = episodes.map((episode) => {
      const patient = patientById.get(episode.patient_id) ?? null;
      const basicValuesByColumn: Record<string, string> = {};
      const detailValuesByColumn: Record<string, string> = {};

      if (patient) {
        for (const item of patient.static_medical_values ?? []) {
          const name = item.name?.trim();
          if (!name) continue;
          basicValuesByColumn[name] = item.value?.trim() || empty;
        }

        const medicalRows = medicalValuesByPatientId.get(patient.id) ?? [];
        for (const item of medicalRows) {
          const name = item.name?.trim();
          if (!name) continue;
          const nextValue = item.value?.trim() || empty;
          if (detailValuesByColumn[name]) {
            detailValuesByColumn[name] = `${detailValuesByColumn[name]} | ${nextValue}`;
          } else {
            detailValuesByColumn[name] = nextValue;
          }
        }
      }

      const patientName = patient ? `${patient.first_name} ${patient.name}`.trim() : '';
      const episodeLabel = formatDefaultEpisodeReference({
        episodeId: episode.id,
        episodeCaseNumber: episode.fall_nr,
        patientFullName: patientName,
        patientBirthDate: patient?.date_of_birth ?? null,
        patientPid: patient?.pid ?? null,
        emptySymbol: empty,
      });
      const statusLabel = formatEpisodeStatusReference({
        phaseLabel: translateCodeLabel(t, episode.phase),
        processInfo: '(-)',
        emptySymbol: empty,
      });
      const organsLabel = (episode.organs ?? [])
        .map((organ) => getOrganLabel(organ.key ?? '', empty))
        .join(', ');

      return {
        episodeId: episode.id,
        patientName,
        patientPid: patient?.pid ?? empty,
        patientDateOfBirth: patient?.date_of_birth ?? null,
        episodeLabel,
        statusLabel,
        organsLabel: organsLabel || empty,
        basicValuesByColumn,
        detailValuesByColumn,
      };
    });

    return { basicColumns, detailColumns, rows };
  }, [episodes, patientById, medicalValuesByPatientId, getOrganLabel, t]);
}

