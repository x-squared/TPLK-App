import { Fragment, useEffect, useRef } from 'react';
import type { CoordinationListRow } from './useCoordinationsListViewModel';
import { translateCodeLabel } from '../../../i18n/codeTranslations';
import ErrorBanner from '../../layout/ErrorBanner';
import { formatDateDdMmYyyy } from '../../layout/dateFormat';
import type { Code, CoordinationEpisode, PatientListItem } from '../../../api';
import { useI18n } from '../../../i18n/i18n';
import {
  ACTION_I18N_KEYS,
  COLLOQUIUM_I18N_KEYS,
  COMMON_I18N_KEYS,
  COORDINATION_I18N_KEYS,
  EPISODE_PICKER_I18N_KEYS,
} from '../../../i18n/keys';
import { formatDefaultEpisodeReference } from '../../layout/episodeDisplay';

function fmt(value: string | null | undefined): string {
  return formatDateDdMmYyyy(value);
}

interface Props {
  rows: CoordinationListRow[];
  onOpenCoordination: (id: number) => void;
  onOpenPatientEpisode?: (patientId: number, episodeId: number) => void;
  hasActiveFilter?: boolean;
  expandedEpisodesCoordinationId: number | null;
  episodesByCoordinationId: Record<number, CoordinationEpisode[]>;
  patientById: Record<number, PatientListItem>;
  loadingEpisodesByCoordinationId: Record<number, boolean>;
  onToggleAssignedEpisodes: (coordinationId: number) => void;
  adding: boolean;
  creating: boolean;
  createError: string;
  deathKindCodes: Code[];
  startDateInput: string;
  donorFullName: string;
  donorBirthDateInput: string;
  donorDeathKindId: number | null;
  donorNr: string;
  swtplNr: string;
  nationalCoordinator: string;
  comment: string;
  donorFocusToken: number;
  onDateChange: (value: string) => void;
  onDonorFullNameChange: (value: string) => void;
  onDonorBirthDateChange: (value: string) => void;
  onDonorDeathKindChange: (value: string) => void;
  onFieldChange: (key: 'donor_nr' | 'swtpl_nr' | 'national_coordinator' | 'comment', value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export default function CoordinationsTable({
  rows,
  onOpenCoordination,
  onOpenPatientEpisode,
  hasActiveFilter = false,
  expandedEpisodesCoordinationId,
  episodesByCoordinationId,
  patientById,
  loadingEpisodesByCoordinationId,
  onToggleAssignedEpisodes,
  adding,
  creating,
  createError,
  deathKindCodes,
  startDateInput,
  donorFullName,
  donorBirthDateInput,
  donorDeathKindId,
  donorNr,
  swtplNr,
  nationalCoordinator,
  comment,
  donorFocusToken,
  onDateChange,
  onDonorFullNameChange,
  onDonorBirthDateChange,
  onDonorDeathKindChange,
  onFieldChange,
  onSave,
  onCancel,
}: Props) {
  const { t } = useI18n();
  const donorNameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!adding) {
      return;
    }
    donorNameInputRef.current?.focus();
  }, [adding, donorFocusToken]);

  const groupedEpisodes = (entries: CoordinationEpisode[]) => {
    const grouped = new Map<number, { episode: CoordinationEpisode['episode']; organNames: string[] }>();
    entries.forEach((entry) => {
      if (entry.is_organ_rejected) {
        return;
      }
      const bucket = grouped.get(entry.episode_id);
      const organLabel = translateCodeLabel(t, entry.organ);
      if (!bucket) {
        grouped.set(entry.episode_id, { episode: entry.episode, organNames: [organLabel] });
        return;
      }
      if (!bucket.organNames.includes(organLabel)) bucket.organNames.push(organLabel);
    });
    return [...grouped.entries()].map(([episodeId, payload]) => {
      const patient = payload.episode?.patient_id ? patientById[payload.episode.patient_id] : undefined;
      const patientFullName = patient ? `${patient.first_name} ${patient.name}`.trim() : '';
      return {
        episodeId,
        patientId: payload.episode?.patient_id ?? null,
        label: formatDefaultEpisodeReference({
          episodeId,
          episodeCaseNumber: payload.episode?.fall_nr ?? null,
          patientFullName,
          patientBirthDate: patient?.date_of_birth ?? null,
          patientPid: patient?.pid ?? null,
          emptySymbol: t(COMMON_I18N_KEYS.emptySymbol, '–'),
        }),
        organs: payload.organNames.join(', '),
      };
    });
  };

  return (
    <div className="patients-table-wrap ui-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th className="open-col"></th>
            <th>{t(COORDINATION_I18N_KEYS.table.status, 'Status')}</th>
            <th>{t(COORDINATION_I18N_KEYS.table.start, 'Start')}</th>
            <th>{t(COORDINATION_I18N_KEYS.table.end, 'End')}</th>
            <th>{t(COORDINATION_I18N_KEYS.table.donorName, 'Donor Name')}</th>
            <th>{t(COORDINATION_I18N_KEYS.table.dateOfBirth, 'Date of Birth')}</th>
            <th>{t(COORDINATION_I18N_KEYS.table.reasonOfDeath, 'Reason of Death')}</th>
            <th>{t(COORDINATION_I18N_KEYS.table.swtplNr, 'SWTPL Nr')}</th>
            <th>{t(COORDINATION_I18N_KEYS.table.assignedEpisodes, 'Assigned episodes')}</th>
          </tr>
        </thead>
        <tbody>
          {adding && (
            <tr>
              <td colSpan={9}>
                <form
                  className="patients-add-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!creating) {
                      onSave();
                    }
                  }}
                >
                  <input
                    type="date"
                    value={startDateInput}
                    onChange={(e) => onDateChange(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder={t(COORDINATION_I18N_KEYS.form.donorNameRequired, 'Donor name *')}
                    value={donorFullName}
                    ref={donorNameInputRef}
                    onChange={(e) => onDonorFullNameChange(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder={t(COORDINATION_I18N_KEYS.form.donorNr, 'Donor Nr')}
                    value={donorNr}
                    onChange={(e) => onFieldChange('donor_nr', e.target.value)}
                  />
                  <input
                    type="date"
                    value={donorBirthDateInput}
                    onChange={(e) => onDonorBirthDateChange(e.target.value)}
                  />
                  <select
                    className="filter-select"
                    value={donorDeathKindId ?? ''}
                    onChange={(e) => onDonorDeathKindChange(e.target.value)}
                  >
                    <option value="">{t(COORDINATION_I18N_KEYS.form.reasonOfDeath, 'Reason of death...')}</option>
                    {deathKindCodes.map((code) => (
                      <option key={code.id} value={code.id}>
                        {translateCodeLabel(t, code)}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder={t(COORDINATION_I18N_KEYS.form.swtplNr, 'SWTPL Nr')}
                    value={swtplNr}
                    onChange={(e) => onFieldChange('swtpl_nr', e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder={t(COORDINATION_I18N_KEYS.form.nationalCoordinator, 'National coordinator')}
                    value={nationalCoordinator}
                    onChange={(e) => onFieldChange('national_coordinator', e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder={t(COORDINATION_I18N_KEYS.form.comment, 'Comment')}
                    value={comment}
                    onChange={(e) => onFieldChange('comment', e.target.value)}
                  />
                  <div className="patients-add-actions">
                    <button className="patients-save-btn" type="submit" disabled={creating}>
                      {creating
                        ? t(COORDINATION_I18N_KEYS.form.saving, 'Saving...')
                        : t(ACTION_I18N_KEYS.save, 'Save')}
                    </button>
                    <button className="patients-cancel-btn" type="button" onClick={onCancel} disabled={creating}>
                      {t(ACTION_I18N_KEYS.cancel, 'Cancel')}
                    </button>
                  </div>
                  <ErrorBanner message={createError} />
                </form>
              </td>
            </tr>
          )}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={9} className="status">
                {hasActiveFilter
                  ? t(COORDINATION_I18N_KEYS.emptyFiltered, 'No coordinations match the filter.')
                  : t(COORDINATION_I18N_KEYS.empty, 'No coordinations found.')}
              </td>
            </tr>
          ) : rows.map((row) => {
            const isEpisodesExpanded = expandedEpisodesCoordinationId === row.coordination.id;
            const episodes = episodesByCoordinationId[row.coordination.id] ?? [];
            const loadingEpisodes = loadingEpisodesByCoordinationId[row.coordination.id] === true;
            const groupedAssignedEpisodes = groupedEpisodes(episodes);
            const assignedEpisodeCount = groupedAssignedEpisodes.length;
            return (
              <Fragment key={row.coordination.id}>
                <tr onDoubleClick={() => onOpenCoordination(row.coordination.id)}>
                  <td className="open-col">
                    <button
                      className="open-btn"
                      onClick={() => onOpenCoordination(row.coordination.id)}
                      title={t(COORDINATION_I18N_KEYS.actions.openCoordination, 'Open coordination')}
                    >
                      &#x279C;
                    </button>
                  </td>
                  <td>{translateCodeLabel(t, row.coordination.status)}</td>
                  <td>{fmt(row.coordination.start)}</td>
                  <td>{fmt(row.coordination.end)}</td>
                  <td>{row.donor?.full_name || t(COMMON_I18N_KEYS.emptySymbol, '–')}</td>
                  <td>{fmt(row.donor?.birth_date ?? null)}</td>
                  <td>{translateCodeLabel(t, row.donor?.death_kind)}</td>
                  <td>{row.coordination.swtpl_nr || t(COMMON_I18N_KEYS.emptySymbol, '–')}</td>
                  <td>
                    <button
                      className="link-btn"
                      title={t(COORDINATION_I18N_KEYS.episodes.toggle, 'Toggle assigned episodes')}
                      onClick={(event) => {
                        event.stopPropagation();
                        onToggleAssignedEpisodes(row.coordination.id);
                      }}
                    >
                      {assignedEpisodeCount} {isEpisodesExpanded ? '▲' : '▼'}
                    </button>
                  </td>
                </tr>
                {isEpisodesExpanded && (
                  <tr className="contact-row">
                    <td colSpan={9}>
                      <div className="contact-section">
                        {loadingEpisodes ? (
                          <p className="contact-empty">
                            {t(COORDINATION_I18N_KEYS.episodes.loading, 'Loading assigned episodes...')}
                          </p>
                        ) : groupedAssignedEpisodes.length === 0 ? (
                          <p className="contact-empty">
                            {t(COORDINATION_I18N_KEYS.episodes.empty, 'No assigned episodes.')}
                          </p>
                        ) : (
                          <table className="data-table coord-assigned-episodes-table">
                            <thead>
                              <tr>
                                <th className="open-col"></th>
                                <th>{t(EPISODE_PICKER_I18N_KEYS.episode, 'Episode')}</th>
                                <th>{t(COORDINATION_I18N_KEYS.episodes.assignedOrgans, 'Assigned organs')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {groupedAssignedEpisodes.map((entry) => {
                                const canOpenEpisode = Boolean(entry.patientId && onOpenPatientEpisode);
                                return (
                                  <tr key={entry.episodeId}>
                                    <td className="open-col">
                                      <button
                                        className="open-btn"
                                        onClick={() => {
                                          if (!entry.patientId || !onOpenPatientEpisode) return;
                                          onOpenPatientEpisode(entry.patientId, entry.episodeId);
                                        }}
                                        title={t(COLLOQUIUM_I18N_KEYS.actions.openEpisode, 'Open episode')}
                                        disabled={!canOpenEpisode}
                                      >
                                        &#x279C;
                                      </button>
                                    </td>
                                    <td>{entry.label}</td>
                                    <td>{entry.organs || t(COMMON_I18N_KEYS.emptySymbol, '–')}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
