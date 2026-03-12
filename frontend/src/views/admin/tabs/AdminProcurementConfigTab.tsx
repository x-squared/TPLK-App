import { useMemo } from 'react';

import type { ProcurementAdminConfig, TaskGroupTemplate } from '../../../api';
import { translateCodeLabel } from '../../../i18n/codeTranslations';
import ErrorBanner from '../../layout/ErrorBanner';
import { useI18n } from '../../../i18n/i18n';
import ConfiguredFieldsSection from './procurementConfig/ConfiguredFieldsSection';
import ConfiguredGroupsSection from './procurementConfig/ConfiguredGroupsSection';
import ConfiguredProtocolTaskGroupsSection from './procurementConfig/ConfiguredProtocolTaskGroupsSection';
import type {
  ProcurementFieldUpdatePayload,
  ProcurementGroupCreatePayload,
  ProcurementProtocolTaskGroupSelectionCreatePayload,
  ProcurementGroupUpdatePayload,
  ProcurementScopeCreatePayload,
} from './procurementConfig/types';

interface AdminProcurementConfigTabProps {
  config: ProcurementAdminConfig | null;
  loading: boolean;
  saving: boolean;
  error: string;
  status: string;
  scopesByFieldId: Record<number, ProcurementAdminConfig['field_scope_templates']>;
  onCreateGroup: (payload: ProcurementGroupCreatePayload) => Promise<void>;
  onUpdateGroup: (groupId: number, payload: ProcurementGroupUpdatePayload) => Promise<void>;
  onReorderGroups: (groupIdsInOrder: number[]) => Promise<void>;
  onDeleteGroup: (groupId: number) => Promise<void>;
  onUpdateField: (fieldId: number, payload: ProcurementFieldUpdatePayload) => Promise<void>;
  onReorderFields: (
    assignments: Array<{ field_id: number; group_template_id: number | null; pos: number }>,
  ) => Promise<void>;
  onCreateScope: (payload: ProcurementScopeCreatePayload) => Promise<void>;
  onDeleteScope: (scopeId: number) => Promise<void>;
  coordinationProtocolTaskGroupTemplates: TaskGroupTemplate[];
  onCreateProtocolTaskGroupSelection: (payload: ProcurementProtocolTaskGroupSelectionCreatePayload) => Promise<void>;
  onReorderProtocolTaskGroupSelections: (selectionIdsInOrder: number[]) => Promise<void>;
  onDeleteProtocolTaskGroupSelection: (selectionId: number) => Promise<void>;
}

export default function AdminProcurementConfigTab({
  config,
  loading,
  saving,
  error,
  status,
  scopesByFieldId,
  onCreateGroup,
  onUpdateGroup,
  onReorderGroups,
  onDeleteGroup,
  onUpdateField,
  onReorderFields,
  onCreateScope,
  onDeleteScope,
  coordinationProtocolTaskGroupTemplates,
  onCreateProtocolTaskGroupSelection,
  onReorderProtocolTaskGroupSelections,
  onDeleteProtocolTaskGroupSelection,
}: AdminProcurementConfigTabProps) {
  const { t } = useI18n();
  const groupNameById = useMemo(
    () =>
      new Map(
        (config?.field_group_templates ?? []).map((group) => [group.id, group.name_default] as const),
      ),
    [config?.field_group_templates],
  );
  const datatypeNameById = useMemo(
    () =>
      new Map(
        (config?.datatype_definitions ?? []).map((datatype) => [
          datatype.id,
          translateCodeLabel(t, datatype.code),
        ] as const),
      ),
    [config?.datatype_definitions, t],
  );

  const resolvedGroups = useMemo(() => {
    const explicit = config?.field_group_templates ?? [];
    if (explicit.length > 0) {
      return explicit;
    }
    const fromFields = new Map<number, NonNullable<ProcurementAdminConfig['field_group_templates'][number]>>();
    for (const field of config?.field_templates ?? []) {
      if (field.group_template) {
        fromFields.set(field.group_template.id, field.group_template);
      }
    }
    return [...fromFields.values()].sort((a, b) => a.pos - b.pos || a.id - b.id);
  }, [config?.field_group_templates, config?.field_templates]);
  const sortedFieldTemplates = useMemo(() => {
    const groupPosById = new Map(resolvedGroups.map((group) => [group.id, group.pos] as const));
    return [...(config?.field_templates ?? [])].sort((a, b) => {
      const ga = a.group_template_id != null ? (groupPosById.get(a.group_template_id) ?? 9999) : 9999;
      const gb = b.group_template_id != null ? (groupPosById.get(b.group_template_id) ?? 9999) : 9999;
      return ga - gb || a.pos - b.pos || a.id - b.id;
    });
  }, [config?.field_templates, resolvedGroups]);

  return (
    <section className="detail-section ui-panel-section admin-protocol-config-tab">
      {loading && <p className="status">{t('admin.procurement.loading', 'Loading procurement configuration...')}</p>}
      {error && <ErrorBanner message={error} />}
      {status && <p className="status">{status}</p>}
      {!loading && config && (
        <div className="admin-tab-content-guard">
          <ConfiguredGroupsSection
            groups={resolvedGroups}
            saving={saving}
            onCreateGroup={onCreateGroup}
            onUpdateGroup={onUpdateGroup}
            onReorderGroups={onReorderGroups}
            onDeleteGroup={onDeleteGroup}
          />

          <ConfiguredFieldsSection
            config={config}
            groups={resolvedGroups}
            sortedFieldTemplates={sortedFieldTemplates}
            groupNameById={groupNameById}
            datatypeNameById={datatypeNameById}
            scopesByFieldId={scopesByFieldId}
            saving={saving}
            onUpdateField={onUpdateField}
            onReorderFields={onReorderFields}
            onCreateScope={onCreateScope}
            onDeleteScope={onDeleteScope}
          />

          <ConfiguredProtocolTaskGroupsSection
            config={config}
            sortedTaskGroupTemplates={coordinationProtocolTaskGroupTemplates}
            saving={saving}
            onCreateSelection={onCreateProtocolTaskGroupSelection}
            onReorderSelections={onReorderProtocolTaskGroupSelections}
            onDeleteSelection={onDeleteProtocolTaskGroupSelection}
          />
        </div>
      )}
    </section>
  );
}
