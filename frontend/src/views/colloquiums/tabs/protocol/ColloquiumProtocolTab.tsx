import { useEffect, useMemo, useState } from 'react';
import { type Code, type ColloqiumAgenda, type PatientListItem, type Person } from '../../../../api';
import { translateCodeLabel } from '../../../../i18n/codeTranslations';
import { useI18n } from '../../../../i18n/i18n';
import { exportColloquiumProtocolPdf } from './exportColloquiumProtocol';
import TaskBoard from '../../../tasks/TaskBoard';
import PersonMultiSelect from '../../../layout/PersonMultiSelect';

interface Props {
  draftName: string;
  draftDate: string;
  draftParticipants: string;
  draftParticipantsPeople: Person[];
  draftSignatoriesPeople: Person[];
  agendas: ColloqiumAgenda[];
  agendaDrafts: Record<number, AgendaDraft>;
  loadingAgendas: boolean;
  decisionOptions: Code[];
  patientsById: Record<number, PatientListItem>;
  isColloqiumCompleted: boolean;
  completingColloqium: boolean;
  onCompleteColloqium: () => void;
  onChangeAgendaDraft: (agendaId: number, patch: Partial<AgendaDraft>) => void;
  onChangeDraftSignatoriesPeople: (next: Person[]) => void;
  onChangeDraftParticipantsPeople: (next: Person[]) => void;
}

export interface AgendaDraft {
  presented_by_id: number | null;
  decision: string;
  decision_reason: string;
  comment: string;
}

