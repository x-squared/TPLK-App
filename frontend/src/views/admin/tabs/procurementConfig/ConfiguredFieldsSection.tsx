import { Fragment, useState } from 'react';

import type { ProcurementAdminConfig, ProcurementSlotKey } from '../../../../api';
import { translateCodeLabel } from '../../../../i18n/codeTranslations';
import { useI18n } from '../../../../i18n/i18n';
import type { ProcurementFieldUpdatePayload, ProcurementScopeCreatePayload } from './types';

interface ConfiguredFieldsSectionProps {
  config: ProcurementAdminConfig;
  groups: ProcurementAdminConfig['field_group_templates'];
  sortedFieldTemplates: ProcurementAdminConfig['field_templates'];
  groupNameById: Map<number, string>;
  datatypeNameById: Map<number, string>;
  scopesByFieldId: Record<number, ProcurementAdminConfig['field_scope_templates']>;
  saving: boolean;
  onUpdateField: (fieldId: number, payload: ProcurementFieldUpdatePayload) => Promise<void>;
  onReorderFields: (
    assignments: Array<{ field_id: number; group_template_id: number | null; pos: number }>,
  ) => Promise<void>;
  onCreateScope: (payload: ProcurementScopeCreatePayload) => Promise<void>;
  onDeleteScope: (scopeId: number) => Promise<void>;
}

