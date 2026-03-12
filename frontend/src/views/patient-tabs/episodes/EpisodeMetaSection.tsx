import { useMemo, useState } from 'react';
import type { Code, Episode, EpisodeOrgan } from '../../../api';
import { translateCodeLabel } from '../../../i18n/codeTranslations';
import { useI18n } from '../../../i18n/i18n';
import type { EpisodeMetaForm } from './types';

interface EpisodeMetaSectionProps {
  selectedEpisode: Episode;
  editingEpisodeMeta: boolean;
  episodeMetaForm: EpisodeMetaForm;
  setEpisodeMetaForm: React.Dispatch<React.SetStateAction<EpisodeMetaForm>>;
  detailSaving: boolean;
  startEditingEpisodeMeta: () => void;
  handleSaveEpisodeMeta: () => void;
  setEditingEpisodeMeta: React.Dispatch<React.SetStateAction<boolean>>;
  formatDate: (iso: string | null) => string;
  organCodes: Code[];
  organActionLoading: boolean;
  onAddOrReactivateOrgan: (payload: {
    organ_id: number;
    date_added?: string | null;
    comment?: string;
    reason_activation_change?: string;
  }) => void;
  onUpdateOrgan: (episodeOrganId: number, payload: {
    comment?: string;
    is_active?: boolean;
    date_inactivated?: string | null;
    reason_activation_change?: string;
  }) => void;
  favoriteControl?: React.ReactNode;
}

