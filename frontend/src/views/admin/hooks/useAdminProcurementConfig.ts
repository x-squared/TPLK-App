import { useEffect, useMemo, useState } from 'react';

import {
  api,
  type ProcurementAdminConfig,
  type ProcurementGroupDisplayLane,
  type ProcurementSlotKey,
  type TaskGroupTemplate,
  type ProcurementValueMode,
} from '../../../api';
import { toUserErrorMessage } from '../../../api/error';
import { withPreservedMainContentScroll } from '../../layout/scrollPreservation';

export function useAdminProcurementConfig() {
  const [config, setConfig] = useState<ProcurementAdminConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [coordinationProtocolTaskGroupTemplates, setCoordinationProtocolTaskGroupTemplates] = useState<TaskGroupTemplate[]>([]);

  const load = async (options?: { withLoading?: boolean }) => {
    const withLoading = options?.withLoading ?? (config == null);
    if (withLoading) {
      setLoading(true);
    }
    setError('');
    try {
      const [configResult, taskTemplatesResult] = await Promise.allSettled([
        api.getProcurementAdminConfig(),
        api.listTaskGroupTemplates(),
      ]);
      if (configResult.status !== 'fulfilled') {
        throw configResult.reason;
      }
      const protocolTaskGroupTemplates = taskTemplatesResult.status === 'fulfilled'
        ? taskTemplatesResult.value
          .filter((entry) => entry.scope?.key === 'COORDINATION_PROTOCOL')
          .sort((a, b) => (a.sort_pos - b.sort_pos) || (a.id - b.id))
        : [];
      setConfig(configResult.value);
      setCoordinationProtocolTaskGroupTemplates(protocolTaskGroupTemplates);
    } catch (err) {
      setError(toUserErrorMessage(err, 'Could not load procurement data configuration.'));
    } finally {
      if (withLoading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    void load({ withLoading: true });
  }, []);

  const createGroup = async (payload: { key: string; name_default: string; comment: string; is_active?: boolean; display_lane?: ProcurementGroupDisplayLane; pos: number }) => {
    setSaving(true);
    setStatus('');
    setError('');
    try {
      await withPreservedMainContentScroll(async () => {
        await api.createProcurementFieldGroupTemplate(payload);
        await load();
      });
    } catch (err) {
      setError(toUserErrorMessage(err, 'Could not create data group.'));
    } finally {
      setSaving(false);
    }
  };

  const updateGroup = async (
    groupId: number,
    payload: {
      key?: string;
      name_default?: string;
      comment?: string;
      is_active?: boolean;
      pos?: number;
      display_lane?: ProcurementGroupDisplayLane;
    },
  ) => {
    setSaving(true);
    setError('');
    setStatus('');
    try {
      await withPreservedMainContentScroll(async () => {
        await api.updateProcurementFieldGroupTemplate(groupId, payload);
        await load();
      });
    } catch (err) {
      setError(toUserErrorMessage(err, 'Could not update data group.'));
    } finally {
      setSaving(false);
    }
  };

  const reorderGroups = async (groupIdsInOrder: number[]) => {
    setSaving(true);
    setError('');
    setStatus('');
    try {
      await withPreservedMainContentScroll(async () => {
        for (const [index, groupId] of groupIdsInOrder.entries()) {
          await api.updateProcurementFieldGroupTemplate(groupId, { pos: index + 1 });
        }
        await load();
      });
    } catch (err) {
      setError(toUserErrorMessage(err, 'Could not reorder groups.'));
    } finally {
      setSaving(false);
    }
  };

  const deleteGroup = async (groupId: number) => {
    setSaving(true);
    setError('');
    setStatus('');
    try {
      await withPreservedMainContentScroll(async () => {
        await api.deleteProcurementFieldGroupTemplate(groupId);
        await load();
      });
    } catch (err) {
      setError(toUserErrorMessage(err, 'Could not delete data group.'));
    } finally {
      setSaving(false);
    }
  };

  const createField = async (payload: {
    key: string;
    name_default: string;
    comment: string;
    is_active?: boolean;
    pos: number;
    datatype_def_id: number;
    group_template_id?: number | null;
    value_mode: ProcurementValueMode;
  }) => {
    void payload;
    setStatus('');
    setError('');
  };

  const reorderFields = async (
    assignments: Array<{ field_id: number; group_template_id: number | null; pos: number }>,
  ) => {
    if (assignments.length === 0) {
      return;
    }
    setSaving(true);
    setError('');
    setStatus('');
    try {
      await withPreservedMainContentScroll(async () => {
        await Promise.all(
          assignments.map((entry) =>
            api.updateProcurementFieldTemplate(entry.field_id, {
              group_template_id: entry.group_template_id,
              pos: entry.pos,
            }),
          ),
        );
        await load();
      });
    } catch (err) {
      setError(toUserErrorMessage(err, 'Could not reorder fields.'));
    } finally {
      setSaving(false);
    }
  };

  const updateField = async (
    fieldId: number,
    payload: { group_template_id?: number | null; pos?: number },
  ) => {
    setSaving(true);
    setError('');
    setStatus('');
    try {
      await withPreservedMainContentScroll(async () => {
        await api.updateProcurementFieldTemplate(fieldId, payload);
        setStatus('Field updated.');
        await load();
      });
    } catch (err) {
      setError(toUserErrorMessage(err, 'Could not update field.'));
    } finally {
      setSaving(false);
    }
  };

  const createScope = async (payload: {
    field_template_id: number;
    organ_id?: number | null;
    slot_key: ProcurementSlotKey;
  }) => {
    setSaving(true);
    setError('');
    setStatus('');
    try {
      await withPreservedMainContentScroll(async () => {
        await api.createProcurementFieldScopeTemplate(payload);
        setStatus('Scope added.');
        await load();
      });
    } catch (err) {
      setError(toUserErrorMessage(err, 'Could not add scope.'));
    } finally {
      setSaving(false);
    }
  };

  const deleteScope = async (scopeId: number) => {
    setSaving(true);
    setError('');
    setStatus('');
    try {
      await withPreservedMainContentScroll(async () => {
        await api.deleteProcurementFieldScopeTemplate(scopeId);
        setStatus('Scope removed.');
        await load();
      });
    } catch (err) {
      setError(toUserErrorMessage(err, 'Could not remove scope.'));
    } finally {
      setSaving(false);
    }
  };

  const createProtocolTaskGroupSelection = async (payload: {
    task_group_template_id: number;
    organ_id?: number | null;
    pos: number;
  }) => {
    setSaving(true);
    setError('');
    setStatus('');
    try {
      await withPreservedMainContentScroll(async () => {
        await api.createProcurementProtocolTaskGroupSelection(payload);
        await load();
      });
    } catch (err) {
      setError(toUserErrorMessage(err, 'Could not add protocol task-group selection.'));
    } finally {
      setSaving(false);
    }
  };

  const updateProtocolTaskGroupSelection = async (
    selectionId: number,
    payload: { organ_id?: number | null; pos?: number },
  ) => {
    setSaving(true);
    setError('');
    setStatus('');
    try {
      await withPreservedMainContentScroll(async () => {
        await api.updateProcurementProtocolTaskGroupSelection(selectionId, payload);
        await load();
      });
    } catch (err) {
      setError(toUserErrorMessage(err, 'Could not update protocol task-group selection.'));
    } finally {
      setSaving(false);
    }
  };

  const reorderProtocolTaskGroupSelections = async (selectionIdsInOrder: number[]) => {
    if (selectionIdsInOrder.length === 0) return;
    setSaving(true);
    setError('');
    setStatus('');
    try {
      await withPreservedMainContentScroll(async () => {
        await Promise.all(
          selectionIdsInOrder.map((selectionId, index) =>
            api.updateProcurementProtocolTaskGroupSelection(selectionId, { pos: index + 1 }),
          ),
        );
        await load();
      });
    } catch (err) {
      setError(toUserErrorMessage(err, 'Could not reorder protocol task-group selections.'));
    } finally {
      setSaving(false);
    }
  };

  const deleteProtocolTaskGroupSelection = async (selectionId: number) => {
    setSaving(true);
    setError('');
    setStatus('');
    try {
      await withPreservedMainContentScroll(async () => {
        await api.deleteProcurementProtocolTaskGroupSelection(selectionId);
        await load();
      });
    } catch (err) {
      setError(toUserErrorMessage(err, 'Could not remove protocol task-group selection.'));
    } finally {
      setSaving(false);
    }
  };

  const scopesByFieldId = useMemo(() => {
    const out: Record<number, ProcurementAdminConfig['field_scope_templates']> = {};
    for (const scope of config?.field_scope_templates ?? []) {
      out[scope.field_template_id] = [...(out[scope.field_template_id] ?? []), scope];
    }
    return out;
  }, [config?.field_scope_templates]);

  return {
    config,
    loading,
    saving,
    error,
    status,
    coordinationProtocolTaskGroupTemplates,
    scopesByFieldId,
    createGroup,
    updateGroup,
    reorderGroups,
    deleteGroup,
    createField,
    updateField,
    reorderFields,
    createScope,
    deleteScope,
    createProtocolTaskGroupSelection,
    updateProtocolTaskGroupSelection,
    reorderProtocolTaskGroupSelections,
    deleteProtocolTaskGroupSelection,
    refresh: load,
  };
}
