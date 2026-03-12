import { useEffect, useMemo, useState } from 'react';
import {
  api,
  type CoordinationEpisodeLinkedEpisode,
  type CoordinationProcurementFlex,
  type MedicalValue,
  type PatientListItem,
  type PersonTeam,
  type ProcurementGroupDisplayLane,
  type ProcurementSlotKey,
} from '../../../api';
import { toUserErrorMessage } from '../../../api/error';
import { translateCodeLabel } from '../../../i18n/codeTranslations';
import { useI18n } from '../../../i18n/i18n';
import { withPreservedMainContentScroll } from '../../layout/scrollPreservation';
import CoordinationEpisodePickerDialog from './CoordinationEpisodePickerDialog';
import { useCoordinationProtocolState } from './CoordinationProtocolStateContext';
import { useCoordinationEpisodePickerModel } from './useCoordinationEpisodePickerModel';
import CoordinationProtocolEpisodeFieldControl from './protocolData/CoordinationProtocolEpisodeFieldControl';
import CoordinationProtocolFieldValueControl from './protocolData/CoordinationProtocolFieldValueControl';
import {
  getFieldStateClass,
  isGroupTouched,
  resolveValueForField,
  resolveValueForFieldInSlot,
  type DraftsByField,
} from './protocolData/helpers';

interface CoordinationProtocolDataPanelProps {
  coordinationId: number;
  organId: number;
  organKey?: string;
  groupLanes?: ProcurementGroupDisplayLane[];
  gridLayout?: 'single' | 'two-column';
  hideWhenEmpty?: boolean;
  onPendingDataChange?: (hasPendingData: boolean) => void;
  onAssignmentsChanged?: () => Promise<void>;
}

