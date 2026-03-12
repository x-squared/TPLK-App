import type { ColloqiumAgenda, ColloqiumType } from '../../../api';
import { translateCodeLabel } from '../../../i18n/codeTranslations';
import { useI18n } from '../../../i18n/i18n';
import ErrorBanner from '../../layout/ErrorBanner';

interface Props {
  loadingEpisodeColloqiums: boolean;
  episodeColloqiumAgendas: ColloqiumAgenda[];
  onOpenColloqium: (colloqiumId: number) => void;
  onOpenAssignDialog: () => void;
  formatDate: (iso: string | null) => string;
  assignDialogOpen: boolean;
  assigningColloqium: boolean;
  assignError: string;
  selectableColloqiumTypes: ColloqiumType[];
  assignTypeId: number | null;
  setAssignTypeId: (value: number | null) => void;
  assignDate: string;
  setAssignDate: (value: string) => void;
  onAssign: () => void;
  onCloseAssignDialog: () => void;
}

export default function EpisodeColloquiumSection({
  loadingEpisodeColloqiums,
  episodeColloqiumAgendas,
  onOpenColloqium,
  onOpenAssignDialog,
  formatDate,
  assignDialogOpen,
  assigningColloqium,
  assignError,
  selectableColloqiumTypes,
  assignTypeId,
  setAssignTypeId,
  assignDate,
  setAssignDate,
  onAssign,
  onCloseAssignDialog,
}: Props) {
  const { t } = useI18n();
  return (
    <>
      <section className="detail-section episode-colloqium-section">
        <div className="detail-section-heading">
          <h2>{t('server.entities.colloquium', 'Colloquium')}</h2>
          <button className="ci-add-btn" onClick={onOpenAssignDialog}>{t('information.actions.add', '+ Add')}</button>
        </div>
        {loadingEpisodeColloqiums ? (
          <p className="detail-empty">{t('episode.colloquium.loading', 'Loading colloquiums...')}</p>
        ) : episodeColloqiumAgendas.length === 0 ? (
          <p className="detail-empty">{t('episode.colloquium.empty', 'Episode is not assigned to any colloquium.')}</p>
        ) : (
          <table className="detail-contact-table">
            <thead>
              <tr>
                <th className="open-col"></th>
                <th>{t('colloquiums.table.type', 'Type')}</th>
                <th>{t('colloquiums.table.name', 'Name')}</th>
                <th>{t('colloquiums.table.date', 'Date')}</th>
                <th>{t('colloquiums.detail.participants', 'Participants')}</th>
              </tr>
            </thead>
            <tbody>
              {episodeColloqiumAgendas.map((agenda) => {
                const colloqiumId = agenda.colloqium?.id ?? null;
                return (
                  <tr
                    key={agenda.id}
                    onDoubleClick={() => {
                      if (colloqiumId) onOpenColloqium(colloqiumId);
                    }}
                  >
                    <td className="open-col">
                      <button
                        className="open-btn"
                        onClick={() => {
                          if (colloqiumId) onOpenColloqium(colloqiumId);
                        }}
                        title={t('colloquiums.actions.open', 'Open colloquium')}
                        disabled={!colloqiumId}
                      >
                        &#x279C;
                      </button>
                    </td>
                    <td>{translateCodeLabel(t, agenda.colloqium?.colloqium_type?.organ)}</td>
                    <td>{agenda.colloqium?.colloqium_type?.name ?? t('common.emptySymbol', '–')}</td>
                    <td>{formatDate(agenda.colloqium?.date ?? null)}</td>
                    <td>{agenda.colloqium?.participants ?? ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {assignDialogOpen && (
        <div className="episode-colloqium-dialog-overlay" role="dialog" aria-modal="true" aria-label={t('episode.colloquium.assignDialog.ariaLabel', 'Assign episode to colloquium')}>
          <div className="episode-colloqium-dialog">
            <h3>{t('episode.colloquium.assignDialog.title', 'Assign episode to colloquium')}</h3>
            <div className="episode-colloqium-dialog-fields">
              <label>
                {t('episode.colloquium.assignDialog.type', 'Colloquium type')}
                <select
                  className="detail-input"
                  value={assignTypeId ?? ''}
                  onChange={(e) => setAssignTypeId(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">{t('episode.colloquium.assignDialog.selectType', 'Select type...')}</option>
                  {selectableColloqiumTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {translateCodeLabel(t, type.organ)} - {type.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t('colloquiums.table.date', 'Date')}
                <input
                  className="detail-input"
                  type="date"
                  value={assignDate}
                  onChange={(e) => setAssignDate(e.target.value)}
                />
              </label>
            </div>
            <ErrorBanner message={assignError} />
            <div className="ci-add-actions">
              <button
                className="save-btn"
                onClick={onAssign}
                disabled={assigningColloqium || !assignTypeId || !assignDate}
              >
                {assigningColloqium ? t('episode.colloquium.assignDialog.assigning', 'Assigning...') : t('episode.colloquium.assignDialog.assign', 'Assign')}
              </button>
              <button
                className="cancel-btn"
                onClick={onCloseAssignDialog}
                disabled={assigningColloqium}
              >
                {t('actions.cancel', 'Cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

