import type {
  CoordinationEpisodeLinkedEpisode,
  CoordinationProcurementFlex,
  CoordinationProtocolStateOrgan,
  PatientListItem,
  ProcurementSlotKey,
} from '../../../../api';
import { formatDefaultEpisodeReference } from '../../../layout/episodeDisplay';
import { resolveValueForFieldInSlot } from './helpers';

const DUAL_RECIPIENT_ORGAN_KEYS = new Set(['KIDNEY', 'LUNG']);

interface CoordinationProtocolEpisodeFieldControlProps {
  field: CoordinationProcurementFlex['field_templates'][number];
  flex: CoordinationProcurementFlex | null;
  organId: number;
  organKey?: string;
  activeOrgan: CoordinationProcurementFlex['organs'][number] | null;
  activeProtocolOrgan: CoordinationProtocolStateOrgan | null;
  organWorkflowCleared: boolean;
  savingFieldId: number | null;
  savingOrganRejection: boolean;
  clearingOrganWorkflow: boolean;
  organRejectionCommentDraft: string;
  setOrganRejectionCommentDraft: (value: string) => void;
  availableRecipientEpisodesRows: CoordinationEpisodeLinkedEpisode[];
  episodePickerRows: Array<{
    episodeId: number;
    patientName: string;
    patientDateOfBirth: string | null;
    patientPid: string;
  }>;
  patientById: Map<number, PatientListItem>;
  onOpenPicker: (fieldId: number, slotKey: ProcurementSlotKey) => void;
  onClearEpisode: (fieldId: number, slotKey: ProcurementSlotKey) => void;
  onSaveOrganRejection: (rejected: boolean, comment: string) => void;
  onSaveOrganRejectionCommentIfChanged: () => void;
  onClearRejectedOrganWorkflow: () => void;
  t: (key: string, fallback: string) => string;
}