export default function EpisodeMetaSection({
  selectedEpisode,
  editingEpisodeMeta,
  episodeMetaForm,
  setEpisodeMetaForm,
  detailSaving,
  startEditingEpisodeMeta,
  handleSaveEpisodeMeta,
  setEditingEpisodeMeta,
  formatDate,
  organCodes,
  organActionLoading,
  onAddOrReactivateOrgan,
  onUpdateOrgan,
  favoriteControl,
}: EpisodeMetaSectionProps) {
  const { t } = useI18n();
  const [addingOrgan, setAddingOrgan] = useState(false);
  const [newOrganId, setNewOrganId] = useState<number | null>(null);
  const [newOrganDateAdded, setNewOrganDateAdded] = useState(() => new Date().toISOString().slice(0, 10));
  const [newOrganComment, setNewOrganComment] = useState('');
  const [newOrganReason, setNewOrganReason] = useState('');
  const [editingOrganId, setEditingOrganId] = useState<number | null>(null);
  const [editingComment, setEditingComment] = useState('');
  const [editingReason, setEditingReason] = useState('');

  const activeOrganName = useMemo(() => {
    const active = selectedEpisode.episode_organs
      .filter((row) => row.is_active)
      .filter((row) => row.organ != null)
      .map((row) => translateCodeLabel(t, row.organ))
      .filter((name): name is string => Boolean(name));
    if (active.length > 0) return active.join(' / ');
    return translateCodeLabel(t, selectedEpisode.organ);
  }, [selectedEpisode, t]);
  const isEvaluationPhase = ((selectedEpisode.phase?.key ?? '') || '').trim().toUpperCase() === 'EVALUATION';

  const currentOrganIds = new Set(selectedEpisode.episode_organs.map((row) => row.organ_id));

  const sortedRows = useMemo(
    () =>
      [...selectedEpisode.episode_organs].sort((a, b) => {
        if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
        const an = translateCodeLabel(t, a.organ);
        const bn = translateCodeLabel(t, b.organ);
        return an.localeCompare(bn);
      }),
    [selectedEpisode.episode_organs, t],
  );

  const handleAdd = () => {
    if (!newOrganId) return;
    onAddOrReactivateOrgan({
      organ_id: newOrganId,
      date_added: newOrganDateAdded || null,
      comment: newOrganComment.trim(),
      reason_activation_change: newOrganReason.trim(),
    });
    setAddingOrgan(false);
    setNewOrganId(null);
    setNewOrganDateAdded(new Date().toISOString().slice(0, 10));
    setNewOrganComment('');
    setNewOrganReason('');
  };

  const startEditingOrgan = (row: EpisodeOrgan) => {
    setEditingOrganId(row.id);
    setEditingComment(row.comment ?? '');
    setEditingReason(row.reason_activation_change ?? '');
  };

  const cancelEditingOrgan = () => {
    setEditingOrganId(null);
    setEditingComment('');
    setEditingReason('');
  };

  const saveEditingOrgan = (row: EpisodeOrgan) => {
    onUpdateOrgan(row.id, {
      comment: editingComment.trim(),
      reason_activation_change: editingReason.trim(),
    });
    cancelEditingOrgan();
  };

  return (
    <>
      <div className="detail-section-heading">
        <div className="ui-heading-title-with-favorite">
          <h2>{t('server.entities.episode', 'Episode')} {activeOrganName}</h2>
          {favoriteControl}
        </div>
        {!addingOrgan ? (
          <button
            className="ci-add-btn"
            onClick={() => {
              setAddingOrgan(true);
              setNewOrganId(null);
              setNewOrganDateAdded(new Date().toISOString().slice(0, 10));
            }}
            disabled={organActionLoading || !isEvaluationPhase}
          >
            {t('episode.meta.addOrgan', '+ Add organ')}
          </button>
        ) : null}
      </div>
      <section className="episode-meta-section">
        <table className="detail-contact-table episode-organs-table">
          <thead>
            <tr>
              <th>{t('coordinations.table.organ', 'Organ')}</th>
              <th>{t('episode.meta.dateAdded', 'Date added')}</th>
              <th>{t('taskBoard.columns.comment', 'Comment')}</th>
              <th>{t('episode.meta.active', 'Active')}</th>
              <th>{t('episode.meta.dateInactivated', 'Date inactivated')}</th>
              <th>{t('episode.meta.reason', 'Reason')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.length === 0 && !addingOrgan ? (
              <tr>
                <td colSpan={7} className="detail-empty">{t('episode.meta.emptyOrgans', 'No organs linked to this episode.')}</td>
              </tr>
            ) : null}
            {sortedRows.map((row) => (
              <tr key={row.id} className={row.is_active ? '' : 'episode-organ-row-inactive'}>
                <td>{translateCodeLabel(t, row.organ)}</td>
                <td>{formatDate(row.date_added)}</td>
                <td>
                  {editingOrganId === row.id ? (
                    <input
                      className="detail-input ci-inline-input"
                      value={editingComment}
                      onChange={(e) => setEditingComment(e.target.value)}
                      maxLength={512}
                      disabled={organActionLoading}
                    />
                  ) : (
                    row.comment || t('common.emptySymbol', '–')
                  )}
                </td>
                <td>{row.is_active ? t('common.yes', 'Yes') : t('common.no', 'No')}</td>
                <td>{formatDate(row.date_inactivated)}</td>
                <td>
                  {editingOrganId === row.id ? (
                    <input
                      className="detail-input ci-inline-input"
                      value={editingReason}
                      onChange={(e) => setEditingReason(e.target.value)}
                      maxLength={128}
                      disabled={organActionLoading}
                    />
                  ) : (
                    row.reason_activation_change || t('common.emptySymbol', '–')
                  )}
                </td>
                <td className="detail-ci-actions">
                  {editingOrganId === row.id ? (
                    <>
                      <button
                        type="button"
                        className="ci-save-inline"
                        onClick={() => saveEditingOrgan(row)}
                        disabled={organActionLoading}
                        title={t('actions.save', 'Save')}
                      >
                        ✓
                      </button>
                      <button
                        type="button"
                        className="ci-cancel-inline"
                        onClick={cancelEditingOrgan}
                        disabled={organActionLoading}
                        title={t('actions.cancel', 'Cancel')}
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="ci-edit-inline"
                        onClick={() => startEditingOrgan(row)}
                        disabled={organActionLoading}
                        title={t('actions.edit', 'Edit')}
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        className={row.is_active ? 'ci-delete-btn' : 'ci-save-inline'}
                        onClick={() =>
                          onUpdateOrgan(row.id, {
                            is_active: !row.is_active,
                            date_inactivated: row.is_active ? new Date().toISOString().slice(0, 10) : null,
                          })
                        }
                        disabled={organActionLoading || (!row.is_active && !isEvaluationPhase)}
                        title={row.is_active ? t('episode.meta.deactivate', 'Deactivate') : t('episode.meta.reactivate', 'Reactivate')}
                      >
                        {row.is_active ? '×' : '↺'}
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {addingOrgan ? (
              <tr className="ci-editing-row">
                <td>
                  <select
                    className="detail-input ci-inline-input"
                    value={newOrganId ?? ''}
                    onChange={(e) => setNewOrganId(e.target.value ? Number(e.target.value) : null)}
                    disabled={organActionLoading}
                  >
                    <option value="">{t('episode.meta.selectOrgan', 'Select organ...')}</option>
                    {organCodes.map((code) => (
                      <option key={code.id} value={code.id}>
                        {translateCodeLabel(t, code)}
                        {currentOrganIds.has(code.id) ? ` (${t('episode.meta.existing', 'existing')})` : ''}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    type="date"
                    className="detail-input ci-inline-input"
                    value={newOrganDateAdded}
                    onChange={(e) => setNewOrganDateAdded(e.target.value)}
                    disabled={organActionLoading}
                  />
                </td>
                <td>
                  <input
                    className="detail-input ci-inline-input"
                    value={newOrganComment}
                    onChange={(e) => setNewOrganComment(e.target.value)}
                    maxLength={512}
                    disabled={organActionLoading}
                  />
                </td>
                <td>{t('common.yes', 'Yes')}</td>
                <td>{t('common.emptySymbol', '–')}</td>
                <td>
                  <input
                    className="detail-input ci-inline-input"
                    value={newOrganReason}
                    onChange={(e) => setNewOrganReason(e.target.value)}
                    maxLength={128}
                    disabled={organActionLoading}
                  />
                </td>
                <td className="detail-ci-actions">
                  <button
                    type="button"
                    className="ci-save-inline"
                    onClick={handleAdd}
                    disabled={organActionLoading || !newOrganId || !isEvaluationPhase}
                    title={t('actions.save', 'Save')}
                  >
                    ✓
                  </button>
                  <button
                    type="button"
                    className="ci-cancel-inline"
                    onClick={() => {
                      setAddingOrgan(false);
                      setNewOrganId(null);
                      setNewOrganDateAdded(new Date().toISOString().slice(0, 10));
                      setNewOrganComment('');
                      setNewOrganReason('');
                    }}
                    disabled={organActionLoading}
                    title={t('actions.cancel', 'Cancel')}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <div className="detail-section-heading episode-meta-notes-heading">
          <h3>{t('episode.meta.episodeData', 'Episode Data')}</h3>
          {editingEpisodeMeta ? (
            <div className="edit-actions">
              <button
                type="button"
                className="save-btn"
                onClick={handleSaveEpisodeMeta}
                disabled={detailSaving}
              >
                {detailSaving ? t('coordinations.form.saving', 'Saving...') : t('actions.save', 'Save')}
              </button>
              <button
                type="button"
                className="cancel-btn"
                onClick={() => setEditingEpisodeMeta(false)}
                disabled={detailSaving}
              >
                {t('actions.cancel', 'Cancel')}
              </button>
            </div>
          ) : (
            <button type="button" className="edit-btn" onClick={startEditingEpisodeMeta}>{t('actions.edit', 'Edit')}</button>
          )}
        </div>
        <div className="episode-meta-grid">
          <div className="episode-detail-field episode-meta-case">
            <span className="episode-detail-label">{t('episode.meta.fallNr', 'Fall-Nr.')}</span>
            {editingEpisodeMeta ? (
              <input
                className="detail-input"
                value={episodeMetaForm.fall_nr}
                onChange={(e) => setEpisodeMetaForm((f) => ({ ...f, fall_nr: e.target.value }))}
              />
            ) : (
              <span className="episode-detail-value">{selectedEpisode.fall_nr || t('common.emptySymbol', '–')}</span>
            )}
          </div>
          <div className="episode-detail-field episode-meta-comment">
            <span className="episode-detail-label">{t('taskBoard.columns.comment', 'Comment')}</span>
            {editingEpisodeMeta ? (
              <textarea
                className="detail-input episode-meta-textarea"
                rows={2}
                value={episodeMetaForm.comment}
                onChange={(e) => setEpisodeMetaForm((f) => ({ ...f, comment: e.target.value }))}
              />
            ) : (
              <textarea
                className="detail-input episode-meta-textarea episode-meta-readonly"
                rows={2}
                readOnly
                value={selectedEpisode.comment ?? ''}
              />
            )}
          </div>
          <div className="episode-detail-field episode-meta-cave">
            <span className="episode-detail-label">{t('episode.meta.cave', 'Cave')}</span>
            {editingEpisodeMeta ? (
              <textarea
                className="detail-input episode-meta-textarea"
                rows={2}
                value={episodeMetaForm.cave}
                onChange={(e) => setEpisodeMetaForm((f) => ({ ...f, cave: e.target.value }))}
              />
            ) : (
              <textarea
                className="detail-input episode-meta-textarea episode-meta-readonly"
                rows={2}
                readOnly
                value={selectedEpisode.cave ?? ''}
              />
            )}
          </div>
        </div>
      </section>
    </>
  );
}