function formatDate(iso: string | null): string {
  if (!iso) return '–';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

export default function ColloquiumProtocolTab({
  draftName,
  draftDate,
  draftParticipants,
  draftParticipantsPeople,
  draftSignatoriesPeople,
  agendas,
  agendaDrafts,
  loadingAgendas,
  decisionOptions,
  patientsById,
  isColloqiumCompleted,
  completingColloqium,
  onCompleteColloqium,
  onChangeAgendaDraft,
  onChangeDraftSignatoriesPeople,
  onChangeDraftParticipantsPeople,
}: Props) {
  const { t } = useI18n();
  const [exportingPdf, setExportingPdf] = useState(false);
  const [visibleTaskListsByAgendaId, setVisibleTaskListsByAgendaId] = useState<Record<number, boolean>>({});
  const [taskAutoCreateTokenByAgendaId, setTaskAutoCreateTokenByAgendaId] = useState<Record<number, number>>({});
  const [pendingAutoCreateAgendaId, setPendingAutoCreateAgendaId] = useState<number | null>(null);
  const sortedAgendas = useMemo(
    () => [...agendas].sort((a, b) => (a.episode?.start ?? '').localeCompare(b.episode?.start ?? '')),
    [agendas],
  );
  const resolvePhase = (agenda: ColloqiumAgenda): { label: string; from: string | null; to: string | null } => {
    const episode = agenda.episode;
    if (!episode) return { label: t('colloquiums.protocol.phaseLabels.unknown', 'Unknown'), from: null, to: null };
    if (episode.closed) return { label: t('colloquiums.protocol.phaseLabels.closed', 'Closed'), from: episode.start, to: episode.end };
    if (episode.fup_recipient_card_date) return { label: t('colloquiums.protocol.phaseLabels.followUp', 'Follow-Up'), from: episode.fup_recipient_card_date, to: null };
    if (episode.tpl_date) return { label: t('colloquiums.protocol.phaseLabels.transplantation', 'Transplantation'), from: episode.tpl_date, to: null };
    if (episode.list_start || episode.list_end) return { label: t('colloquiums.protocol.phaseLabels.listing', 'Listing'), from: episode.list_start, to: episode.list_end };
    if (episode.eval_start || episode.eval_end) return { label: t('colloquiums.protocol.phaseLabels.evaluation', 'Evaluation'), from: episode.eval_start, to: episode.eval_end };
    return { label: t('server.entities.episode', 'Episode'), from: episode.start, to: episode.end };
  };

  const handleExportPdf = async () => {
    if (exportingPdf) return;
    setExportingPdf(true);
    try {
      await exportColloquiumProtocolPdf({
        draftName,
        draftDate,
        draftParticipants,
        signatoriesPeople: draftSignatoriesPeople,
        isColloqiumCompleted,
        presenterPeople: draftParticipantsPeople,
        agendas: sortedAgendas,
        agendaDrafts,
        patientsById,
      });
    } finally {
      setExportingPdf(false);
    }
  };

  useEffect(() => {
    if (pendingAutoCreateAgendaId === null) return;
    if (!visibleTaskListsByAgendaId[pendingAutoCreateAgendaId]) return;
    setTaskAutoCreateTokenByAgendaId((prev) => ({
      ...prev,
      [pendingAutoCreateAgendaId]: (prev[pendingAutoCreateAgendaId] ?? 0) + 1,
    }));
    setPendingAutoCreateAgendaId(null);
  }, [pendingAutoCreateAgendaId, visibleTaskListsByAgendaId]);

  return (
    <section className="colloquiums-protocol paper-layout">
      <header className="colloquiums-protocol-header">
        <h2>{t('coordination.tabs.protocol', 'Protocol')}</h2>
        <button className="patients-save-btn" onClick={handleExportPdf} disabled={exportingPdf}>
          {exportingPdf ? t('colloquiums.protocol.creatingPdf', 'Creating PDF...') : t('colloquiums.protocol.pdf', 'PDF')}
        </button>
      </header>

      <div>
        <section className="colloquiums-protocol-meta detail-section">
          <div className="detail-grid">
            <div className="detail-field">
              <span className="detail-label">{t('colloquiums.table.name', 'Name')}</span>
              <span className="detail-value">{draftName || t('common.emptySymbol', '–')}</span>
            </div>
            <div className="detail-field">
              <span className="detail-label">{t('colloquiums.table.date', 'Date')}</span>
              <span className="detail-value">{formatDate(draftDate || null)}</span>
            </div>
            <div className="detail-field">
              <span className="detail-label">{t('colloquiums.detail.participants', 'Participants')}</span>
              <PersonMultiSelect
                selectedPeople={draftParticipantsPeople}
                onChange={onChangeDraftParticipantsPeople}
              />
            </div>
          </div>
        </section>

        {loadingAgendas ? (
          <p className="status">{t('colloquiums.agenda.loading', 'Loading agenda...')}</p>
        ) : sortedAgendas.length === 0 ? (
          <p className="status">{t('colloquiums.agenda.empty', 'No agenda entries.')}</p>
        ) : (
          <div className="colloquiums-protocol-agenda">
            {sortedAgendas.map((agenda, idx) => {
              const draft = agendaDrafts[agenda.id] ?? { presented_by_id: null, decision: '', decision_reason: '', comment: '' };
              const patient = agenda.episode ? patientsById[agenda.episode.patient_id] : undefined;
              const phase = resolvePhase(agenda);
              const tasksVisible = visibleTaskListsByAgendaId[agenda.id] ?? false;
              const canOpenTasks = Boolean(agenda.episode?.patient_id && agenda.episode_id);
              return (
                <section
                  key={agenda.id}
                  className={`colloquiums-protocol-episode ${idx > 0 ? 'with-divider' : ''}`}
                >
                  <div className="colloquiums-protocol-episode-head">
                    <strong>
                      {patient
                        ? `${patient.name}, ${patient.first_name} (${patient.pid})`
                        : `${t('colloquiums.protocol.unknownPatient', 'Unknown patient')} (${t('server.entities.episode', 'Episode')} ${agenda.episode?.fall_nr || `#${agenda.episode_id}`})`}
                    </strong>
                  </div>
                  <div className="colloquiums-protocol-episode-meta">
                    <span>{t('server.entities.episode', 'Episode')}: {agenda.episode?.fall_nr || `#${agenda.episode_id}`}</span>
                    <span>{t('coordinations.table.status', 'Status')}: {translateCodeLabel(t, agenda.episode?.status)}</span>
                    <span>
                      {t('colloquiums.protocol.phase', 'Phase')}: {phase.label} ({formatDate(phase.from)} – {formatDate(phase.to)})
                    </span>
                  </div>

                  <div className="colloquiums-protocol-episode-fields">
                    <label>
                      {t('colloquiums.protocol.presentedBy', 'Presented By')}
                      <select
                        value={draft.presented_by_id ?? ''}
                        onChange={(e) =>
                          onChangeAgendaDraft(agenda.id, { presented_by_id: e.target.value ? Number(e.target.value) : null })}
                      >
                        <option value="">{t('colloquiums.protocol.presentedByPlaceholder', 'Select presenter')}</option>
                        {draftParticipantsPeople.map((person) => (
                          <option key={person.id} value={person.id}>
                            {`${person.first_name} ${person.surname}`.trim()}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="colloquiums-protocol-decision-field">
                      {t('colloquiums.protocol.decision', 'Decision')}
                      <select
                        className="colloquiums-protocol-decision-select"
                        value={draft.decision}
                        onChange={(e) => onChangeAgendaDraft(agenda.id, { decision: e.target.value })}
                      >
                        <option value="">{t('colloquiums.protocol.decisionPlaceholder', 'Select decision')}</option>
                        {decisionOptions.map((option) => (
                          <option key={option.id} value={option.key}>
                            {translateCodeLabel(t, option)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="colloquiums-protocol-reason-field">
                      {t('colloquiums.protocol.decisionReason', 'Reason')}
                      <input
                        type="text"
                        maxLength={128}
                        value={draft.decision_reason}
                        onChange={(e) => onChangeAgendaDraft(agenda.id, { decision_reason: e.target.value })}
                      />
                    </label>
                    <label>
                      {t('taskBoard.columns.comment', 'Comment')}
                      <textarea
                        rows={3}
                        value={draft.comment}
                        onChange={(e) => onChangeAgendaDraft(agenda.id, { comment: e.target.value })}
                      />
                    </label>
                  </div>

                  <div className="colloquiums-protocol-tasks-placeholder">
                    {!tasksVisible ? (
                      <>
                        <button
                          className="patients-cancel-btn"
                          disabled={!canOpenTasks}
                          onClick={() =>
                            setVisibleTaskListsByAgendaId((prev) => ({ ...prev, [agenda.id]: true }))
                          }
                        >
                          {t('colloquiums.protocol.showTasks', 'Show tasks')}
                        </button>
                        <button
                          className="patients-add-btn"
                          disabled={!canOpenTasks}
                          onClick={() => {
                            if (tasksVisible) {
                              setTaskAutoCreateTokenByAgendaId((prev) => ({
                                ...prev,
                                [agenda.id]: (prev[agenda.id] ?? 0) + 1,
                              }));
                              return;
                            }
                            setVisibleTaskListsByAgendaId((prev) => ({ ...prev, [agenda.id]: true }));
                            setPendingAutoCreateAgendaId(agenda.id);
                          }}
                        >
                          {t('colloquiums.protocol.addTask', '+ Add task')}
                        </button>
                      </>
                    ) : (
                      <button
                        className="patients-cancel-btn"
                        onClick={() =>
                          setVisibleTaskListsByAgendaId((prev) => ({ ...prev, [agenda.id]: false }))
                        }
                      >
                        {t('colloquiums.protocol.hideTasks', 'Hide tasks')}
                      </button>
                    )}
                  </div>
                  {tasksVisible && canOpenTasks && (
                    <TaskBoard
                      declaredContextType="COLLOQUIUM"
                      title={t('colloquiums.protocol.taskList', 'Task list')}
                      criteria={{
                        patientId: agenda.episode!.patient_id,
                        episodeId: agenda.episode_id,
                        colloqiumAgendaId: agenda.id,
                        colloqiumId: agenda.colloqium_id,
                      }}
                      hideFilters
                      showGroupHeadingsDefault={false}
                      includeClosedTasks
                      autoCreateToken={taskAutoCreateTokenByAgendaId[agenda.id]}
                      onAutoCreateDiscarded={() =>
                        setVisibleTaskListsByAgendaId((prev) => ({ ...prev, [agenda.id]: false }))
                      }
                      maxTableHeight={280}
                    />
                  )}
                </section>
              );
            })}
          </div>
        )}

        <section className="colloquiums-protocol-signatories detail-section">
          <div className="detail-section-heading">
            <h3>{t('colloquiums.protocol.signatories.title', 'Signatories')}</h3>
          </div>
          <div className="colloquiums-protocol-signatories-field">
            <span>{t('colloquiums.protocol.signatories.field', 'Signatories')}</span>
            <PersonMultiSelect
              selectedPeople={draftSignatoriesPeople}
              onChange={onChangeDraftSignatoriesPeople}
            />
          </div>
          <div className="colloquiums-protocol-signatories-actions">
            <button
              className="patients-save-btn"
              onClick={onCompleteColloqium}
              disabled={isColloqiumCompleted || completingColloqium}
            >
              {isColloqiumCompleted
                ? t('colloquiums.protocol.completed', 'Colloquium completed')
                : (completingColloqium
                    ? t('colloquiums.actions.completing', 'Completing...')
                    : t('colloquiums.actions.complete', 'Colloquium complete'))}
            </button>
          </div>
        </section>
      </div>
    </section>
  );
}

