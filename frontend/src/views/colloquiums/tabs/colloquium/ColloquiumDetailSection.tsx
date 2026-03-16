import type { Code, Colloqium, ColloqiumAgenda, PatientListItem, Person } from '../../../../api';
import { translateCodeLabel } from '../../../../i18n/codeTranslations';
import { useI18n } from '../../../../i18n/i18n';
import ColloquiumAgendaTable from './ColloquiumAgendaTable';
import EpisodePickerDialog from './EpisodePickerDialog';
import EditableSectionHeader from '../../../layout/EditableSectionHeader';
import ErrorBanner from '../../../layout/ErrorBanner';
import PersonMultiSelect from '../../../layout/PersonMultiSelect';

interface EpisodeChoice {
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

interface PickerRow {
  patient: PatientListItem;
  episodes: EpisodeChoice[];
}

interface EpisodePreview {
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

interface Props {
  colloqium: Colloqium;
  draftName: string;
  draftDate: string;
  draftParticipants: string;
  draftParticipantsPeople: Person[];
  loadingAgendas: boolean;
  agendas: ColloqiumAgenda[];
  editingAgendaId: number | null;
  savingAgenda: boolean;
  deletingAgendaId: number | null;
  agendaSaveError: string;
  decisionOptions: Code[];
  editingAgendaForm: {
    episode_id: number | null;
    episode_ids: number[];
    presented_by_id: number | null;
    decision: string;
    decision_reason: string;
    comment: string;
  };
  selectedEpisodePreviews: EpisodePreview[];
  selectedEpisodeLabel: string;
  pickerOpen: boolean;
  pickerRows: PickerRow[];
  pickerLoading: boolean;
  pickerNonSelectableEpisodeIds: number[];
  patientsById: Record<number, PatientListItem>;
  onStartAddAgenda: () => void;
  onStartEditAgenda: (agenda: ColloqiumAgenda) => void;
  onCancelEditAgenda: () => void;
  onSaveAgenda: () => void;
  onDeleteAgenda: (agendaId: number) => void;
  onOpenEpisode: (patientId: number, episodeId: number) => void;
  onPickEpisode: () => void;
  onPickEpisodeClose: () => void;
  onPickEpisodeConfirm: (episodeIds: number[]) => void;
  onAgendaFormChange: (patch: Partial<{
    episode_id: number | null;
    episode_ids: number[];
    presented_by_id: number | null;
    decision: string;
    decision_reason: string;
    comment: string;
  }>) => void;
  onChangeName: (value: string) => void;
  onChangeDate: (value: string) => void;
  onChangeParticipantsPeople: (value: Person[]) => void;
  onSaveGeneralDetails: () => void;
  onStartGeneralEditing: () => void;
  onCancelGeneralEditing: () => void;
  generalEditing: boolean;
  savingGeneral: boolean;
  generalDirty: boolean;
  generalSaveError: string;
}

export default function ColloquiumDetailSection({
  colloqium,
  draftName,
  draftDate,
  draftParticipants,
  draftParticipantsPeople,
  loadingAgendas,
  agendas,
  editingAgendaId,
  savingAgenda,
  deletingAgendaId,
  agendaSaveError,
  decisionOptions,
  editingAgendaForm,
  selectedEpisodePreviews,
  selectedEpisodeLabel,
  pickerOpen,
  pickerRows,
  pickerLoading,
  pickerNonSelectableEpisodeIds,
  patientsById,
  onStartAddAgenda,
  onStartEditAgenda,
  onCancelEditAgenda,
  onSaveAgenda,
  onDeleteAgenda,
  onOpenEpisode,
  onPickEpisode,
  onPickEpisodeClose,
  onPickEpisodeConfirm,
  onAgendaFormChange,
  onChangeName,
  onChangeDate,
  onChangeParticipantsPeople,
  onSaveGeneralDetails,
  onStartGeneralEditing,
  onCancelGeneralEditing,
  generalEditing,
  savingGeneral,
  generalDirty,
  generalSaveError,
}: Props) {
  const { t } = useI18n();
  const formatDate = (iso: string) => {
    if (!iso) return t('common.emptySymbol', '–');
    const [y, m, d] = iso.split('-');
    if (!y || !m || !d) return t('common.emptySymbol', '–');
    return `${d}.${m}.${y}`;
  };

  return (
    <section className="detail-section colloquiums-detail-section">
      <EditableSectionHeader
        title={t('colloquiums.detail.title', 'Colloquium Details')}
        editing={generalEditing}
        saving={savingGeneral}
        dirty={generalDirty}
        onEdit={onStartGeneralEditing}
        onSave={onSaveGeneralDetails}
        onCancel={onCancelGeneralEditing}
      />
      <div className="detail-grid">
        <div className="detail-field">
          <span className="detail-label">{t('colloquiums.table.name', 'Name')}</span>
          {generalEditing ? (
            <input
              className="detail-input"
              type="text"
              value={draftName}
              onChange={(e) => onChangeName(e.target.value)}
            />
          ) : (
            <span className="detail-value">{draftName || t('common.emptySymbol', '–')}</span>
          )}
        </div>
        <div className="detail-field">
          <span className="detail-label">{t('colloquiums.table.date', 'Date')}</span>
          {generalEditing ? (
            <input
              className="detail-input"
              type="date"
              value={draftDate}
              onChange={(e) => onChangeDate(e.target.value)}
            />
          ) : (
            <span className="detail-value">{formatDate(draftDate)}</span>
          )}
        </div>
        <div className="detail-field">
          <span className="detail-label">{t('colloquiums.detail.participants', 'Participants')}</span>
          {generalEditing ? (
            <PersonMultiSelect
              selectedPeople={draftParticipantsPeople}
              onChange={onChangeParticipantsPeople}
              disabled={savingGeneral}
            />
          ) : (
            <span className="detail-value">{draftParticipants || t('common.emptySymbol', '–')}</span>
          )}
        </div>
      </div>
      <ErrorBanner message={generalSaveError} />
      <div className="colloquiums-agenda-section">
        <div className="detail-section-heading">
          <h3>{colloqium.completed ? t('colloquiums.table.summary', 'Summary') : t('colloquiums.table.agenda', 'Agenda')}</h3>
          {editingAgendaId === null && !colloqium.completed && (
            <button className="ci-add-btn" onClick={onStartAddAgenda}>{t('colloquiums.actions.add', '+ Add')}</button>
          )}
        </div>
        <ErrorBanner message={agendaSaveError} />
        {loadingAgendas ? (
          <p className="status">{t('colloquiums.agenda.loading', 'Loading agenda...')}</p>
        ) : (
          <ColloquiumAgendaTable
            agendas={agendas}
            editingAgendaId={editingAgendaId}
            savingAgenda={savingAgenda}
            deletingAgendaId={deletingAgendaId}
            decisionOptions={decisionOptions}
            editingForm={editingAgendaForm}
            selectedEpisodePreviews={selectedEpisodePreviews}
            patientsById={patientsById}
            onStartEdit={onStartEditAgenda}
            onCancelEdit={onCancelEditAgenda}
            onSave={onSaveAgenda}
            onDelete={onDeleteAgenda}
            onOpenEpisode={onOpenEpisode}
            onPickEpisode={onPickEpisode}
            onEditFormChange={onAgendaFormChange}
            selectedEpisodeLabel={selectedEpisodeLabel}
            showDecisionFields={colloqium.completed}
            readOnly={colloqium.completed}
            presenterOptions={draftParticipantsPeople}
          />
        )}
      </div>
      <EpisodePickerDialog
        open={pickerOpen}
        organLabel={colloqium.colloqium_type?.organ ? translateCodeLabel(t, colloqium.colloqium_type.organ) : t('colloquiums.detail.unknownOrgan', 'Unknown organ')}
        rows={pickerRows}
        loading={pickerLoading}
        initialSelectedEpisodeIds={
          editingAgendaForm.episode_ids.length > 0
            ? editingAgendaForm.episode_ids
            : (editingAgendaForm.episode_id ? [editingAgendaForm.episode_id] : [])
        }
        nonSelectableEpisodeIds={pickerNonSelectableEpisodeIds}
        onClose={onPickEpisodeClose}
        onConfirm={onPickEpisodeConfirm}
      />
    </section>
  );
}

