import { useState } from 'react';

import type { ProcurementAdminConfig, ProcurementGroupDisplayLane } from '../../../../api';
import { useI18n } from '../../../../i18n/i18n';
import InlineDeleteActions from '../../../layout/InlineDeleteActions';
import type { ProcurementGroupCreatePayload, ProcurementGroupUpdatePayload } from './types';
import { suggestConfigKey } from './utils';

interface ConfiguredGroupsSectionProps {
  groups: ProcurementAdminConfig['field_group_templates'];
  saving: boolean;
  onCreateGroup: (payload: ProcurementGroupCreatePayload) => Promise<void>;
  onUpdateGroup: (groupId: number, payload: ProcurementGroupUpdatePayload) => Promise<void>;
  onReorderGroups: (groupIdsInOrder: number[]) => Promise<void>;
  onDeleteGroup: (groupId: number) => Promise<void>;
}

export default function ConfiguredGroupsSection({
  groups,
  saving,
  onCreateGroup,
  onUpdateGroup,
  onReorderGroups,
  onDeleteGroup,
}: ConfiguredGroupsSectionProps) {
  const { t } = useI18n();
  const [groupDraft, setGroupDraft] = useState({
    key: '',
    name_default: '',
    comment: '',
    is_active: true,
    display_lane: 'PRIMARY' as ProcurementGroupDisplayLane,
  });
  const [groupKeyEdited, setGroupKeyEdited] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [editingGroupDraft, setEditingGroupDraft] = useState({
    key: '',
    name_default: '',
    comment: '',
    is_active: true,
    display_lane: 'PRIMARY' as ProcurementGroupDisplayLane,
    pos: 0,
  });
  const [draggingGroupId, setDraggingGroupId] = useState<number | null>(null);
  const [dragOverGroupId, setDragOverGroupId] = useState<number | null>(null);
  const [dragOverLane, setDragOverLane] = useState<ProcurementGroupDisplayLane | null>(null);
  const [confirmDeleteGroupId, setConfirmDeleteGroupId] = useState<number | null>(null);
  const isInteractiveDragSource = (target: EventTarget | null): boolean => {
    if (!(target instanceof HTMLElement)) return false;
    return Boolean(target.closest('button, input, select, textarea, a, .detail-ci-actions'));
  };
  const applyUppercaseWithCaret = (input: HTMLInputElement, update: (value: string) => void) => {
    const nextValue = input.value.toUpperCase();
    const selectionStart = input.selectionStart;
    const selectionEnd = input.selectionEnd;
    update(nextValue);
    requestAnimationFrame(() => {
      if (document.activeElement !== input) return;
      if (selectionStart == null || selectionEnd == null) return;
      input.setSelectionRange(selectionStart, selectionEnd);
    });
  };

  const primaryGroups = groups.filter((entry) => (entry.display_lane ?? 'PRIMARY') === 'PRIMARY');
  const secondaryGroups = groups.filter((entry) => (entry.display_lane ?? 'PRIMARY') === 'SECONDARY');

  const buildLaneOrderWithDragged = (
    targetLane: ProcurementGroupDisplayLane,
    draggedGroupId: number,
    targetGroupId: number | null,
  ): number[] => {
    const targetLaneIds = groups
      .filter((entry) => (entry.display_lane ?? 'PRIMARY') === targetLane && entry.id !== draggedGroupId)
      .map((entry) => entry.id);
    const otherLane: ProcurementGroupDisplayLane = targetLane === 'PRIMARY' ? 'SECONDARY' : 'PRIMARY';
    const otherLaneIds = groups
      .filter((entry) => (entry.display_lane ?? 'PRIMARY') === otherLane && entry.id !== draggedGroupId)
      .map((entry) => entry.id);
    const insertIndex = targetGroupId == null ? targetLaneIds.length : Math.max(0, targetLaneIds.indexOf(targetGroupId));
    targetLaneIds.splice(insertIndex, 0, draggedGroupId);
    return targetLane === 'PRIMARY'
      ? [...targetLaneIds, ...otherLaneIds]
      : [...otherLaneIds, ...targetLaneIds];
  };

  const handleDrop = async (targetLane: ProcurementGroupDisplayLane, targetGroupId: number | null) => {
    if (draggingGroupId == null) return;
    const draggedGroup = groups.find((entry) => entry.id === draggingGroupId);
    if (!draggedGroup) return;
    const sourceLane = (draggedGroup.display_lane ?? 'PRIMARY') as ProcurementGroupDisplayLane;
    const nextOrder = buildLaneOrderWithDragged(targetLane, draggingGroupId, targetGroupId);
    const currentOrder = groups
      .filter((entry) => entry.id !== draggingGroupId)
      .map((entry) => entry.id);
    currentOrder.splice(
      targetGroupId == null ? currentOrder.length : Math.max(0, currentOrder.indexOf(targetGroupId)),
      0,
      draggingGroupId,
    );
    if (sourceLane !== targetLane) {
      await onUpdateGroup(draggingGroupId, { display_lane: targetLane });
    }
    if (nextOrder.join(',') !== groups.map((entry) => entry.id).join(',')) {
      await onReorderGroups(nextOrder);
    }
    setDraggingGroupId(null);
    setDragOverGroupId(null);
    setDragOverLane(null);
  };

  const renderLaneTable = (lane: ProcurementGroupDisplayLane, laneGroups: ProcurementAdminConfig['field_group_templates']) => (
    <div
      className={`admin-proc-lane-block ${dragOverLane === lane ? 'admin-proc-lane-drop-target' : ''}`}
      onDragOver={(event) => {
        if (draggingGroupId == null || editingGroupId != null) return;
        event.preventDefault();
        setDragOverLane(lane);
      }}
      onDrop={(event) => {
        event.preventDefault();
        if (dragOverGroupId != null) return;
        void handleDrop(lane, null);
      }}
    >
      <div className="detail-section-heading">
        <h3>
          {lane === 'PRIMARY'
            ? t('admin.procurementConfig.groups.primaryLaneTitle', 'Primary lane')
            : t('admin.procurementConfig.groups.secondaryLaneTitle', 'Secondary lane')}
        </h3>
      </div>
      {laneGroups.length === 0 ? (
        <p className="detail-empty">{t('admin.procurementConfig.groups.noGroupsInLane', 'No groups in this lane.')}</p>
      ) : (
        <div className="patients-table-wrap ui-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('patients.filters.name', 'Name')}</th>
                <th>{t('admin.procurementConfig.fields.key', 'Key')}</th>
                <th>{t('taskBoard.columns.comment', 'Comment')}</th>
                <th>{t('admin.taskTemplates.active', 'Active')}</th>
                <th>{t('admin.taskTemplates.position', 'Pos')}</th>
                <th>{t('admin.procurementConfig.groups.laneActions', 'Lane')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {laneGroups.map((group) => (
                editingGroupId === group.id ? (
                  <tr key={group.id} className="ci-editing-row">
                    <td>
                      <input
                        className="detail-input ci-inline-input"
                        value={editingGroupDraft.name_default}
                        onChange={(e) => setEditingGroupDraft((prev) => ({ ...prev, name_default: e.target.value }))}
                      />
                    </td>
                    <td>
                      <input
                        className="detail-input ci-inline-input"
                        value={editingGroupDraft.key}
                        onChange={(e) =>
                          applyUppercaseWithCaret(e.currentTarget, (value) => {
                            setEditingGroupDraft((prev) => ({ ...prev, key: value }));
                          })}
                      />
                    </td>
                    <td>
                      <input
                        className="detail-input ci-inline-input"
                        value={editingGroupDraft.comment}
                        disabled
                        onChange={(e) => setEditingGroupDraft((prev) => ({ ...prev, comment: e.target.value }))}
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={editingGroupDraft.is_active}
                        disabled
                        onChange={(e) => setEditingGroupDraft((prev) => ({ ...prev, is_active: e.target.checked }))}
                      />
                    </td>
                    <td>
                      <input
                        className="detail-input ci-inline-input"
                        type="number"
                        value={editingGroupDraft.pos}
                        onChange={(e) => setEditingGroupDraft((prev) => ({ ...prev, pos: Number(e.target.value) || 0 }))}
                      />
                    </td>
                    <td>
                      <select
                        className="detail-input ci-inline-input"
                        value={editingGroupDraft.display_lane}
                        onChange={(e) =>
                          setEditingGroupDraft((prev) => ({
                            ...prev,
                            display_lane: e.target.value as ProcurementGroupDisplayLane,
                          }))}
                      >
                        <option value="PRIMARY">{t('admin.procurementConfig.groups.primaryLaneShort', 'Primary')}</option>
                        <option value="SECONDARY">{t('admin.procurementConfig.groups.secondaryLaneShort', 'Secondary')}</option>
                      </select>
                    </td>
                    <td className="detail-ci-actions">
                      <button
                        className="ci-save-inline"
                        onClick={() => {
                          void onUpdateGroup(group.id, {
                            key: editingGroupDraft.key.trim().toUpperCase(),
                            name_default: editingGroupDraft.name_default.trim(),
                            comment: editingGroupDraft.comment.trim(),
                            is_active: editingGroupDraft.is_active,
                            pos: editingGroupDraft.pos,
                            display_lane: editingGroupDraft.display_lane,
                          });
                          setEditingGroupId(null);
                        }}
                        disabled={
                          saving
                          || (
                            editingGroupDraft.pos === group.pos
                            && editingGroupDraft.display_lane === (group.display_lane ?? 'PRIMARY')
                            && editingGroupDraft.key.trim().toUpperCase() === group.key
                            && editingGroupDraft.name_default.trim() === group.name_default
                            && editingGroupDraft.comment.trim() === (group.comment ?? '')
                            && editingGroupDraft.is_active === Boolean(group.is_active)
                          )
                        }
                      >
                        ✓
                      </button>
                      <button
                        className="ci-cancel-inline"
                        onClick={() => setEditingGroupId(null)}
                        disabled={saving}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ) : (
                  <tr
                    key={group.id}
                    draggable={!saving && editingGroupId == null}
                    onDragStart={(event) => {
                      if (isInteractiveDragSource(event.target)) {
                        event.preventDefault();
                        return;
                      }
                      setDraggingGroupId(group.id);
                    }}
                    onDragOver={(event) => {
                      if (draggingGroupId == null) return;
                      event.preventDefault();
                      event.stopPropagation();
                      setDragOverGroupId(group.id);
                      setDragOverLane(lane);
                    }}
                    onDragLeave={() => setDragOverGroupId((prev) => (prev === group.id ? null : prev))}
                    onDrop={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      void handleDrop(lane, group.id);
                    }}
                    onDragEnd={() => {
                      setDraggingGroupId(null);
                      setDragOverGroupId(null);
                      setDragOverLane(null);
                    }}
                    className={draggingGroupId === group.id ? 'ci-dragging' : dragOverGroupId === group.id ? 'ci-drag-over' : ''}
                  >
                    <td>{group.name_default}</td>
                    <td><span className="admin-access-permission-key">{group.key}</span></td>
                    <td>{group.comment || t('common.emptySymbol', '–')}</td>
                    <td>{group.is_active ? t('common.yes', 'Yes') : t('common.no', 'No')}</td>
                    <td>{group.pos}</td>
                    <td>
                      <button
                        type="button"
                        className="ci-cancel-inline"
                        disabled={saving}
                        onClick={() => {
                          void onUpdateGroup(group.id, {
                            display_lane: lane === 'PRIMARY' ? 'SECONDARY' : 'PRIMARY',
                          });
                        }}
                      >
                        {lane === 'PRIMARY'
                          ? t('admin.procurementConfig.groups.moveToSecondary', 'Move to secondary')
                          : t('admin.procurementConfig.groups.moveToPrimary', 'Move to primary')}
                      </button>
                    </td>
                    <td
                      className="detail-ci-actions"
                      onMouseDown={(event) => event.stopPropagation()}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <InlineDeleteActions
                        confirming={confirmDeleteGroupId === group.id}
                        deleting={saving}
                        onEdit={() => {
                          setEditingGroupId(group.id);
                          setEditingGroupDraft({
                            key: group.key,
                            name_default: group.name_default,
                            comment: group.comment ?? '',
                            is_active: group.is_active ?? true,
                            display_lane: group.display_lane ?? 'PRIMARY',
                            pos: group.pos,
                          });
                        }}
                        onRequestDelete={() => setConfirmDeleteGroupId(group.id)}
                        onConfirmDelete={() => {
                          const confirmed = window.confirm(
                            t(
                              'admin.procurementConfig.groups.deleteConfirm',
                              'Deleting this group will unassign fields from the group. Do you want to continue?',
                            ),
                          );
                          if (!confirmed) return;
                          void onDeleteGroup(group.id);
                        }}
                        onCancelDelete={() => setConfirmDeleteGroupId(null)}
                      />
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <section className="admin-proc-block">
      <div className="detail-section-heading admin-proc-block-heading">
        <h2>{t('admin.procurementConfig.groups.title', 'Groups')}</h2>
      </div>
      <div className="admin-proc-pane admin-proc-define-pane">
        <h3>{t('admin.procurementConfig.groups.definitionArea', 'Definition Area')}</h3>
        <div className="admin-people-form">
          <label>
            <span>{t('patients.filters.name', 'Name')}</span>
            <input
              className="detail-input"
              value={groupDraft.name_default}
              onChange={(e) => {
                const nextName = e.target.value;
                setGroupDraft((prev) => ({
                  ...prev,
                  name_default: nextName,
                  key: groupKeyEdited ? prev.key : suggestConfigKey(nextName),
                }));
              }}
            />
          </label>
          <label>
            <span>{t('admin.procurementConfig.fields.key', 'Key')}</span>
            <input
              className="detail-input"
              value={groupDraft.key}
              onChange={(e) => {
                setGroupKeyEdited(true);
                applyUppercaseWithCaret(e.currentTarget, (value) => {
                  setGroupDraft((prev) => ({ ...prev, key: value }));
                });
              }}
            />
          </label>
          <label>
            <span>{t('taskBoard.columns.comment', 'Comment')}</span>
            <input
              className="detail-input"
              value={groupDraft.comment}
              onChange={(e) => setGroupDraft((prev) => ({ ...prev, comment: e.target.value }))}
            />
          </label>
          <label>
            <span>{t('admin.procurementConfig.groups.laneActions', 'Lane')}</span>
            <select
              className="detail-input"
              value={groupDraft.display_lane}
              onChange={(e) =>
                setGroupDraft((prev) => ({
                  ...prev,
                  display_lane: e.target.value as ProcurementGroupDisplayLane,
                }))}
            >
              <option value="PRIMARY">{t('admin.procurementConfig.groups.primaryLaneShort', 'Primary')}</option>
              <option value="SECONDARY">{t('admin.procurementConfig.groups.secondaryLaneShort', 'Secondary')}</option>
            </select>
          </label>
          <div className="admin-proc-action-cell">
            <button
              type="button"
              className="patients-save-btn"
              disabled={saving || groupDraft.key.trim().length === 0 || groupDraft.name_default.trim().length === 0}
              onClick={() => {
                const laneGroups = groups.filter((entry) => (entry.display_lane ?? 'PRIMARY') === groupDraft.display_lane);
                const nextPos = laneGroups.length + 1;
                void onCreateGroup({
                  key: groupDraft.key.trim().toUpperCase(),
                  name_default: groupDraft.name_default.trim(),
                  comment: groupDraft.comment.trim(),
                  is_active: true,
                  display_lane: groupDraft.display_lane,
                  pos: nextPos,
                });
                setGroupDraft({ key: '', name_default: '', comment: '', is_active: true, display_lane: 'PRIMARY' });
                setGroupKeyEdited(false);
              }}
            >
              {t('admin.procurementConfig.groups.createGroup', 'Create Group')}
            </button>
          </div>
        </div>
      </div>
      <p className="detail-subtle">
        {t(
          'admin.procurementConfig.groups.laneHint',
          'Primary groups are always shown before secondary groups. Drag and drop works inside a lane and between lanes.',
        )}
      </p>
      {groups.length === 0 ? (
        <p className="detail-empty">{t('admin.procurementConfig.groups.noGroups', 'No groups configured.')}</p>
      ) : (
        <div className="admin-proc-lane-grid">
          {renderLaneTable('PRIMARY', primaryGroups)}
          {renderLaneTable('SECONDARY', secondaryGroups)}
        </div>
      )}
    </section>
  );
}
