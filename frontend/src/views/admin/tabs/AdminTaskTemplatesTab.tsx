import { useEffect, useMemo, useState } from 'react';

import type { Code, TaskGroupTemplate, TaskTemplate } from '../../../api';
import { translateCodeLabel } from '../../../i18n/codeTranslations';
import ErrorBanner from '../../layout/ErrorBanner';
import { combineOffsetMinutes, splitOffsetMinutes } from '../hooks/useAdminTaskTemplates';
import { useI18n } from '../../../i18n/i18n';

interface OffsetParts {
  days: number;
  hours: number;
  minutes: number;
}

interface EditFormState {
  task_group_template_id: number;
  description: string;
  comment_hint: string;
  kind_key: 'TASK' | 'EVENT';
  priority_id: number | null;
  is_active: boolean;
  offset: OffsetParts;
}

interface CreateFormState extends EditFormState {}

interface GroupTemplateCreateFormState {
  key: string;
  name: string;
  description: string;
  organ_id: number | null;
  is_active: boolean;
}

interface GroupTemplateEditFormState {
  key: string;
  name: string;
  description: string;
  organ_id: number | null;
  is_active: boolean;
}

interface AdminTaskTemplatesTabProps {
  templates: TaskTemplate[];
  groupTemplates: TaskGroupTemplate[];
  taskScopeCodes: Code[];
  organCodes: Code[];
  priorityCodes: Code[];
  loading: boolean;
  saving: boolean;
  error: string;
  onCreateGroupTemplate: (payload: {
    key: string;
    name: string;
    description: string;
    scope_id: number;
    organ_id: number | null;
    is_active: boolean;
    sort_pos: number;
  }) => Promise<void>;
  onUpdateGroupTemplate: (
    taskGroupTemplateId: number,
    payload: {
      key: string;
      name: string;
      description: string;
      organ_id: number | null;
      is_active: boolean;
      sort_pos: number;
    },
  ) => Promise<void>;
  onReorderGroupTemplates: (taskGroupTemplateIdsInOrder: number[]) => Promise<void>;
  onCreateTemplate: (payload: {
    task_group_template_id: number;
    description: string;
    comment_hint: string;
    kind_key: 'TASK' | 'EVENT';
    priority_id: number | null;
    offset_minutes_default: number;
    is_active: boolean;
    sort_pos: number;
  }) => Promise<void>;
  onUpdateTemplate: (
    taskTemplateId: number,
    payload: {
      task_group_template_id: number;
      description: string;
      comment_hint: string;
      kind_key: 'TASK' | 'EVENT';
      priority_id: number | null;
      offset_minutes_default: number;
      is_active: boolean;
      sort_pos: number;
    },
  ) => Promise<void>;
  onReorderTemplates: (taskTemplateIdsInOrder: number[]) => Promise<void>;
}

function buildInitialCreateForm(groupTemplates: TaskGroupTemplate[]): CreateFormState {
  return {
    task_group_template_id: groupTemplates[0]?.id ?? 0,
    description: '',
    comment_hint: '',
    kind_key: 'TASK',
    priority_id: null,
    is_active: true,
    offset: { days: 0, hours: 0, minutes: 0 },
  };
}

