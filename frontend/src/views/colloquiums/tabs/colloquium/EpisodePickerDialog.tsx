import { useEffect, useMemo, useState } from 'react';
import type { PatientListItem } from '../../../../api';
import { useI18n } from '../../../../i18n/i18n';

interface EpisodeChoice {
  episodeId: number;
  patientId: number;
  fallNr: string;
  statusReference: string;
  start: string | null;
  end: string | null;
}

interface CandidateRow {
  patient: PatientListItem;
  episodes: EpisodeChoice[];
}

interface Props {
  open: boolean;
  organLabel: string;
  rows: CandidateRow[];
  loading: boolean;
  initialSelectedEpisodeIds: number[];
  nonSelectableEpisodeIds: number[];
  onClose: () => void;
  onConfirm: (episodeIds: number[]) => void;
}

function formatDob(iso: string | null): string {
  if (!iso) return '–';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '–';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

export default function EpisodePickerDialog({
  open,
  organLabel,
  rows,
  loading,
  initialSelectedEpisodeIds,
  nonSelectableEpisodeIds,
  onClose,
  onConfirm,
}: Props) {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [selectedEpisodeIds, setSelectedEpisodeIds] = useState<number[]>([]);

  useEffect(() => {
    if (!open) return;
    setSelectedEpisodeIds(initialSelectedEpisodeIds);
  }, [open, initialSelectedEpisodeIds]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(({ patient }) =>
      `${patient.first_name} ${patient.name} ${patient.pid} ${patient.date_of_birth ?? ''}`
        .toLowerCase()
        .includes(q),
    );
  }, [rows, search]);

  if (!open) return null;

  return (
    <div className="colloquium-dialog-overlay" role="dialog" aria-modal="true" aria-label={t('episodePicker.selectEpisode', 'Select episode')}>
      <div className="colloquium-dialog">
        <header className="colloquium-dialog-header">
          <h3>{t('episodePicker.selectEpisode', 'Select episode')} ({organLabel})</h3>
          <button className="patients-cancel-btn" onClick={onClose}>{t('episodePicker.close', 'Close')}</button>
        </header>

        <div className="colloquium-dialog-search">
          <input
            className="detail-input"
            placeholder={t('episodePicker.searchPlaceholder', 'Search by name, PID, or date of birth')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <p className="status">{t('episodePicker.loading', 'Loading matching patients...')}</p>
        ) : filtered.length === 0 ? (
          <p className="status">{t('episodePicker.empty', 'No patients with a current matching episode.')}</p>
        ) : (
          <div className="patients-table-wrap ui-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th></th>
                  <th>{t('patients.table.name', 'Name')}</th>
                  <th>{t('patients.table.pid', 'PID')}</th>
                  <th>{t('patients.table.dateOfBirth', 'Date of Birth')}</th>
                  <th>{t('episodePicker.episode', 'Episode')}</th>
                  <th>{t('patients.episodes.status', 'Status')}</th>
                  <th>{t('patients.episodes.start', 'Start')}</th>
                  <th>{t('patients.episodes.end', 'End')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.flatMap(({ patient, episodes }) =>
                  episodes.map((episode, idx) => (
                    <tr key={`${patient.id}-${episode.episodeId}`} className={nonSelectableEpisodeIds.includes(episode.episodeId) ? 'row-expanded' : ''}>
                      <td>
                        <input
                          type="checkbox"
                          disabled={nonSelectableEpisodeIds.includes(episode.episodeId)}
                          checked={selectedEpisodeIds.includes(episode.episodeId)}
                          onChange={(e) => {
                            if (nonSelectableEpisodeIds.includes(episode.episodeId)) return;
                            if (e.target.checked) {
                              setSelectedEpisodeIds((prev) => [...prev, episode.episodeId]);
                            } else {
                              setSelectedEpisodeIds((prev) => prev.filter((id) => id !== episode.episodeId));
                            }
                          }}
                        />
                      </td>
                      <td>{idx === 0 ? `${patient.first_name} ${patient.name}` : ''}</td>
                      <td>{idx === 0 ? patient.pid : ''}</td>
                      <td>{idx === 0 ? formatDob(patient.date_of_birth) : ''}</td>
                      <td>{episode.fallNr || `#${episode.episodeId}`}</td>
                      <td>{episode.statusReference}</td>
                      <td>{formatDate(episode.start)}</td>
                      <td>{formatDate(episode.end)}</td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="patients-add-actions">
          <button
            className="patients-save-btn"
            onClick={() => onConfirm(selectedEpisodeIds)}
            disabled={selectedEpisodeIds.length === 0}
          >
            {t('episodePicker.selectEpisode', 'Select episode')}{selectedEpisodeIds.length > 1 ? 's' : ''}
          </button>
          <button className="patients-cancel-btn" onClick={onClose}>{t('actions.cancel', 'Cancel')}</button>
        </div>
      </div>
    </div>
  );
}

