import { useMemo, useState } from 'react';

import type { ProcurementAdminConfig, TaskGroupTemplate } from '../../../../api';
import { translateCodeLabel } from '../../../../i18n/codeTranslations';
import { useI18n } from '../../../../i18n/i18n';
import type { ProcurementProtocolTaskGroupSelectionCreatePayload } from './types';

interface ConfiguredProtocolTaskGroupsSectionProps {
  config: ProcurementAdminConfig;
  sortedTaskGroupTemplates: TaskGroupTemplate[];
  saving: boolean;
  onCreateSelection: (payload: ProcurementProtocolTaskGroupSelectionCreatePayload) => Promise<void>;
  onReorderSelections: (selectionIdsInOrder: number[]) => Promise<void>;
  onDeleteSelection: (selectionId: number) => Promise<void>;
}

export default function ConfiguredProtocolTaskGroupsSection({
  config,
  sortedTaskGroupTemplates,
  saving,
  onCreateSelection,
  onReorderSelections,
  onDeleteSelection,
}: ConfiguredProtocolTaskGroupsSectionProps) {
  const { t } = useI18n();
  const [draftTemplateId, setDraftTemplateId] = useState<number>(0);
  const [draftOrganId, setDraftOrganId] = useState<number>(0);
  const [draggingSelectionId, setDraggingSelectionId] = useState<number | null>(null);
  const [dragOverSelectionId, setDragOverSelectionId] = useState<number | null>(null);

  const selections = useMemo(
    () => [...(config.protocol_task_group_selections ?? [])].sort((a, b) => (a.pos - b.pos) || (a.id - b.id)),
    [config.protocol_task_group_selections],
  );

  const usedByTemplateAndOrgan = useMemo(() => {
    const out = new Set<string>();
    for (const entry of selections) {
      out.add(`${entry.task_group_template_id}:${entry.organ_id ?? 0}`);
    }
    return out;
  }, [selections]);

  const nextDefaultPos = useMemo(
    () => (selections.reduce((maxPos, entry) => Math.max(maxPos, entry.pos), 0) + 1),
    [selections],
  );

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

  return (
    <section className="admin-proc-block">
      <div className="detail-section-heading admin-proc-block-heading">
        <h2>{t('admin.procurementConfig.protocolTaskGroups.title', 'Protocol Task Groups')}</h2>
      </div>
      <div className="admin-proc-block-grid">
        <div className="admin-proc-pane admin-proc-define-pane">
          <h3>{t('admin.procurementConfig.fields.definitionArea', 'Definition Area')}</h3>
          <div className="admin-people-form admin-proc-field-form">
            <label>
              <span>{t('admin.procurementConfig.protocolTaskGroups.groupTemplate', 'Task Group Template')}</span>
              <select
                className="detail-input"
                value={draftTemplateId}
                onChange={(e) => setDraftTemplateId(Number(e.target.value) || 0)}
              >
                <option value={0}>{t('admin.procurementConfig.protocolTaskGroups.selectGroupTemplate', 'Select task group template')}</option>
                {sortedTaskGroupTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{t('taskBoard.filters.organ', 'Organ')}</span>
              <select
                className="detail-input"
                value={draftOrganId}
                onChange={(e) => setDraftOrganId(Number(e.target.value) || 0)}
              >
                <option value={0}>{t('admin.taskTemplates.allOrgans', 'All organs')}</option>
                {config.organs.map((organ) => (
                  <option key={organ.id} value={organ.id}>{translateCodeLabel(t, organ)}</option>
                ))}
              </select>
            </label>
            <div className="admin-proc-action-cell">
              <button
                type="button"
                className="patients-save-btn"
                disabled={
                  saving
                  || !draftTemplateId
                  || usedByTemplateAndOrgan.has(`${draftTemplateId}:${draftOrganId || 0}`)
                }
                onClick={() => {
                  const payload = {
                    task_group_template_id: draftTemplateId,
                    organ_id: draftOrganId || null,
                    pos: nextDefaultPos,
                  };
                  void onCreateSelection(payload);
                  setDraftTemplateId(0);
                  setDraftOrganId(0);
                }}
              >
                {t('admin.procurementConfig.protocolTaskGroups.addSelection', 'Add Selection')}
              </button>
            </div>
          </div>
        </div>
        <div className="admin-proc-pane admin-proc-data-pane">
          <h3>{t('admin.procurementConfig.fields.configuredData', 'Configured Data')}</h3>
          {selections.length === 0 ? (
            <p className="detail-empty">{t('admin.procurementConfig.protocolTaskGroups.empty', 'No protocol task groups selected.')}</p>
          ) : (
            <div className="patients-table-wrap ui-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('admin.procurementConfig.protocolTaskGroups.groupTemplate', 'Task Group Template')}</th>
                    <th>{t('taskBoard.filters.organ', 'Organ')}</th>
                    <th>{t('taskBoard.columns.actions', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {selections.map((selection) => (
                    <tr
                      key={selection.id}
                      draggable={!saving}
                      onDragStart={() => setDraggingSelectionId(selection.id)}
                      onDragOver={(event) => {
                        event.preventDefault();
                        setDragOverSelectionId(selection.id);
                      }}
                      onDragLeave={() => setDragOverSelectionId((prev) => (prev === selection.id ? null : prev))}
                      onDrop={() => {
                        if (draggingSelectionId == null) return;
                        const orderedIds = selections.map((entry) => entry.id);
                        const nextOrder = reorderIds(orderedIds, draggingSelectionId, selection.id);
                        if (nextOrder.join(',') !== orderedIds.join(',')) {
                          void onReorderSelections(nextOrder);
                        }
                        setDraggingSelectionId(null);
                        setDragOverSelectionId(null);
                      }}
                      onDragEnd={() => {
                        setDraggingSelectionId(null);
                        setDragOverSelectionId(null);
                      }}
                      className={
                        draggingSelectionId === selection.id
                          ? 'ci-dragging'
                          : dragOverSelectionId === selection.id
                            ? 'ci-drag-over'
                            : ''
                      }
                    >
                      <td>{selection.task_group_template?.name ?? `#${selection.task_group_template_id}`}</td>
                      <td>{selection.organ ? translateCodeLabel(t, selection.organ) : t('admin.taskTemplates.allOrgans', 'All organs')}</td>
                      <td className="detail-ci-actions">
                        <button
                          className="ci-cancel-inline"
                          onClick={() => {
                            void onDeleteSelection(selection.id);
                          }}
                          disabled={saving}
                          title={t('actions.remove', 'Remove')}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