export default function ConfiguredFieldsSection({
  config,
  groups,
  sortedFieldTemplates,
  groupNameById,
  datatypeNameById,
  scopesByFieldId,
  saving,
  onUpdateField,
  onReorderFields,
  onCreateScope,
  onDeleteScope,
}: ConfiguredFieldsSectionProps) {
  const { t } = useI18n();
  const [editingFieldId, setEditingFieldId] = useState<number | null>(null);
  const [editingFieldDraft, setEditingFieldDraft] = useState({ group_template_id: 0, comment: '', is_active: true, pos: 0 });
  const [scopeDraftByFieldId, setScopeDraftByFieldId] = useState<Record<number, { organ_id: number; slot_key: ProcurementSlotKey }>>({});
  const [expandedScopeFieldId, setExpandedScopeFieldId] = useState<number | null>(null);
  const [draggingFieldId, setDraggingFieldId] = useState<number | null>(null);
  const [dragOverFieldId, setDragOverFieldId] = useState<number | null>(null);

  const reorderIds = (ids: number[], sourceId: number, targetId: number): number[] => {
    const fromIndex = ids.indexOf(sourceId);
    const toIndex = ids.indexOf(targetId);
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
      return ids;
    }
    const next = [...ids];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    return next;
  };

  const handleFieldDrop = (targetFieldId: number) => {
    if (draggingFieldId == null || draggingFieldId === targetFieldId) {
      setDraggingFieldId(null);
      setDragOverFieldId(null);
      return;
    }

    const byId = new Map(sortedFieldTemplates.map((entry) => [entry.id, entry]));
    const orderedIds = sortedFieldTemplates.map((entry) => entry.id);
    const nextOrderIds = reorderIds(orderedIds, draggingFieldId, targetFieldId);
    const targetField = byId.get(targetFieldId);
    if (!targetField) {
      setDraggingFieldId(null);
      setDragOverFieldId(null);
      return;
    }

    const movedField = byId.get(draggingFieldId);
    if (!movedField) {
      setDraggingFieldId(null);
      setDragOverFieldId(null);
      return;
    }

    const nextGroupById = new Map<number, number | null>();
    for (const field of sortedFieldTemplates) {
      nextGroupById.set(field.id, field.group_template_id ?? null);
    }
    nextGroupById.set(draggingFieldId, targetField.group_template_id ?? null);

    const nextPosByFieldId = new Map<number, number>();
    const posByGroup = new Map<string, number>();
    for (const fieldId of nextOrderIds) {
      const groupId = nextGroupById.get(fieldId) ?? null;
      const bucket = groupId == null ? 'ungrouped' : `group:${groupId}`;
      const nextPos = (posByGroup.get(bucket) ?? 0) + 1;
      posByGroup.set(bucket, nextPos);
      nextPosByFieldId.set(fieldId, nextPos);
    }

    const assignments: Array<{ field_id: number; group_template_id: number | null; pos: number }> = [];
    for (const field of sortedFieldTemplates) {
      const nextGroupId = nextGroupById.get(field.id) ?? null;
      const nextPos = nextPosByFieldId.get(field.id) ?? field.pos;
      if ((field.group_template_id ?? null) !== nextGroupId || field.pos !== nextPos) {
        assignments.push({
          field_id: field.id,
          group_template_id: nextGroupId,
          pos: nextPos,
        });
      }
    }

    if (assignments.length > 0) {
      void onReorderFields(assignments);
    }
    setDraggingFieldId(null);
    setDragOverFieldId(null);
  };

  return (
    <section className="admin-proc-block">
      <div className="detail-section-heading admin-proc-block-heading">
        <h2>{t('admin.procurementConfig.fields.title', 'Fields')}</h2>
      </div>
      <div className="admin-proc-block-grid">
        <div className="admin-proc-pane admin-proc-data-pane">
          <div className="patients-table-wrap ui-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('admin.procurementConfig.fields.group', 'Group')}</th>
                  <th>{t('admin.procurementConfig.fields.field', 'Field')}</th>
                  <th>{t('taskBoard.columns.comment', 'Comment')}</th>
                  <th>{t('admin.taskTemplates.active', 'Active')}</th>
                  <th>{t('admin.taskTemplates.position', 'Pos')}</th>
                  <th>{t('admin.procurementConfig.fields.datatype', 'Datatype')}</th>
                  <th>{t('admin.procurementConfig.fields.mode', 'Mode')}</th>
                  <th>{t('admin.procurementConfig.fields.scopes', 'Scopes')}</th>
                  <th>{t('taskBoard.columns.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {sortedFieldTemplates.map((field) => {
                  const currentScopeDraft = scopeDraftByFieldId[field.id] ?? { organ_id: 0, slot_key: 'MAIN' as ProcurementSlotKey };
                  const scopes = scopesByFieldId[field.id] ?? [];
                  const scopeCount = scopes.length;
                  const scopesExpanded = expandedScopeFieldId === field.id;
                  const isEditingRow = editingFieldId === field.id;
                  return (
                    <Fragment key={field.id}>
                      {isEditingRow ? (
                        <tr className="ci-editing-row">
                          <td>
                            <select
                              className="detail-input ci-inline-input"
                              value={editingFieldDraft.group_template_id}
                              onChange={(e) => setEditingFieldDraft((prev) => ({ ...prev, group_template_id: Number(e.target.value) || 0 }))}
                            >
                              <option value={0}>{t('admin.procurementConfig.fields.noGroup', 'No group')}</option>
                              {groups.map((group) => (
                                <option key={group.id} value={group.id}>{group.name_default}</option>
                              ))}
                            </select>
                          </td>
                          <td>{field.name_default} <span className="admin-access-permission-key">({field.key})</span></td>
                          <td>
                            <input
                              className="detail-input ci-inline-input"
                              value={editingFieldDraft.comment}
                              disabled
                              onChange={(e) => setEditingFieldDraft((prev) => ({ ...prev, comment: e.target.value }))}
                            />
                          </td>
                          <td>
                            <input
                              type="checkbox"
                              checked={editingFieldDraft.is_active}
                              disabled
                              onChange={(e) => setEditingFieldDraft((prev) => ({ ...prev, is_active: e.target.checked }))}
                            />
                          </td>
                          <td>
                            <input
                              className="detail-input ci-inline-input"
                              type="number"
                              value={editingFieldDraft.pos}
                              onChange={(e) => setEditingFieldDraft((prev) => ({ ...prev, pos: Number(e.target.value) || 0 }))}
                            />
                          </td>
                          <td>{datatypeNameById.get(field.datatype_def_id) ?? t('common.emptySymbol', '–')}</td>
                          <td>{field.value_mode}</td>
                          <td>
                            <button
                              type="button"
                              className="link-btn"
                              onClick={() => setExpandedScopeFieldId((prev) => (prev === field.id ? null : field.id))}
                              title={scopesExpanded ? t('admin.procurementConfig.fields.hideScopes', 'Hide scopes') : t('admin.procurementConfig.fields.showScopes', 'Show scopes')}
                            >
                              {scopeCount} {scopesExpanded ? '▲' : '▼'}
                            </button>
                          </td>
                          <td className="detail-ci-actions">
                            <button
                              className="ci-save-inline"
                              onClick={() => {
                                void onUpdateField(field.id, {
                                  group_template_id: editingFieldDraft.group_template_id || null,
                                  pos: editingFieldDraft.pos,
                                });
                                setEditingFieldId(null);
                              }}
                              disabled={
                                saving
                                || (
                                  editingFieldDraft.group_template_id === (field.group_template_id ?? 0)
                                  && editingFieldDraft.pos === (field.pos ?? 0)
                                )
                              }
                            >
                              ✓
                            </button>
                            <button
                              className="ci-cancel-inline"
                              onClick={() => setEditingFieldId(null)}
                              disabled={saving}
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ) : (
                        <tr
                          draggable={!saving && editingFieldId == null}
                          onDragStart={() => setDraggingFieldId(field.id)}
                          onDragOver={(event) => {
                            event.preventDefault();
                            setDragOverFieldId(field.id);
                          }}
                          onDragLeave={() => setDragOverFieldId((prev) => (prev === field.id ? null : prev))}
                          onDrop={() => handleFieldDrop(field.id)}
                          onDragEnd={() => {
                            setDraggingFieldId(null);
                            setDragOverFieldId(null);
                          }}
                          className={draggingFieldId === field.id ? 'ci-dragging' : dragOverFieldId === field.id ? 'ci-drag-over' : ''}
                        >
                          <td>{field.group_template_id ? (groupNameById.get(field.group_template_id) ?? t('common.emptySymbol', '–')) : t('common.emptySymbol', '–')}</td>
                          <td>{field.name_default} <span className="admin-access-permission-key">({field.key})</span></td>
                          <td>{field.comment || t('common.emptySymbol', '–')}</td>
                          <td>{field.is_active ? t('common.yes', 'Yes') : t('common.no', 'No')}</td>
                          <td>{field.pos}</td>
                          <td>{datatypeNameById.get(field.datatype_def_id) ?? t('common.emptySymbol', '–')}</td>
                          <td>{field.value_mode}</td>
                          <td>
                            <button
                              type="button"
                              className="link-btn"
                              onClick={() => setExpandedScopeFieldId((prev) => (prev === field.id ? null : field.id))}
                              title={scopesExpanded ? t('admin.procurementConfig.fields.hideScopes', 'Hide scopes') : t('admin.procurementConfig.fields.showScopes', 'Show scopes')}
                            >
                              {scopeCount} {scopesExpanded ? '▲' : '▼'}
                            </button>
                          </td>
                          <td className="detail-ci-actions">
                            <button
                              className="ci-edit-inline"
                              onClick={() => {
                                setEditingFieldId(field.id);
                                setEditingFieldDraft({
                                  group_template_id: field.group_template_id ?? 0,
                                  comment: field.comment ?? '',
                                  is_active: field.is_active ?? true,
                                  pos: field.pos ?? 0,
                                });
                              }}
                              disabled={saving}
                              title={t('actions.edit', 'Edit')}
                            >
                              ✎
                            </button>
                          </td>
                        </tr>
                      )}
                      {scopesExpanded && (
                        <tr className="contact-row">
                          <td colSpan={9}>
                            <div className="contact-section">
                              {scopeCount === 0 ? (
                                <p className="contact-empty">{t('admin.procurementConfig.fields.noScopes', 'No scopes configured.')}</p>
                              ) : (
                                <div className="admin-proc-scope-list">
                                  {scopes.map((scope) => (
                                    <span key={scope.id} className="person-pill">
                                      {(scope.organ ? translateCodeLabel(t, scope.organ) : t('admin.procurementConfig.fields.all', 'All'))} / {scope.slot_key}
                                      {isEditingRow ? (
                                        <button
                                          type="button"
                                          className="person-pill-remove"
                                          title={t('admin.procurementConfig.fields.removeScope', 'Remove scope')}
                                          onClick={() => {
                                            void onDeleteScope(scope.id);
                                          }}
                                          disabled={saving}
                                        >
                                          ×
                                        </button>
                                      ) : null}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {isEditingRow ? (
                                <div className="admin-proc-scope-form">
                                  <select
                                    className="detail-input"
                                    value={currentScopeDraft.organ_id}
                                    onChange={(e) =>
                                      setScopeDraftByFieldId((prev) => ({
                                        ...prev,
                                        [field.id]: {
                                          ...currentScopeDraft,
                                          organ_id: Number(e.target.value) || 0,
                                        },
                                      }))}
                                  >
                                    <option value={0}>{t('admin.procurementConfig.fields.selectOrgan', 'Select organ')}</option>
                                    <option value={-1}>{t('admin.procurementConfig.fields.all', 'All')}</option>
                                    {config.organs.map((organ) => (
                                      <option key={organ.id} value={organ.id}>{translateCodeLabel(t, organ)}</option>
                                    ))}
                                  </select>
                                  <select
                                    className="detail-input"
                                    value={currentScopeDraft.slot_key}
                                    onChange={(e) =>
                                      setScopeDraftByFieldId((prev) => ({
                                        ...prev,
                                        [field.id]: {
                                          ...currentScopeDraft,
                                          slot_key: e.target.value as ProcurementSlotKey,
                                        },
                                      }))}
                                  >
                                    <option value="MAIN">{t('admin.procurementConfig.slot.main', 'MAIN')}</option>
                                    <option value="LEFT">{t('admin.procurementConfig.slot.left', 'LEFT')}</option>
                                    <option value="RIGHT">{t('admin.procurementConfig.slot.right', 'RIGHT')}</option>
                                  </select>
                                  <button
                                    type="button"
                                    className="patients-save-btn"
                                    disabled={saving || currentScopeDraft.organ_id === 0}
                                    onClick={() => {
                                      void onCreateScope({
                                        field_template_id: field.id,
                                        organ_id: currentScopeDraft.organ_id < 0 ? null : currentScopeDraft.organ_id,
                                        slot_key: currentScopeDraft.slot_key,
                                      });
                                    }}
                                  >
                                    {t('admin.procurementConfig.fields.addScope', 'Add Scope')}
                                  </button>
                                </div>
                              ) : null}
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
        </div>
      </div>
    </section>
  );
}