export default function AdminTaskTemplatesTab({
  templates,
  groupTemplates,
  taskScopeCodes,
  organCodes,
  priorityCodes,
  loading,
  saving,
  error,
  onCreateGroupTemplate,
  onUpdateGroupTemplate,
  onReorderGroupTemplates,
  onCreateTemplate,
  onUpdateTemplate,
  onReorderTemplates,
}: AdminTaskTemplatesTabProps) {
  const { t } = useI18n();
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [createForm, setCreateForm] = useState<CreateFormState>(buildInitialCreateForm(groupTemplates));
  const [editingGroupTemplateId, setEditingGroupTemplateId] = useState<number | null>(null);
  const [editGroupTemplateForm, setEditGroupTemplateForm] = useState<GroupTemplateEditFormState | null>(null);
  const [createGroupTemplateForm, setCreateGroupTemplateForm] = useState<GroupTemplateCreateFormState>({
    key: '',
    name: '',
    description: '',
    organ_id: null,
    is_active: true,
  });
  const [selectedGroupTemplateId, setSelectedGroupTemplateId] = useState<number | null>(null);
  const [draggingGroupTemplateId, setDraggingGroupTemplateId] = useState<number | null>(null);
  const [dragOverGroupTemplateId, setDragOverGroupTemplateId] = useState<number | null>(null);
  const [draggingTemplateId, setDraggingTemplateId] = useState<number | null>(null);
  const [dragOverTemplateId, setDragOverTemplateId] = useState<number | null>(null);

  useEffect(() => {
    if (groupTemplates.length === 0) return;
    setCreateForm((prev) => (
      prev.task_group_template_id
        ? prev
        : { ...prev, task_group_template_id: groupTemplates[0].id }
    ));
  }, [groupTemplates]);
  const sortedTemplates = useMemo(
    () => [...templates].sort((a, b) => (a.sort_pos - b.sort_pos) || (a.id - b.id)),
    [templates],
  );
  const sortedGroupTemplates = useMemo(
    () => [...groupTemplates].sort((a, b) => (a.sort_pos - b.sort_pos) || (a.id - b.id)),
    [groupTemplates],
  );
  const selectedGroupTemplate = useMemo(
    () => sortedGroupTemplates.find((entry) => entry.id === selectedGroupTemplateId) ?? null,
    [selectedGroupTemplateId, sortedGroupTemplates],
  );
  const filteredTemplates = useMemo(
    () => (
      selectedGroupTemplateId
        ? sortedTemplates.filter((entry) => entry.task_group_template_id === selectedGroupTemplateId)
        : []
    ),
    [selectedGroupTemplateId, sortedTemplates],
  );
  const coordinationProtocolScopeId = taskScopeCodes.find((entry) => entry.key === 'COORDINATION_PROTOCOL')?.id ?? null;
  useEffect(() => {
    if (sortedGroupTemplates.length === 0) {
      setSelectedGroupTemplateId(null);
      return;
    }
    if (!selectedGroupTemplateId || !sortedGroupTemplates.some((entry) => entry.id === selectedGroupTemplateId)) {
      setSelectedGroupTemplateId(sortedGroupTemplates[0].id);
    }
  }, [selectedGroupTemplateId, sortedGroupTemplates]);
  useEffect(() => {
    if (!selectedGroupTemplateId) return;
    setCreateForm((prev) => ({ ...prev, task_group_template_id: selectedGroupTemplateId }));
  }, [selectedGroupTemplateId]);

  const startEdit = (template: TaskTemplate) => {
    setEditingTemplateId(template.id);
    setEditForm({
      task_group_template_id: template.task_group_template_id,
      description: template.description,
      comment_hint: template.comment_hint ?? '',
      kind_key: template.kind_key ?? 'TASK',
      priority_id: template.priority_id,
      is_active: template.is_active,
      offset: splitOffsetMinutes(template.offset_minutes_default),
    });
  };

  const saveEdit = async (templateId: number) => {
    if (!editForm) return;
    await onUpdateTemplate(templateId, {
      task_group_template_id: editForm.task_group_template_id,
      description: editForm.description.trim(),
      comment_hint: editForm.comment_hint.trim(),
      kind_key: editForm.kind_key,
      priority_id: editForm.priority_id,
      offset_minutes_default: combineOffsetMinutes(editForm.offset),
      is_active: editForm.is_active,
      sort_pos: templates.find((entry) => entry.id === templateId)?.sort_pos ?? 0,
    });
    setEditingTemplateId(null);
    setEditForm(null);
  };

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

  const saveCreate = async () => {
    if (!createForm.description.trim() || !createForm.task_group_template_id) return;
    const nextSortPos = filteredTemplates.reduce((maxPos, entry) => Math.max(maxPos, entry.sort_pos), 0) + 1;
    await onCreateTemplate({
      task_group_template_id: createForm.task_group_template_id,
      description: createForm.description.trim(),
      comment_hint: createForm.comment_hint.trim(),
      kind_key: createForm.kind_key,
      priority_id: createForm.priority_id,
      offset_minutes_default: combineOffsetMinutes(createForm.offset),
      is_active: createForm.is_active,
      sort_pos: nextSortPos,
    });
    setCreateForm((prev) => ({ ...buildInitialCreateForm(groupTemplates), task_group_template_id: prev.task_group_template_id }));
  };

  const startEditGroupTemplate = (template: TaskGroupTemplate) => {
    setEditingGroupTemplateId(template.id);
    setEditGroupTemplateForm({
      key: template.key,
      name: template.name,
      description: template.description,
      organ_id: template.organ_id,
      is_active: template.is_active,
    });
  };

  const saveCreateGroupTemplate = async () => {
    if (!coordinationProtocolScopeId) return;
    if (!createGroupTemplateForm.key.trim() || !createGroupTemplateForm.name.trim()) return;
    const nextSortPos = sortedGroupTemplates.reduce((maxPos, entry) => Math.max(maxPos, entry.sort_pos), 0) + 1;
    await onCreateGroupTemplate({
      key: createGroupTemplateForm.key.trim(),
      name: createGroupTemplateForm.name.trim(),
      description: createGroupTemplateForm.description.trim(),
      scope_id: coordinationProtocolScopeId,
      organ_id: createGroupTemplateForm.organ_id,
      is_active: createGroupTemplateForm.is_active,
      sort_pos: nextSortPos,
    });
    setCreateGroupTemplateForm({
      key: '',
      name: '',
      description: '',
      organ_id: null,
      is_active: true,
    });
  };

  const saveEditGroupTemplate = async (taskGroupTemplateId: number) => {
    if (!editGroupTemplateForm) return;
    await onUpdateGroupTemplate(taskGroupTemplateId, {
      key: editGroupTemplateForm.key.trim(),
      name: editGroupTemplateForm.name.trim(),
      description: editGroupTemplateForm.description.trim(),
      organ_id: editGroupTemplateForm.organ_id,
      is_active: editGroupTemplateForm.is_active,
      sort_pos: groupTemplates.find((entry) => entry.id === taskGroupTemplateId)?.sort_pos ?? 0,
    });
    setEditingGroupTemplateId(null);
    setEditGroupTemplateForm(null);
  };

  return (
    <section className="detail-section ui-panel-section">
      <div className="detail-section-heading">
        <h2>{t('admin.taskTemplates.title', 'Task Templates')}</h2>
      </div>
      {loading && <p className="status">{t('admin.taskTemplates.loading', 'Loading task templates...')}</p>}
      {error && <ErrorBanner message={error} />}
      {!loading && (
        <>
          <div className="admin-people-card">
            <div className="detail-section-heading">
              <h3>{t('admin.taskTemplates.groupsSection', 'Groups')}</h3>
            </div>
          <div className="admin-task-template-create admin-people-form">
            <label>
              <span>{t('admin.taskTemplates.groupKey', 'Group Key')}</span>
              <input
                className="detail-input"
                value={createGroupTemplateForm.key}
                onChange={(e) => setCreateGroupTemplateForm((prev) => ({ ...prev, key: e.target.value }))}
                placeholder={t('admin.taskTemplates.groupKeyPlaceholder', 'COORD_PROTOCOL_COMMON')}
              />
            </label>
            <label>
              <span>{t('admin.taskTemplates.groupName', 'Group Name')}</span>
              <input
                className="detail-input"
                value={createGroupTemplateForm.name}
                onChange={(e) => setCreateGroupTemplateForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder={t('admin.taskTemplates.groupNamePlaceholder', 'Protocol - Common')}
              />
            </label>
            <label>
              <span>{t('taskBoard.columns.description', 'Description')}</span>
              <input
                className="detail-input"
                value={createGroupTemplateForm.description}
                onChange={(e) => setCreateGroupTemplateForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </label>
            <label>
              <span>{t('taskBoard.filters.organ', 'Organ')}</span>
              <select
                className="detail-input"
                value={createGroupTemplateForm.organ_id ?? ''}
                onChange={(e) => setCreateGroupTemplateForm((prev) => ({ ...prev, organ_id: e.target.value ? Number(e.target.value) : null }))}
              >
                <option value="">{t('admin.taskTemplates.allOrgans', 'All organs')}</option>
                {organCodes.map((organ) => (
                  <option key={organ.id} value={organ.id}>
                    {translateCodeLabel(t, organ)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{t('admin.taskTemplates.active', 'Active')}</span>
              <select
                className="detail-input"
                value={createGroupTemplateForm.is_active ? 'true' : 'false'}
                onChange={(e) => setCreateGroupTemplateForm((prev) => ({ ...prev, is_active: e.target.value === 'true' }))}
              >
                <option value="true">{t('common.yes', 'Yes')}</option>
                <option value="false">{t('common.no', 'No')}</option>
              </select>
            </label>
            <div className="admin-proc-action-cell">
              <button
                className="save-btn"
                disabled={saving || !createGroupTemplateForm.key.trim() || !createGroupTemplateForm.name.trim() || !coordinationProtocolScopeId}
                onClick={() => { void saveCreateGroupTemplate(); }}
              >
                {t('admin.taskTemplates.addGroupTemplate', '+ Add Group Template')}
              </button>
            </div>
          </div>

          <div className="ui-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('admin.taskTemplates.table.key', 'Key')}</th>
                  <th>{t('admin.taskTemplates.table.name', 'Name')}</th>
                  <th>{t('taskBoard.columns.description', 'Description')}</th>
                  <th>{t('taskBoard.filters.organ', 'Organ')}</th>
                  <th>{t('admin.taskTemplates.active', 'Active')}</th>
                  <th>{t('taskBoard.columns.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {sortedGroupTemplates.map((groupTemplate) => {
                  const isEditing = editingGroupTemplateId === groupTemplate.id && editGroupTemplateForm !== null;
                  return (
                    <tr
                      key={groupTemplate.id}
                      draggable={!saving && editingGroupTemplateId == null}
                      onDragStart={() => setDraggingGroupTemplateId(groupTemplate.id)}
                      onDragOver={(event) => {
                        event.preventDefault();
                        setDragOverGroupTemplateId(groupTemplate.id);
                      }}
                      onDragLeave={() => setDragOverGroupTemplateId((prev) => (prev === groupTemplate.id ? null : prev))}
                      onDrop={() => {
                        if (draggingGroupTemplateId == null) return;
                        const orderedIds = sortedGroupTemplates.map((entry) => entry.id);
                        const nextOrder = reorderIds(orderedIds, draggingGroupTemplateId, groupTemplate.id);
                        if (nextOrder.join(',') !== orderedIds.join(',')) {
                          void onReorderGroupTemplates(nextOrder);
                        }
                        setDraggingGroupTemplateId(null);
                        setDragOverGroupTemplateId(null);
                      }}
                      onDragEnd={() => {
                        setDraggingGroupTemplateId(null);
                        setDragOverGroupTemplateId(null);
                      }}
                      className={[
                        selectedGroupTemplateId === groupTemplate.id ? 'admin-task-template-group-row-selected' : '',
                        draggingGroupTemplateId === groupTemplate.id ? 'ci-dragging' : '',
                        dragOverGroupTemplateId === groupTemplate.id ? 'ci-drag-over' : '',
                      ].filter(Boolean).join(' ')}
                      onClick={() => setSelectedGroupTemplateId(groupTemplate.id)}
                    >
                      <td>
                        {isEditing ? (
                          <input
                            className="detail-input"
                            value={editGroupTemplateForm.key}
                            onChange={(e) => setEditGroupTemplateForm((prev) => (prev ? { ...prev, key: e.target.value } : prev))}
                          />
                        ) : groupTemplate.key}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            className="detail-input"
                            value={editGroupTemplateForm.name}
                            onChange={(e) => setEditGroupTemplateForm((prev) => (prev ? { ...prev, name: e.target.value } : prev))}
                          />
                        ) : groupTemplate.name}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            className="detail-input"
                            value={editGroupTemplateForm.description}
                            onChange={(e) => setEditGroupTemplateForm((prev) => (prev ? { ...prev, description: e.target.value } : prev))}
                          />
                        ) : groupTemplate.description}
                      </td>
                      <td>
                        {isEditing ? (
                          <select
                            className="detail-input"
                            value={editGroupTemplateForm.organ_id ?? ''}
                            onChange={(e) => setEditGroupTemplateForm((prev) => (prev ? { ...prev, organ_id: e.target.value ? Number(e.target.value) : null } : prev))}
                          >
                            <option value="">{t('admin.taskTemplates.allOrgans', 'All organs')}</option>
                            {organCodes.map((organ) => (
                              <option key={organ.id} value={organ.id}>
                                {translateCodeLabel(t, organ)}
                              </option>
                            ))}
                          </select>
                        ) : (groupTemplate.organ ? translateCodeLabel(t, groupTemplate.organ) : t('admin.taskTemplates.allOrgans', 'All organs'))}
                      </td>
                      <td>
                        {isEditing ? (
                          <select
                            className="detail-input"
                            value={editGroupTemplateForm.is_active ? 'true' : 'false'}
                            onChange={(e) => setEditGroupTemplateForm((prev) => (prev ? { ...prev, is_active: e.target.value === 'true' } : prev))}
                          >
                            <option value="true">{t('common.yes', 'Yes')}</option>
                            <option value="false">{t('common.no', 'No')}</option>
                          </select>
                        ) : (groupTemplate.is_active ? t('common.yes', 'Yes') : t('common.no', 'No'))}
                      </td>
                      <td className="admin-people-actions-cell">
                        {isEditing ? (
                          <div className="admin-inline-actions">
                            <button
                              className="save-btn"
                              disabled={saving || !editGroupTemplateForm.key.trim() || !editGroupTemplateForm.name.trim()}
                              onClick={() => { void saveEditGroupTemplate(groupTemplate.id); }}
                            >
                              ✓
                            </button>
                            <button
                              className="cancel-btn"
                              disabled={saving}
                              onClick={() => { setEditingGroupTemplateId(null); setEditGroupTemplateForm(null); }}
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button className="edit-btn" disabled={saving} onClick={() => startEditGroupTemplate(groupTemplate)}>
                            ✎
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {sortedGroupTemplates.length === 0 && (
                  <tr>
                    <td colSpan={6}>{t('admin.taskTemplates.emptyGroupTemplates', 'No coordination protocol group templates available.')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          </div>

          <div className="admin-people-card">
            <div className="detail-section-heading">
              <h3>{t('admin.taskTemplates.templatesSection', 'Tasks')}</h3>
            </div>
          <div className="admin-task-template-create admin-people-form">
            <label>
              <span>{t('taskBoard.columns.description', 'Description')}</span>
              <input
                className="detail-input"
                value={createForm.description}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </label>
            <label>
              <span>{t('admin.taskTemplates.commentHint', 'Comment Hint')}</span>
              <input
                className="detail-input"
                value={createForm.comment_hint}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, comment_hint: e.target.value }))}
                placeholder={t('admin.taskTemplates.commentHintPlaceholder', 'e.g. Document who confirmed and at what time')}
              />
            </label>
            <label>
              <span>{t('taskBoard.columns.kind', 'Kind')}</span>
              <select
                className="detail-input"
                value={createForm.kind_key}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, kind_key: e.target.value as 'TASK' | 'EVENT' }))}
              >
                <option value="TASK">{t('taskBoard.kind.task', 'Task')}</option>
                <option value="EVENT">{t('taskBoard.kind.event', 'Event')}</option>
              </select>
            </label>
            <label>
              <span>{t('taskBoard.columns.priority', 'Priority')}</span>
              <select
                className="detail-input"
                value={createForm.priority_id ?? ''}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, priority_id: e.target.value ? Number(e.target.value) : null }))}
              >
                <option value="">{t('admin.taskTemplates.defaultPriority', '(default)')}</option>
                {priorityCodes.map((priority) => (
                  <option key={priority.id} value={priority.id}>{translateCodeLabel(t, priority)}</option>
                ))}
              </select>
            </label>
            <label>
              <span>{t('admin.taskTemplates.offsetDays', 'Offset Days')}</span>
              <input
                className="detail-input"
                type="number"
                value={createForm.offset.days}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, offset: { ...prev.offset, days: Number(e.target.value || 0) } }))}
              />
            </label>
            <label>
              <span>{t('admin.taskTemplates.offsetHours', 'Offset Hours')}</span>
              <input
                className="detail-input"
                type="number"
                value={createForm.offset.hours}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, offset: { ...prev.offset, hours: Number(e.target.value || 0) } }))}
              />
            </label>
            <label>
              <span>{t('admin.taskTemplates.offsetMinutes', 'Offset Minutes')}</span>
              <input
                className="detail-input"
                type="number"
                value={createForm.offset.minutes}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, offset: { ...prev.offset, minutes: Number(e.target.value || 0) } }))}
              />
            </label>
            <div className="admin-proc-action-cell">
              <button
                className="save-btn"
                disabled={saving || !createForm.description.trim() || !selectedGroupTemplate}
                onClick={() => { void saveCreate(); }}
              >
                {t('admin.taskTemplates.addTemplate', '+ Add Template')}
              </button>
            </div>
          </div>

          <div className="ui-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('admin.taskTemplates.table.group', 'Group')}</th>
                  <th>{t('taskBoard.columns.kind', 'Kind')}</th>
                  <th>{t('taskBoard.columns.description', 'Description')}</th>
                  <th>{t('admin.taskTemplates.commentHint', 'Comment Hint')}</th>
                  <th>{t('taskBoard.columns.priority', 'Priority')}</th>
                  <th>{t('admin.taskTemplates.table.days', 'Days')}</th>
                  <th>{t('admin.taskTemplates.table.hours', 'Hours')}</th>
                  <th>{t('admin.taskTemplates.table.minutes', 'Minutes')}</th>
                  <th>{t('admin.taskTemplates.active', 'Active')}</th>
                  <th>{t('taskBoard.columns.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredTemplates.map((template) => {
                  const isEditing = editingTemplateId === template.id && editForm !== null;
                  const offset = splitOffsetMinutes(template.offset_minutes_default);
                  return (
                    <tr
                      key={template.id}
                      draggable={!saving && editingTemplateId == null}
                      onDragStart={() => setDraggingTemplateId(template.id)}
                      onDragOver={(event) => {
                        event.preventDefault();
                        setDragOverTemplateId(template.id);
                      }}
                      onDragLeave={() => setDragOverTemplateId((prev) => (prev === template.id ? null : prev))}
                      onDrop={() => {
                        if (draggingTemplateId == null) return;
                        const orderedIds = filteredTemplates.map((entry) => entry.id);
                        const nextOrder = reorderIds(orderedIds, draggingTemplateId, template.id);
                        if (nextOrder.join(',') !== orderedIds.join(',')) {
                          void onReorderTemplates(nextOrder);
                        }
                        setDraggingTemplateId(null);
                        setDragOverTemplateId(null);
                      }}
                      onDragEnd={() => {
                        setDraggingTemplateId(null);
                        setDragOverTemplateId(null);
                      }}
                      className={draggingTemplateId === template.id ? 'ci-dragging' : dragOverTemplateId === template.id ? 'ci-drag-over' : ''}
                    >
                      <td>
                        {isEditing ? (
                          <select
                            className="detail-input"
                            value={editForm.task_group_template_id}
                            onChange={(e) => setEditForm((prev) => (prev ? { ...prev, task_group_template_id: Number(e.target.value) } : prev))}
                          >
                            {groupTemplates.map((groupTemplate) => (
                              <option key={groupTemplate.id} value={groupTemplate.id}>
                                {groupTemplate.name}
                              </option>
                            ))}
                          </select>
                        ) : (template.task_group_template?.name ?? `#${template.task_group_template_id}`)}
                      </td>
                      <td>
                        {isEditing ? (
                          <select
                            className="detail-input"
                            value={editForm.kind_key}
                            onChange={(e) => setEditForm((prev) => (prev ? { ...prev, kind_key: e.target.value as 'TASK' | 'EVENT' } : prev))}
                          >
                            <option value="TASK">{t('taskBoard.kind.task', 'Task')}</option>
                            <option value="EVENT">{t('taskBoard.kind.event', 'Event')}</option>
                          </select>
                        ) : template.kind_key}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            className="detail-input"
                            value={editForm.description}
                            onChange={(e) => setEditForm((prev) => (prev ? { ...prev, description: e.target.value } : prev))}
                          />
                        ) : template.description}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            className="detail-input"
                            value={editForm.comment_hint}
                            onChange={(e) => setEditForm((prev) => (prev ? { ...prev, comment_hint: e.target.value } : prev))}
                          />
                        ) : (template.comment_hint || t('common.emptySymbol', '–'))}
                      </td>
                      <td>
                        {isEditing ? (
                          <select
                            className="detail-input"
                            value={editForm.priority_id ?? ''}
                            onChange={(e) => setEditForm((prev) => (prev ? { ...prev, priority_id: e.target.value ? Number(e.target.value) : null } : prev))}
                          >
                            <option value="">{t('admin.taskTemplates.defaultPriority', '(default)')}</option>
                            {priorityCodes.map((priority) => (
                              <option key={priority.id} value={priority.id}>{translateCodeLabel(t, priority)}</option>
                            ))}
                          </select>
                        ) : translateCodeLabel(t, template.priority)}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            className="detail-input"
                            type="number"
                            value={editForm.offset.days}
                            onChange={(e) => setEditForm((prev) => (prev ? { ...prev, offset: { ...prev.offset, days: Number(e.target.value || 0) } } : prev))}
                          />
                        ) : offset.days}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            className="detail-input"
                            type="number"
                            value={editForm.offset.hours}
                            onChange={(e) => setEditForm((prev) => (prev ? { ...prev, offset: { ...prev.offset, hours: Number(e.target.value || 0) } } : prev))}
                          />
                        ) : offset.hours}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            className="detail-input"
                            type="number"
                            value={editForm.offset.minutes}
                            onChange={(e) => setEditForm((prev) => (prev ? { ...prev, offset: { ...prev.offset, minutes: Number(e.target.value || 0) } } : prev))}
                          />
                        ) : offset.minutes}
                      </td>
                      <td>
                        {isEditing ? (
                          <select
                            className="detail-input"
                            value={editForm.is_active ? 'true' : 'false'}
                            onChange={(e) => setEditForm((prev) => (prev ? { ...prev, is_active: e.target.value === 'true' } : prev))}
                          >
                            <option value="true">{t('common.yes', 'Yes')}</option>
                            <option value="false">{t('common.no', 'No')}</option>
                          </select>
                        ) : (template.is_active ? t('common.yes', 'Yes') : t('common.no', 'No'))}
                      </td>
                      <td className="admin-people-actions-cell">
                        {isEditing ? (
                          <div className="admin-inline-actions">
                            <button className="save-btn" disabled={saving || !editForm.description.trim()} onClick={() => { void saveEdit(template.id); }}>
                              ✓
                            </button>
                            <button className="cancel-btn" disabled={saving} onClick={() => { setEditingTemplateId(null); setEditForm(null); }}>
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button className="edit-btn" disabled={saving} onClick={() => startEdit(template)}>
                            ✎
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredTemplates.length === 0 && (
                  <tr>
                    <td colSpan={10}>{t('admin.taskTemplates.emptyTemplates', 'No task templates available.')}</td>
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
