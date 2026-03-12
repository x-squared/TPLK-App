import { useMemo, useState } from 'react';

import type { Catalogue, CatalogueTypeSummary } from '../../../api';
import ErrorBanner from '../../layout/ErrorBanner';
import { useI18n } from '../../../i18n/i18n';

interface EditFormState {
  pos: number;
  ext_sys: string;
  ext_key: string;
  name_default: string;
  name_en: string;
  name_de: string;
}

interface AdminCataloguesTabProps {
  catalogueTypes: CatalogueTypeSummary[];
  selectedType: string | null;
  catalogues: Catalogue[];
  loading: boolean;
  saving: boolean;
  error: string;
  onSelectType: (catalogueType: string) => void;
  onUpdateCatalogue: (
    catalogueId: number,
    payload: Partial<Pick<Catalogue, 'pos' | 'ext_sys' | 'ext_key' | 'name_default' | 'name_en' | 'name_de'>>,
  ) => Promise<void>;
}

export default function AdminCataloguesTab({
  catalogueTypes,
  selectedType,
  catalogues,
  loading,
  saving,
  error,
  onSelectType,
  onUpdateCatalogue,
}: AdminCataloguesTabProps) {
  const { locale, t } = useI18n();
  const [editingCatalogueId, setEditingCatalogueId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);

  const sortedTypes = useMemo(
    () => [...catalogueTypes].sort((a, b) => a.type.localeCompare(b.type)),
    [catalogueTypes],
  );
  const sortedValues = useMemo(
    () => [...catalogues].sort((a, b) => (a.pos - b.pos) || a.key.localeCompare(b.key)),
    [catalogues],
  );

  const startEdit = (entry: Catalogue) => {
    setEditingCatalogueId(entry.id);
    setEditForm({
      pos: entry.pos,
      ext_sys: entry.ext_sys ?? '',
      ext_key: entry.ext_key ?? '',
      name_default: entry.name_default ?? '',
      name_en: entry.name_en ?? '',
      name_de: entry.name_de ?? '',
    });
  };

  const saveEdit = async (catalogueId: number) => {
    if (!editForm) return;
    await onUpdateCatalogue(catalogueId, {
      pos: editForm.pos,
      ext_sys: editForm.ext_sys.trim(),
      ext_key: editForm.ext_key.trim(),
      name_default: editForm.name_default.trim(),
      name_en: editForm.name_en.trim(),
      name_de: editForm.name_de.trim(),
    });
    setEditingCatalogueId(null);
    setEditForm(null);
  };

  const renderLocalizedName = (entry: Catalogue): string => {
    if (locale === 'de') {
      return entry.name_de || entry.name_default || t('common.emptySymbol', '–');
    }
    return entry.name_en || entry.name_default || t('common.emptySymbol', '–');
  };

  return (
    <section className="detail-section ui-panel-section">
      <div className="detail-section-heading">
        <h2>{t('admin.catalogues.title', 'Catalogues')}</h2>
      </div>
      {loading && <p className="status">{t('admin.catalogues.loading', 'Loading catalogues...')}</p>}
      {error && <ErrorBanner message={error} />}
      {!loading && (
        <>
          <div className="admin-people-card">
            <div className="detail-section-heading">
              <h3>{t('admin.catalogues.types.title', 'Catalogues')}</h3>
            </div>
            <div className="ui-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('admin.catalogues.types.columns.type', 'Type')}</th>
                    <th>{t('admin.catalogues.types.columns.count', 'Items')}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTypes.map((entry) => (
                    <tr
                      key={entry.type}
                      className={selectedType === entry.type ? 'admin-task-template-group-row-selected' : ''}
                      onClick={() => onSelectType(entry.type)}
                    >
                      <td>{entry.type}</td>
                      <td>{entry.item_count}</td>
                    </tr>
                  ))}
                  {sortedTypes.length === 0 && (
                    <tr>
                      <td colSpan={2}>{t('admin.catalogues.types.empty', 'No catalogue types available.')}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="admin-people-card">
            <div className="detail-section-heading">
              <h3>{t('admin.catalogues.values.title', 'Catalogue Values')}</h3>
            </div>
            <div className="ui-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('admin.catalogues.values.columns.key', 'Key')}</th>
                    <th>{t('admin.catalogues.values.columns.pos', 'Pos')}</th>
                    <th>{t('admin.catalogues.values.columns.nameCurrent', 'Name (Current Locale)')}</th>
                    <th>{t('admin.catalogues.values.columns.nameEn', 'Name (EN)')}</th>
                    <th>{t('admin.catalogues.values.columns.nameDe', 'Name (DE)')}</th>
                    <th>{t('admin.catalogues.values.columns.nameDefault', 'Name (Default)')}</th>
                    <th>{t('admin.catalogues.values.columns.extSys', 'Ext Sys')}</th>
                    <th>{t('admin.catalogues.values.columns.extKey', 'Ext Key')}</th>
                    <th>{t('taskBoard.columns.actions', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedValues.map((entry) => {
                    const isEditing = editingCatalogueId === entry.id && editForm !== null;
                    return (
                      <tr key={entry.id}>
                        <td>{entry.key}</td>
                        <td>
                          {isEditing ? (
                            <input
                              className="detail-input"
                              type="number"
                              value={editForm.pos}
                              onChange={(event) => setEditForm((prev) => (prev ? { ...prev, pos: Number(event.target.value || 0) } : prev))}
                            />
                          ) : entry.pos}
                        </td>
                        <td>{renderLocalizedName(entry)}</td>
                        <td>
                          {isEditing ? (
                            <input
                              className="detail-input"
                              value={editForm.name_en}
                              onChange={(event) => setEditForm((prev) => (prev ? { ...prev, name_en: event.target.value } : prev))}
                            />
                          ) : (entry.name_en || t('common.emptySymbol', '–'))}
                        </td>
                        <td>
                          {isEditing ? (
                            <input
                              className="detail-input"
                              value={editForm.name_de}
                              onChange={(event) => setEditForm((prev) => (prev ? { ...prev, name_de: event.target.value } : prev))}
                            />
                          ) : (entry.name_de || t('common.emptySymbol', '–'))}
                        </td>
                        <td>
                          {isEditing ? (
                            <input
                              className="detail-input"
                              value={editForm.name_default}
                              onChange={(event) => setEditForm((prev) => (prev ? { ...prev, name_default: event.target.value } : prev))}
                            />
                          ) : (entry.name_default || t('common.emptySymbol', '–'))}
                        </td>
                        <td>
                          {isEditing ? (
                            <input
                              className="detail-input"
                              value={editForm.ext_sys}
                              onChange={(event) => setEditForm((prev) => (prev ? { ...prev, ext_sys: event.target.value } : prev))}
                            />
                          ) : (entry.ext_sys || t('common.emptySymbol', '–'))}
                        </td>
                        <td>
                          {isEditing ? (
                            <input
                              className="detail-input"
                              value={editForm.ext_key}
                              onChange={(event) => setEditForm((prev) => (prev ? { ...prev, ext_key: event.target.value } : prev))}
                            />
                          ) : (entry.ext_key || t('common.emptySymbol', '–'))}
                        </td>
                        <td className="admin-people-actions-cell">
                          {isEditing ? (
                            <div className="admin-inline-actions">
                              <button
                                className="save-btn"
                                disabled={saving}
                                onClick={() => { void saveEdit(entry.id); }}
                              >
                                ✓
                              </button>
                              <button
                                className="cancel-btn"
                                disabled={saving}
                                onClick={() => {
                                  setEditingCatalogueId(null);
                                  setEditForm(null);
                                }}
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button className="edit-btn" disabled={saving} onClick={() => startEdit(entry)}>
                              ✎
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {sortedValues.length === 0 && (
                    <tr>
                      <td colSpan={9}>{t('admin.catalogues.values.empty', 'No values available for the selected catalogue.')}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