export default function CoordinationProtocolEpisodeFieldControl({
  field,
  flex,
  organId,
  organKey,
  activeOrgan,
  activeProtocolOrgan,
  organWorkflowCleared,
  savingFieldId,
  savingOrganRejection,
  clearingOrganWorkflow,
  organRejectionCommentDraft,
  setOrganRejectionCommentDraft,
  availableRecipientEpisodesRows,
  episodePickerRows,
  patientById,
  onOpenPicker,
  onClearEpisode,
  onSaveOrganRejection,
  onSaveOrganRejectionCommentIfChanged,
  onClearRejectedOrganWorkflow,
  t,
}: CoordinationProtocolEpisodeFieldControlProps) {
  const normalizedOrganKey = ((organKey ?? activeOrgan?.organ?.key ?? '') || '').trim().toUpperCase();
  const organRejected = activeProtocolOrgan?.organ_rejected ?? Boolean(activeOrgan?.organ_rejected);
  const slotOptions: ProcurementSlotKey[] = DUAL_RECIPIENT_ORGAN_KEYS.has(normalizedOrganKey)
    ? ['MAIN', 'LEFT', 'RIGHT']
    : ['MAIN'];
  const linkedAssignmentsForOrgan = activeProtocolOrgan?.slots ?? [];
  const labelBySlot: Record<ProcurementSlotKey, string> = {
    MAIN: t('admin.procurementConfig.slot.main', 'MAIN'),
    LEFT: t('admin.procurementConfig.slot.left', 'LEFT'),
    RIGHT: t('admin.procurementConfig.slot.right', 'RIGHT'),
  };
  const slotEntries = slotOptions.map((slotKey, index) => {
    const slotValue = resolveValueForFieldInSlot(flex, organId, slotKey, field.id);
    const linkedEpisode = linkedAssignmentsForOrgan[index] ?? null;
    const selectedEpisodeId = slotValue?.episode_ref?.episode_id ?? linkedEpisode?.episode_id ?? 0;
    const selectedEpisode = availableRecipientEpisodesRows.find((episode) => episode.id === selectedEpisodeId)
      ?? (linkedEpisode ? {
        id: linkedEpisode.episode_id ?? 0,
        patient_id: linkedEpisode.patient_id ?? 0,
        fall_nr: linkedEpisode.episode_fall_nr ?? '',
        tpl_date: null,
        list_rs_nr: '',
      } : null)
      ?? null;
    const selectedEpisodeFromValue = slotValue?.episode_ref?.episode ?? null;
    const selectedEpisodeRow = episodePickerRows.find((entry) => entry.episodeId === selectedEpisodeId) ?? null;
    const selectedPatient = (selectedEpisode?.patient_id != null ? patientById.get(selectedEpisode.patient_id) : null)
      ?? (selectedEpisodeFromValue?.patient_id != null ? patientById.get(selectedEpisodeFromValue.patient_id) : null)
      ?? (linkedEpisode?.patient_id != null ? patientById.get(linkedEpisode.patient_id) : null)
      ?? null;
    const selectedPatientName = selectedEpisodeRow?.patientName
      || linkedEpisode?.recipient_name
      || (selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.name}`.trim() : '');
    const selectedEpisodeLabel = selectedEpisodeId > 0
      ? formatDefaultEpisodeReference({
        episodeId: selectedEpisodeId,
        episodeCaseNumber: selectedEpisode?.fall_nr ?? linkedEpisode?.episode_fall_nr ?? selectedEpisodeFromValue?.fall_nr ?? null,
        patientFullName: selectedPatientName,
        patientBirthDate: selectedEpisodeRow?.patientDateOfBirth ?? linkedEpisode?.patient_birth_date ?? selectedPatient?.date_of_birth ?? null,
        patientPid: selectedEpisodeRow?.patientPid ?? linkedEpisode?.patient_pid ?? selectedPatient?.pid ?? null,
        emptySymbol: t('common.emptySymbol', '–'),
      })
      : t('coordinations.protocolData.episode.noneSelected', 'No recipient episode selected');
    return { slotKey, selectedEpisodeId, selectedEpisodeLabel };
  });
  const selectedCount = slotEntries.filter((entry) => entry.selectedEpisodeId > 0).length;
  const recipientStateClass = organRejected
    ? 'committed'
    : selectedCount > 0
      ? 'committed'
      : 'pending';

  return (
    <div className="detail-field coord-proc-field-wide">
      <span className="detail-label">{t(`coordinations.protocolData.fieldsByKey.${field.key}`, field.name_default)}</span>
      <div className={`coord-protocol-episode-control ${recipientStateClass}`}>
        <div className="coord-organ-rejection-box">
          <label className="coord-organ-rejection-toggle">
            <input
              type="checkbox"
              checked={organRejected}
              disabled={savingOrganRejection}
              onChange={(event) => {
                const nextRejected = event.target.checked;
                onSaveOrganRejection(nextRejected, organRejectionCommentDraft.trim());
              }}
            />
            <span>{t('coordinations.protocolData.organRejection.toggle', 'Organ rejected')}</span>
          </label>
          <div className="coord-organ-rejection-comment-row">
            <input
              type="text"
              className="detail-input"
              value={organRejectionCommentDraft}
              placeholder={t('coordinations.protocolData.organRejection.commentPlaceholder', 'Reason for rejection')}
              disabled={savingOrganRejection}
              onChange={(event) => setOrganRejectionCommentDraft(event.target.value)}
              onBlur={onSaveOrganRejectionCommentIfChanged}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  onSaveOrganRejectionCommentIfChanged();
                }
              }}
            />
          </div>
          {organRejected ? (
            <div className="coord-organ-rejection-clear-row">
              <button
                type="button"
                className="patients-cancel-btn coord-organ-clear-workflow-btn"
                disabled={clearingOrganWorkflow || savingOrganRejection}
                onClick={onClearRejectedOrganWorkflow}
                title={t(
                  'coordinations.protocolData.organRejection.clearWorkflowTitle',
                  'Discard remaining tasks and force all open protocol fields to done for this rejected organ.',
                )}
              >
                {clearingOrganWorkflow
                  ? t('coordinations.protocolData.organRejection.clearingWorkflow', 'Clearing...')
                  : organWorkflowCleared
                    ? t('coordinations.protocolData.organRejection.workflowCleared', 'Workflow cleared')
                    : t('coordinations.protocolData.organRejection.clearWorkflowButton', 'Clear organ workflow')}
              </button>
            </div>
          ) : null}
        </div>
        {slotEntries.map((entry) => (
          <div className="coord-episode-select-row" key={entry.slotKey}>
            <div className="person-pill-list">
              {entry.selectedEpisodeId > 0 ? (
                <span className="person-pill coord-protocol-recipient-pill">{`${labelBySlot[entry.slotKey]}: ${entry.selectedEpisodeLabel}`}</span>
              ) : (
                <span className="detail-value">{`${labelBySlot[entry.slotKey]}: ${entry.selectedEpisodeLabel}`}</span>
              )}
            </div>
            <button
              type="button"
              className="patients-save-btn coord-episode-select-open-btn"
              onClick={() => onOpenPicker(field.id, entry.slotKey)}
              disabled={organRejected || savingFieldId === field.id || (entry.selectedEpisodeId <= 0 && selectedCount >= 2 && DUAL_RECIPIENT_ORGAN_KEYS.has(normalizedOrganKey))}
            >
              {t('coordinations.protocolData.episode.openPicker', 'Open picker')}
            </button>
            {entry.selectedEpisodeId > 0 ? (
              <button
                type="button"
                className="patients-cancel-btn"
                onClick={() => onClearEpisode(field.id, entry.slotKey)}
                disabled={organRejected || savingFieldId === field.id}
              >
                {t('coordinations.protocolData.episode.clearSelection', 'Clear')}
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
