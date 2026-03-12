import type {
  CoordinationProcurementFlex,
  CoordinationProcurementValue,
  ProcurementSlotKey,
} from '../../../../api';

export type DraftsByField = Record<number, string>;

export function resolveValueForField(
  flex: CoordinationProcurementFlex,
  organId: number,
  fieldTemplateId: number,
): CoordinationProcurementValue | null {
  const organ = flex.organs.find((entry) => entry.organ_id === organId);
  if (!organ) return null;
  for (const slot of organ.slots) {
    const found = slot.values.find((value) => value.field_template_id === fieldTemplateId);
    if (found) return found;
  }
  return null;
}

export function resolveValueForFieldInSlot(
  flex: CoordinationProcurementFlex | null,
  organId: number,
  slotKey: ProcurementSlotKey,
  fieldTemplateId: number,
): CoordinationProcurementValue | null {
  if (!flex) return null;
  const organ = flex.organs.find((entry) => entry.organ_id === organId);
  if (!organ) return null;
  const slot = organ.slots.find((entry) => entry.slot_key === slotKey);
  if (!slot) return null;
  return slot.values.find((value) => value.field_template_id === fieldTemplateId) ?? null;
}

export function getFieldStateClass(
  field: CoordinationProcurementFlex['field_templates'][number],
  valueRow: CoordinationProcurementValue | null,
  drafts: DraftsByField,
  forceCommitted: boolean,
): 'pending' | 'committed' | 'editing' {
  if (forceCommitted) {
    return 'committed';
  }
  if (field.value_mode === 'PERSON_SINGLE' || field.value_mode === 'PERSON_LIST') {
    return (valueRow?.persons?.length ?? 0) > 0 ? 'committed' : 'pending';
  }
  if (field.value_mode === 'TEAM_SINGLE' || field.value_mode === 'TEAM_LIST') {
    return (valueRow?.teams?.length ?? 0) > 0 ? 'committed' : 'pending';
  }
  if (field.value_mode === 'EPISODE') {
    return valueRow?.episode_ref?.episode_id ? 'committed' : 'pending';
  }
  const draftValue = drafts[field.id] ?? valueRow?.value ?? '';
  const committed = (valueRow?.value ?? '').trim().length > 0;
  return committed ? 'committed' : draftValue.trim().length === 0 ? 'pending' : 'editing';
}

export function isGroupTouched(
  fields: CoordinationProcurementFlex['field_templates'],
  flex: CoordinationProcurementFlex | null,
  organId: number,
  drafts: DraftsByField,
  forceCommitted: boolean,
): boolean {
  if (forceCommitted) {
    return true;
  }
  if (!flex) return false;
  return fields.every((field) => {
    const valueRow = resolveValueForField(flex, organId, field.id);
    if (field.value_mode === 'PERSON_SINGLE') {
      return (valueRow?.persons?.length ?? 0) > 0;
    }
    if (field.value_mode === 'PERSON_LIST') {
      return (valueRow?.persons?.length ?? 0) > 0;
    }
    if (field.value_mode === 'TEAM_LIST') {
      return (valueRow?.teams?.length ?? 0) > 0;
    }
    if (field.value_mode === 'TEAM_SINGLE') {
      return (valueRow?.teams?.length ?? 0) > 0;
    }
    if (field.value_mode === 'EPISODE') {
      return !!valueRow?.episode_ref?.episode_id;
    }
    const draftValue = drafts[field.id] ?? valueRow?.value ?? '';
    return draftValue.trim().length > 0;
  });
}