export default function CoordinationProtocolDataPanel({
  coordinationId,
  organId,
  organKey,
  groupLanes,
  gridLayout = 'single',
  hideWhenEmpty = false,
  onPendingDataChange,
  onAssignmentsChanged,
}: CoordinationProtocolDataPanelProps) {
  const { t } = useI18n();
  const { state: protocolState, refresh: refreshProtocolState } = useCoordinationProtocolState();
  const [flex, setFlex] = useState<CoordinationProcurementFlex | null>(null);
  const [teams, setTeams] = useState<PersonTeam[]>([]);
  const [recipientSelectableEpisodes, setRecipientSelectableEpisodes] = useState<CoordinationEpisodeLinkedEpisode[]>([]);
  const [drafts, setDrafts] = useState<DraftsByField>({});
  const [savingFieldId, setSavingFieldId] = useState<number | null>(null);
  const [savingOrganRejection, setSavingOrganRejection] = useState(false);
  const [clearingOrganWorkflow, setClearingOrganWorkflow] = useState(false);
  const [selectingEpisode, setSelectingEpisode] = useState<{ fieldId: number; slotKey: ProcurementSlotKey } | null>(null);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [patientById, setPatientById] = useState<Map<number, PatientListItem>>(new Map());
  const [medicalValuesByPatientId, setMedicalValuesByPatientId] = useState<Map<number, MedicalValue[]>>(new Map());
  const [organRejectionCommentDraft, setOrganRejectionCommentDraft] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setError('');
      const [loadedFlex, loadedTeams, loadedRecipientSelectableEpisodes, patients] = await Promise.all([
        api.getCoordinationProcurementFlex(coordinationId),
        api.listTeams(),
        api.listCoordinationRecipientSelectableEpisodes(coordinationId, organId),
        api.listPatients(),
      ]);
      setFlex(loadedFlex);
      setTeams(loadedTeams);
      setRecipientSelectableEpisodes(loadedRecipientSelectableEpisodes);
      const candidatePatientIds = new Set(
        loadedRecipientSelectableEpisodes
          .map((episode) => episode.patient_id)
          .filter((id) => id > 0),
      );
      const mappedPatients = new Map<number, PatientListItem>();
      for (const patient of patients) {
        if (candidatePatientIds.has(patient.id)) {
          mappedPatients.set(patient.id, patient);
        }
      }
      setPatientById(mappedPatients);
      setDrafts(() => {
        const next: DraftsByField = {};
        for (const field of loadedFlex.field_templates) {
          const value = resolveValueForField(loadedFlex, organId, field.id);
          next[field.id] = value?.value ?? '';
        }
        return next;
      });
    } catch (err) {
      setError(toUserErrorMessage(err, t('coordinations.protocolData.errors.load', 'Failed to load grouped procurement values.')));
    }
  };

  useEffect(() => {
    void load();
  }, [coordinationId, organId]);

  const activeOrgan = useMemo(
    () => flex?.organs.find((entry) => entry.organ_id === organId) ?? null,
    [flex, organId],
  );
  const activeProtocolOrgan = useMemo(
    () => protocolState?.organs.find((entry) => entry.organ_id === organId) ?? null,
    [protocolState?.organs, organId],
  );
  const organWorkflowCleared = Boolean(activeOrgan?.organ_workflow_cleared);
  useEffect(() => {
    setOrganRejectionCommentDraft(activeOrgan?.organ_rejection_comment ?? '');
  }, [activeOrgan?.organ_rejection_comment, activeOrgan?.organ_id]);

  const groups = useMemo(() => {
    if (!flex) return [];
    const groupsById = new Map(flex.field_group_templates.map((group) => [group.id, group]));
    const scopesByFieldId = new Map<number, (typeof flex.field_scope_templates)>();
    for (const scope of flex.field_scope_templates ?? []) {
      scopesByFieldId.set(scope.field_template_id, [...(scopesByFieldId.get(scope.field_template_id) ?? []), scope]);
    }
    return [...flex.field_templates]
      .filter((field) => {
        const scopes = scopesByFieldId.get(field.id) ?? [];
        if (scopes.length === 0) {
          return true;
        }
        return scopes.some((scope) => scope.organ_id == null || scope.organ_id === organId);
      })
      .sort((a, b) => {
        const ga = a.group_template_id ? groupsById.get(a.group_template_id)?.pos ?? 999 : 999;
        const gb = b.group_template_id ? groupsById.get(b.group_template_id)?.pos ?? 999 : 999;
        return ga - gb || a.pos - b.pos || a.id - b.id;
      })
      .reduce<Array<{ key: string; name: string; lane: ProcurementGroupDisplayLane; fields: CoordinationProcurementFlex['field_templates'] }>>((acc, field) => {
        const groupId = field.group_template_id;
        const group = groupId ? groupsById.get(groupId) : null;
        const key = group?.key ?? 'UNGROUPED';
        const lane = (group?.display_lane ?? 'PRIMARY') as ProcurementGroupDisplayLane;
        const existing = acc.find((item) => item.key === key);
        if (existing) {
          existing.fields.push(field);
          return acc;
        }
        return [
          ...acc,
          {
            key,
            name: group
              ? t(`coordinations.protocolData.groupsByKey.${group.key}`, group.name_default)
              : t('coordinations.protocolData.groups.other', 'Other'),
            lane,
            fields: [field],
          },
        ];
      }, [])
      .filter((group) => !groupLanes || groupLanes.includes(group.lane));
  }, [flex, groupLanes, t]);
  const hasPendingData = useMemo(
    () => groups.some((group) => !isGroupTouched(
      group.fields,
      flex,
      organId,
      drafts,
      Boolean(activeOrgan?.organ_rejected && organWorkflowCleared),
    )),
    [activeOrgan?.organ_rejected, drafts, flex, groups, organId, organWorkflowCleared],
  );
  useEffect(() => {
    onPendingDataChange?.(hasPendingData);
  }, [hasPendingData, onPendingDataChange]);

  const availableRecipientEpisodes = useMemo(() => {
    const episodeById = new Map<number, CoordinationEpisodeLinkedEpisode>();
    const stats = {
      totalLinks: recipientSelectableEpisodes.length,
      withEpisode: 0,
      uniqueEpisodes: 0,
      openStatus: 0,
      withOrgans: 0,
      organMatch: 0,
      finalOptions: 0,
    };
    for (const episode of recipientSelectableEpisodes) {
      stats.withEpisode += 1;
      if (!episodeById.has(episode.id)) {
        episodeById.set(episode.id, episode);
      }
    }
    stats.uniqueEpisodes = episodeById.size;
    const rows = [...episodeById.values()]
      .map((episode) => {
        const statusKey = (episode.status?.key ?? '').trim().toUpperCase();
        if (statusKey) {
          stats.openStatus += 1;
        }
        const episodeOrgans = episode.organs ?? [];
        if (episodeOrgans.length > 0) {
          stats.withOrgans += 1;
        }
        if (episodeOrgans.some((entry) => entry.id === organId)) {
          stats.organMatch += 1;
        }
        return episode;
      })
      .sort((a, b) => (a.fall_nr || '').localeCompare(b.fall_nr || ''));
    stats.finalOptions = rows.length;
    return { rows, stats };
  }, [recipientSelectableEpisodes, organId]);

  const getOrganLabel = (key: string, fallback: string): string => {
    return translateCodeLabel(t, { type: 'ORGAN', key, name_default: fallback });
  };

  const selectedFieldTemplateId = selectingEpisode?.fieldId ?? null;
  const selectedFieldCurrentEpisodeId = selectedFieldTemplateId && selectingEpisode && flex
    ? (resolveValueForFieldInSlot(flex, organId, selectingEpisode.slotKey, selectedFieldTemplateId)?.episode_ref?.episode_id ?? null)
    : null;
  const activeOrganLabel = activeOrgan?.organ
    ? getOrganLabel(activeOrgan.organ.key ?? '', t('server.entities.organ', 'Organ'))
    : t('server.entities.organ', 'Organ');

  const loadPickerData = async () => {
    const candidatePatientIds = [...new Set(availableRecipientEpisodes.rows.map((row) => row.patient_id).filter((id) => id > 0))];
    if (candidatePatientIds.length === 0) {
      setPatientById(new Map());
      setMedicalValuesByPatientId(new Map());
      return;
    }
    setPickerLoading(true);
    try {
      const patients = await api.listPatients();
      const candidateSet = new Set(candidatePatientIds);
      const patientMap = new Map<number, PatientListItem>();
      for (const patient of patients) {
        if (candidateSet.has(patient.id)) {
          patientMap.set(patient.id, patient);
        }
      }
      const medicalResponses = await Promise.all(
        [...patientMap.keys()].map(async (patientId) => {
          const values = await api.listMedicalValues(patientId);
          return [patientId, values] as const;
        }),
      );
      const medicalMap = new Map<number, MedicalValue[]>();
      for (const [patientId, values] of medicalResponses) {
        medicalMap.set(patientId, values);
      }
      setPatientById(patientMap);
      setMedicalValuesByPatientId(medicalMap);
    } catch (err) {
      setError(toUserErrorMessage(err, t('coordinations.protocolData.episodePicker.errors.load', 'Failed to load recipient picker data.')));
    } finally {
      setPickerLoading(false);
    }
  };

  const episodePickerModel = useCoordinationEpisodePickerModel({
    episodes: availableRecipientEpisodes.rows,
    patientById,
    medicalValuesByPatientId,
    getOrganLabel,
  });

  const saveValue = async (
    fieldId: number,
    payload: { value?: string; person_ids?: number[]; team_ids?: number[]; episode_id?: number | null },
    slotKeyOverride?: ProcurementSlotKey,
    refreshAssignments?: boolean,
  ) => {
    setSavingFieldId(fieldId);
    try {
      const slotKey = activeOrgan?.slots.find((slot) => slot.slot_key === 'MAIN')?.slot_key
        ?? activeOrgan?.slots[0]?.slot_key
        ?? 'MAIN';
      await withPreservedMainContentScroll(async () => {
        await api.upsertCoordinationProcurementValue(coordinationId, organId, slotKeyOverride ?? slotKey, fieldId, payload);
        await Promise.all([load(), refreshProtocolState()]);
      });
      if (refreshAssignments && onAssignmentsChanged) {
        await onAssignmentsChanged();
      }
    } catch (err) {
      setError(toUserErrorMessage(err, t('coordinations.protocolData.errors.save', 'Failed to save procurement value.')));
    } finally {
      setSavingFieldId((prev) => (prev === fieldId ? null : prev));
    }
  };

  const saveOrganRejection = async (rejected: boolean, comment: string) => {
    setSavingOrganRejection(true);
    try {
      await withPreservedMainContentScroll(async () => {
        await api.upsertCoordinationProcurementOrgan(coordinationId, organId, {
          procurement_surgeon: activeOrgan?.procurement_surgeon ?? '',
          organ_rejected: rejected,
          organ_rejection_comment: comment,
        });
        await Promise.all([load(), refreshProtocolState()]);
      });
      if (onAssignmentsChanged) {
        await onAssignmentsChanged();
      }
    } catch (err) {
      setError(toUserErrorMessage(err, t('coordinations.protocolData.errors.save', 'Failed to save procurement value.')));
    } finally {
      setSavingOrganRejection(false);
    }
  };

  const saveOrganRejectionCommentIfChanged = () => {
    const persistedComment = (activeOrgan?.organ_rejection_comment ?? '').trim();
    const nextComment = organRejectionCommentDraft.trim();
    const organRejected = Boolean(activeOrgan?.organ_rejected);
    if (persistedComment === nextComment) {
      return;
    }
    void saveOrganRejection(organRejected, nextComment);
  };
  const clearRejectedOrganWorkflow = async () => {
    const confirmed = window.confirm(
      t(
        'coordinations.protocolData.organRejection.clearWorkflowConfirm',
        'Discard all remaining tasks and mark all open protocol fields as done for this rejected organ?',
      ),
    );
    if (!confirmed) {
      return;
    }
    setClearingOrganWorkflow(true);
    try {
      await withPreservedMainContentScroll(async () => {
        await api.clearCoordinationRejectedOrganWorkflow(coordinationId, organId);
        await Promise.all([load(), refreshProtocolState()]);
      });
      if (onAssignmentsChanged) {
        await onAssignmentsChanged();
      }
    } catch (err) {
      setError(toUserErrorMessage(err, t('coordinations.protocolData.organRejection.clearWorkflowError', 'Failed to clear rejected organ workflow.')));
    } finally {
      setClearingOrganWorkflow(false);
    }
  };

  if (hideWhenEmpty && groups.length === 0 && !error) {
    return null;
  }

  return (
    <section className={`coord-protocol-data-pane ${gridLayout === 'two-column' ? 'two-column' : ''}`}>
      {error ? <p className="status">{error}</p> : null}
      {groups.map((group) => (
        <section
          key={group.key}
          className={`coord-proc-group-card ${isGroupTouched(group.fields, flex, organId, drafts, Boolean(activeOrgan?.organ_rejected && organWorkflowCleared)) ? 'done' : 'pending'}`}
        >
          <header className="coord-proc-group-header detail-section-heading">
            <h3>{group.name}</h3>
          </header>
          <div className="coord-proc-group-grid">
            {group.fields.map((field) => {
              const valueRow = flex ? resolveValueForField(flex, organId, field.id) : null;
              const stateClass = getFieldStateClass(
                field,
                valueRow,
                drafts,
                Boolean(activeOrgan?.organ_rejected && organWorkflowCleared),
              );
              if (field.value_mode !== 'EPISODE') {
                return (
                  <CoordinationProtocolFieldValueControl
                    key={field.id}
                    field={field}
                    valueRow={valueRow}
                    stateClass={stateClass}
                    savingFieldId={savingFieldId}
                    teams={teams}
                    drafts={drafts}
                    setDrafts={setDrafts}
                    saveValue={(fieldId, payload) => saveValue(fieldId, payload)}
                    t={t}
                  />
                );
              }
              if (field.value_mode === 'EPISODE') {
                return (
                  <CoordinationProtocolEpisodeFieldControl
                    key={field.id}
                    field={field}
                    flex={flex}
                    organId={organId}
                    organKey={organKey}
                    activeOrgan={activeOrgan}
                    activeProtocolOrgan={activeProtocolOrgan}
                    organWorkflowCleared={organWorkflowCleared}
                    savingFieldId={savingFieldId}
                    savingOrganRejection={savingOrganRejection}
                    clearingOrganWorkflow={clearingOrganWorkflow}
                    organRejectionCommentDraft={organRejectionCommentDraft}
                    setOrganRejectionCommentDraft={setOrganRejectionCommentDraft}
                    availableRecipientEpisodesRows={availableRecipientEpisodes.rows}
                    episodePickerRows={episodePickerModel.rows}
                    patientById={patientById}
                    onOpenPicker={(fieldId, slotKey) => {
                      setSelectingEpisode({ fieldId, slotKey });
                      void loadPickerData();
                    }}
                    onClearEpisode={(fieldId, slotKey) => {
                      void saveValue(fieldId, { episode_id: null, value: '', person_ids: [], team_ids: [] }, slotKey, true);
                    }}
                    onSaveOrganRejection={(rejected, comment) => {
                      void saveOrganRejection(rejected, comment);
                    }}
                    onSaveOrganRejectionCommentIfChanged={saveOrganRejectionCommentIfChanged}
                    onClearRejectedOrganWorkflow={() => {
                      void clearRejectedOrganWorkflow();
                    }}
                    t={t}
                  />
                );
              }
            })}
          </div>
        </section>
      ))}
      <div className="coord-protocol-data-separator" aria-hidden="true" />
      <CoordinationEpisodePickerDialog
        open={selectingEpisode !== null}
        loading={pickerLoading}
        organLabel={activeOrganLabel}
        rows={episodePickerModel.rows}
        basicColumns={episodePickerModel.basicColumns}
        detailColumns={episodePickerModel.detailColumns}
        selectedEpisodeId={selectedFieldCurrentEpisodeId}
        onClose={() => setSelectingEpisode(null)}
        onSelect={(episodeId) => {
          if (!selectingEpisode) return;
          setSelectingEpisode(null);
          void saveValue(
            selectingEpisode.fieldId,
            { episode_id: episodeId, value: '', person_ids: [], team_ids: [] },
            selectingEpisode.slotKey,
            true,
          );
        }}
      />
    </section>
  );
}
