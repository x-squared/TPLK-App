import { useMemo, useState } from 'react';
import { translateCodeLabel } from '../../i18n/codeTranslations';
import ErrorBanner from '../layout/ErrorBanner';
import { formatDateDdMmYyyy } from '../layout/dateFormat';
import InlineDeleteActions from '../layout/InlineDeleteActions';
import { useI18n } from '../../i18n/i18n';
import RichTextEditor from '../layout/RichTextEditor';
import InformationOrganContextDropdown from './InformationOrganContextDropdown';
import type { InformationSectionModel } from './types';

interface InformationRowsSectionProps {
  model: InformationSectionModel;
}

export default function InformationRowsSection({ model }: InformationRowsSectionProps) {
  const { t } = useI18n();
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(null);
  const [pendingWithdrawId, setPendingWithdrawId] = useState<number | null>(null);
  const [filterQuery, setFilterQuery] = useState('');
  const today = new Date().toISOString().slice(0, 10);
  const normalizedFilterQuery = filterQuery.trim().toLowerCase();
  const canManageRow = (row: { author_id: number }) => row.author_id === model.currentUserId || model.currentUserIsAdmin;
  const badgeClassForRow = (row: { current_user_read_at: string | null; valid_from: string; withdrawn: boolean }) => {
    if (row.withdrawn) return row.current_user_read_at ? 'info-read-badge-withdrawn-read' : 'info-read-badge-withdrawn-unread';
    if (row.current_user_read_at) return 'info-read-badge-read';
    if (row.valid_from <= today) return 'info-read-badge-unread-valid';
    return 'info-read-badge-unread-future';
  };
  const filterTokens = useMemo(
    () =>
      [...model.areaContexts, ...model.organContexts]
        .map((context) => translateCodeLabel(t, context).trim())
        .filter((entry) => entry.length > 0),
    [model.areaContexts, model.organContexts, t],
  );
  const filteredRows = useMemo(() => {
    if (!normalizedFilterQuery) return model.rows;
    return model.rows.filter((row) => {
      const contextLabels = (row.contexts ?? [])
        .map((context) => translateCodeLabel(t, context))
        .join(' ');
      const rowSearchBlob = [
        `${row.id}`,
        row.text.replace(/<[^>]*>/g, ' '),
        row.author?.name ?? `#${row.author_id}`,
        row.date,
        row.valid_from,
        contextLabels || (row.context ? translateCodeLabel(t, row.context) : t('information.context.general', 'General')),
        row.withdrawn ? t('information.actions.withdraw', 'Withdraw') : '',
      ]
        .join(' ')
        .toLowerCase();
      return rowSearchBlob.includes(normalizedFilterQuery);
    });
  }, [model.rows, normalizedFilterQuery, t]);

  return (
    <section className="detail-section ui-panel-section">
      <div className="detail-section-heading">
        <h2>{`${t('information.title', 'Information')} (${model.totalCount})`}</h2>
        {!model.adding && model.editingId == null && (
          <button className="ci-add-btn" onClick={model.startAdd}>
            {t('information.actions.add', '+ Add')}
          </button>
        )}
      </div>
      <label className="info-hide-read-filter">
        <input
          type="checkbox"
          checked={model.hideRead}
          onChange={(event) => model.setHideRead(event.target.checked)}
        />
        {t('information.showUnreadOnly', 'Show unread only')}
      </label>
      <label className="info-search-filter">
        <span>{t('information.filters.searchLabel', 'Filter')}</span>
        <input
          className="detail-input"
          type="search"
          list="information-organ-filter-suggestions"
          value={filterQuery}
          onChange={(event) => setFilterQuery(event.target.value)}
          placeholder={t('information.filters.searchPlaceholder', 'Search in all fields...')}
        />
      </label>
      <datalist id="information-organ-filter-suggestions">
        {filterTokens.map((label) => (
          <option key={label} value={label} />
        ))}
      </datalist>
      <p className="detail-help info-read-help">{t('information.help.markRead', 'Click a badge in the first column to mark information as read.')}</p>
      {pendingWithdrawId != null ? (
        <p className="detail-help info-read-help">{t('information.help.withdrawRead', 'This information was already read. You can edit the text and then click Withdraw.')}</p>
      ) : null}
      <ErrorBanner message={model.error} />
      <div className="patients-table-wrap ui-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th className="info-read-col">{t('information.table.read', 'Read')}</th>
              <th className="info-text-col">{t('information.table.text', 'Text')}</th>
              <th className="info-valid-from-col">{t('information.table.validFrom', 'Valid from')}</th>
              <th className="info-author-col">{t('information.table.author', 'Author')}</th>
              <th>{t('information.table.context', 'Context')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {(model.adding || model.editingId != null) && (
              <tr className="ci-editing-row">
                <td>
                  <span
                    className={`info-read-badge ${model.draft.valid_from <= today ? 'info-read-badge-unread-valid' : 'info-read-badge-unread-future'}`}
                    title={model.draft.valid_from <= today
                      ? t('information.badge.unreadValid', 'Unread and valid')
                      : t('information.badge.unreadNotYetValid', 'Unread and not yet valid')}
                  />
                </td>
                <td>
                  <RichTextEditor
                    value={model.draft.text}
                    onChange={model.setDraftText}
                    ariaLabel={t('information.table.text', 'Text')}
                    boldTitle={t('information.editor.bold', 'Bold')}
                    italicTitle={t('information.editor.italic', 'Italic')}
                    underlineTitle={t('information.editor.underline', 'Underline')}
                  />
                  <small className="info-editor-count">{model.draftTextLength} / 1024</small>
                </td>
                <td className="info-valid-from-col">
                  <input
                    className="detail-input ci-inline-input"
                    type="date"
                    min={model.minValidFrom}
                    value={model.draft.valid_from}
                    onChange={(event) => model.setDraft({ ...model.draft, valid_from: event.target.value })}
                  />
                </td>
                <td className="info-author-col">
                  {model.authors.find((author) => author.id === model.draft.author_id)?.name ?? `#${model.draft.author_id}`}
                </td>
                <td>
                  <div className="info-context-edit-grid">
                    {model.areaContexts.length > 0 ? (
                      <select
                        className="detail-input ci-inline-input"
                        value={model.draft.area_context_id ?? ''}
                        onChange={(event) => {
                          const nextAreaId = event.target.value ? Number(event.target.value) : null;
                          const organIds = model.draft.context_ids.filter((contextId) =>
                            model.organContexts.some((context) => context.id === contextId));
                          const isOrganArea = model.areaContexts.find((context) => context.id === nextAreaId)?.key === 'ORGAN';
                          const nextContextIds = nextAreaId == null
                            ? []
                            : isOrganArea
                              ? [nextAreaId, ...organIds]
                              : [nextAreaId];
                          model.setDraft({
                            ...model.draft,
                            area_context_id: nextAreaId,
                            context_ids: nextContextIds,
                            context_id: nextContextIds[0] ?? null,
                          });
                        }}
                      >
                        {model.areaContexts.map((context) => (
                          <option key={context.id} value={context.id}>
                            {translateCodeLabel(t, context)}
                          </option>
                        ))}
                      </select>
                    ) : null}
                    {(model.areaContexts.length === 0 || model.areaContexts.find((context) => context.id === model.draft.area_context_id)?.key === 'ORGAN') ? (
                      <InformationOrganContextDropdown
                        organContexts={model.organContexts}
                        selectedContextIds={model.draft.context_ids.filter((contextId) =>
                          model.organContexts.some((context) => context.id === contextId))}
                        onChange={(nextOrgans) => {
                          const nextAreaId = model.draft.area_context_id;
                          const nextContextIds = nextAreaId == null ? nextOrgans : [nextAreaId, ...nextOrgans];
                          model.setDraft({
                            ...model.draft,
                            context_ids: nextContextIds,
                            context_id: nextContextIds[0] ?? null,
                          });
                        }}
                        disabled={model.saving}
                      />
                    ) : null}
                  </div>
                </td>
                <td className="detail-ci-actions">
                  <button
                    className="ci-save-inline"
                    onClick={() => {
                      void model.saveDraft();
                    }}
                    disabled={model.saving || !model.canSaveDraft}
                    title={t('actions.save', 'Save')}
                    aria-label={t('actions.save', 'Save')}
                  >
                    ✓
                  </button>
                  <button
                    className="ci-cancel-inline"
                    onClick={() => {
                      setPendingWithdrawId(null);
                      model.cancelDraft();
                    }}
                    disabled={model.saving}
                    title={t('actions.cancel', 'Cancel')}
                    aria-label={t('actions.cancel', 'Cancel')}
                  >
                    ✕
                  </button>
                  {pendingWithdrawId != null && model.editingId === pendingWithdrawId ? (
                    <button
                      className="ci-delete-btn"
                      onClick={() => {
                        const targetId = pendingWithdrawId;
                        setPendingWithdrawId(null);
                        model.cancelDraft();
                        void model.deleteRow(targetId);
                      }}
                      disabled={model.saving}
                      title={t('information.actions.withdraw', 'Withdraw')}
                      aria-label={t('information.actions.withdraw', 'Withdraw')}
                    >
                      {t('information.actions.withdraw', 'Withdraw')}
                    </button>
                  ) : null}
                </td>
              </tr>
            )}
            {filteredRows.length === 0 && !model.loading ? (
              <tr>
                <td colSpan={6} className="status">
                  {normalizedFilterQuery
                    ? t('information.filters.emptyFiltered', 'No information entries match your filter.')
                    : t('information.empty', 'No information rows yet.')}
                </td>
              </tr>
            ) : null}
            {filteredRows.map((row) => (
              <tr key={row.id} className={row.current_user_read_at && !row.withdrawn ? 'info-row-read' : ''}>
                <td className="info-read-col">
                  {row.current_user_read_at ? (
                    <span
                      className={`info-read-badge ${badgeClassForRow(row)}`}
                      title={row.withdrawn ? t('information.badge.withdrawnRead', 'Withdrawn (read)') : t('information.badge.read', 'Read')}
                    />
                  ) : (
                    <button
                      className={`info-read-badge ${badgeClassForRow(row)}`}
                      title={row.withdrawn
                        ? t('information.badge.clickToConfirm', 'click to confirm')
                        : (row.valid_from <= today
                          ? t('information.badge.unreadValid', 'Unread and valid')
                          : t('information.badge.unreadNotYetValid', 'Unread and not yet valid'))}
                      disabled={model.saving}
                      onClick={() => {
                        void model.markRowRead(row.id);
                      }}
                    />
                  )}
                </td>
                <td className="info-text-col">
                  <div className="info-text-render" dangerouslySetInnerHTML={{ __html: row.text }} />
                </td>
                <td className="info-valid-from-col">{formatDateDdMmYyyy(row.valid_from)}</td>
                <td className="info-author-col">{row.author?.name ?? `#${row.author_id}`}</td>
                <td>
                  {(() => {
                    const areaContext = (row.contexts ?? []).find((context) => context.type === 'INFORMATION_AREA');
                    const organContexts = (row.contexts ?? []).filter((context) => context.type === 'ORGAN');
                    if (areaContext || organContexts.length > 0) {
                      return (
                        <div className="person-pill-list">
                          {areaContext ? (
                            <span className="person-pill">
                              {translateCodeLabel(t, areaContext)}
                            </span>
                          ) : (
                            <span className="person-pill">
                              {t('information.context.general', 'General')}
                            </span>
                          )}
                          {organContexts.map((context) => (
                            <span key={`${row.id}-${context.id}`} className="person-pill">
                              {translateCodeLabel(t, context)}
                            </span>
                          ))}
                        </div>
                      );
                    }
                    return (
                      <span className="person-pill">
                        {t('information.context.general', 'General')}
                      </span>
                    );
                  })()}
                </td>
                <td className="detail-ci-actions">
                  {canManageRow(row) ? (
                    row.withdrawn ? (
                      <button
                        className="ci-edit-inline"
                        onClick={() => {
                          setConfirmingDeleteId(null);
                          model.startEdit(row);
                        }}
                        title={t('actions.edit', 'Edit')}
                      >
                        ✎
                      </button>
                    ) : (
                      <InlineDeleteActions
                        confirming={confirmingDeleteId === row.id}
                        deleting={model.saving}
                        onEdit={() => {
                          setConfirmingDeleteId(null);
                          model.startEdit(row);
                        }}
                        onRequestDelete={() => {
                          if (row.has_reads) {
                            setConfirmingDeleteId(null);
                            setPendingWithdrawId(row.id);
                            model.startEdit(row);
                            return;
                          }
                          setConfirmingDeleteId(row.id);
                        }}
                        onConfirmDelete={() => {
                          setConfirmingDeleteId(null);
                          void model.deleteRow(row.id);
                        }}
                        onCancelDelete={() => setConfirmingDeleteId(null)}
                      />
                    )
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
