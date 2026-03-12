import { createElement, useEffect, useMemo, useState } from 'react';
import {
  api,
  type Code,
  type DatatypeDefinition,
  type MedicalValue,
  type MedicalValueCreate,
  type MedicalValueGroup,
  type MedicalValueTemplate,
  type MedicalValueUpdate,
  type Patient,
} from '../../../api';
import {
  formatValue,
  getCatalogueType,
  getConfigFromMetadata,
  getDatatypeValueSetSource,
  isCatalogueDatatype,
  validateValue,
} from '../../../utils/datatypeFramework';

export function usePatientMedicalValues(
  patientId: number,
  patient: Patient | null,
  refreshPatient: () => Promise<void>,
) {
  const [mvTemplates, setMvTemplates] = useState<MedicalValueTemplate[]>([]);
  const [medicalValueGroups, setMedicalValueGroups] = useState<MedicalValueGroup[]>([]);
  const [datatypeCodes, setDatatypeCodes] = useState<Code[]>([]);
  const [addingMv, setAddingMv] = useState(false);
  const [mvAddMode, setMvAddMode] = useState<'template' | 'custom'>('template');
  const [mvSaving, setMvSaving] = useState(false);
  const [mvForm, setMvForm] = useState<MedicalValueCreate>({
    medical_value_template_id: null,
    name: '',
    value: '',
    renew_date: '',
  });
  const [confirmDeleteMvId, setConfirmDeleteMvId] = useState<number | null>(null);
  const [editingMvId, setEditingMvId] = useState<number | null>(null);
  const [mvEditForm, setMvEditForm] = useState<MedicalValueUpdate>({});
  const [catalogueCache, setCatalogueCache] = useState<Record<string, Code[]>>({});
  const [mvSortKey, setMvSortKey] = useState<'pos' | 'name' | 'renew_date'>('pos');
  const [mvSortAsc, setMvSortAsc] = useState(true);
  const [mvDragId, setMvDragId] = useState<number | null>(null);
  const [mvDragOverId, setMvDragOverId] = useState<number | null>(null);
  const [editingGroupRenewId, setEditingGroupRenewId] = useState<number | null>(null);
  const [groupRenewDraft, setGroupRenewDraft] = useState('');

  useEffect(() => {
    api.listMedicalValueTemplates().then((templates) => {
      setMvTemplates(templates);
      if (templates.length > 0) {
        setMvForm((f) => ({
          ...f,
          medical_value_template_id: templates[0].id,
          name: templates[0].name_default,
        }));
      }
    });
    api.listMedicalValueGroups().then(setMedicalValueGroups);
    api.listCodes('DATATYPE').then((codes) => {
      setDatatypeCodes(codes);
      codes.filter(isCatalogueDatatype).forEach((dt) => {
        const catType = getCatalogueType(dt);
        const source = getDatatypeValueSetSource(dt);
        if (catType && source === 'CATALOGUE') {
          api.listCatalogues(catType).then((entries) => setCatalogueCache((prev) => ({ ...prev, [catType]: entries })));
        }
        if (catType && source === 'CODE') {
          api.listCodes(catType).then((entries) => setCatalogueCache((prev) => ({ ...prev, [catType]: entries })));
        }
      });
    });
  }, [patientId]);

  const userCapturedGroupId = useMemo(
    () => medicalValueGroups.find((group) => group.key === 'USER_CAPTURED')?.id ?? null,
    [medicalValueGroups],
  );

  const resolveMvGroup = (mv: MedicalValue): MedicalValueGroup | null => {
    const byInstanceId = mv.medical_value_group?.medical_value_group_template?.id ?? null;
    if (byInstanceId != null) {
      return medicalValueGroups.find((group) => group.id === byInstanceId) ?? mv.medical_value_group?.medical_value_group_template ?? null;
    }
    const byValueId = mv.medical_value_group_id ?? mv.medical_value_group_template?.id ?? null;
    if (byValueId != null) {
      return medicalValueGroups.find((group) => group.id === byValueId) ?? mv.medical_value_group_template ?? null;
    }
    const templateGroupId = mv.medical_value_template?.medical_value_group_id ?? mv.medical_value_template?.medical_value_group_template?.id ?? null;
    if (templateGroupId != null) {
      return medicalValueGroups.find((group) => group.id === templateGroupId) ?? mv.medical_value_template?.medical_value_group_template ?? null;
    }
    return medicalValueGroups.find((group) => group.key === 'UNGROUPED') ?? null;
  };

  const resetMvForm = () => {
    if (mvAddMode === 'template') {
      const first = mvTemplates[0];
      const firstDt = resolveDatatypeMetadata(first?.id ?? null, first?.datatype_id ?? null);
      setMvForm({
        medical_value_template_id: first?.id ?? null,
        medical_value_group_id: first?.medical_value_group_id ?? null,
        name: first?.name_default ?? '',
        value: '',
        value_input: '',
        unit_input_ucum: firstDt?.canonical_unit_ucum ?? firstDt?.unit ?? null,
        renew_date: '',
      });
    } else {
      setMvForm({
        medical_value_template_id: null,
        datatype_id: datatypeCodes[0]?.id ?? null,
        medical_value_group_id: userCapturedGroupId,
        name: '',
        value: '',
        value_input: '',
        unit_input_ucum: null,
        renew_date: '',
      });
    }
  };

  const handleAddAllMv = async () => {
    if (!patient) return;
    setMvSaving(true);
    try {
      await api.instantiateMedicalValues(patient.id, false);
      await refreshPatient();
    } finally {
      setMvSaving(false);
    }
  };

  const handleAddMv = async () => {
    if (!patient) return;
    if (mvAddMode === 'template' && !mvForm.medical_value_template_id) return;
    if (mvAddMode === 'custom' && (!mvForm.datatype_id || !mvForm.name?.trim())) return;
    setMvSaving(true);
    try {
      if (mvAddMode === 'template') {
        const tpl = mvTemplates.find((t) => t.id === mvForm.medical_value_template_id);
        await api.createMedicalValue(patient.id, {
          medical_value_template_id: mvForm.medical_value_template_id,
          datatype_id: tpl?.datatype_id ?? null,
          medical_value_group_id: tpl?.medical_value_group_id ?? mvForm.medical_value_group_id ?? null,
          name: tpl?.name_default ?? '',
          pos: tpl?.pos ?? 0,
          value: mvForm.value,
          value_input: mvForm.value_input ?? mvForm.value ?? '',
          unit_input_ucum: mvForm.unit_input_ucum ?? null,
          renew_date: mvForm.renew_date || null,
        });
      } else {
        await api.createMedicalValue(patient.id, {
          medical_value_template_id: null,
          datatype_id: mvForm.datatype_id,
          medical_value_group_id: mvForm.medical_value_group_id ?? userCapturedGroupId,
          name: mvForm.name,
          value: mvForm.value,
          value_input: mvForm.value_input ?? mvForm.value ?? '',
          unit_input_ucum: mvForm.unit_input_ucum ?? null,
          renew_date: mvForm.renew_date || null,
        });
      }
      await refreshPatient();
      resetMvForm();
      setAddingMv(false);
    } finally {
      setMvSaving(false);
    }
  };

  const handleDeleteMv = async (id: number) => {
    if (!patient) return;
    await api.deleteMedicalValue(patient.id, id);
    setConfirmDeleteMvId(null);
    await refreshPatient();
  };

  const startEditingMv = (mv: {
    id: number;
    medical_value_template_id: number | null;
    medical_value_group_id?: number | null;
    name: string;
    value: string;
      value_input?: string | null;
      unit_input_ucum?: string | null;
    renew_date: string | null;
  }) => {
    setEditingMvId(mv.id);
    setMvEditForm({
      medical_value_template_id: mv.medical_value_template_id,
      medical_value_group_id: mv.medical_value_group_id ?? null,
      name: mv.name,
      value: mv.value,
      value_input: mv.value_input ?? mv.value ?? '',
      unit_input_ucum: mv.unit_input_ucum ?? null,
      renew_date: mv.renew_date,
    });
    setConfirmDeleteMvId(null);
  };

  const cancelEditingMv = () => {
    setEditingMvId(null);
  };

  const handleSaveMv = async () => {
    if (!patient || editingMvId === null) return;
    setMvSaving(true);
    try {
      const tpl = mvTemplates.find((t) => t.id === mvEditForm.medical_value_template_id);
      await api.updateMedicalValue(patient.id, editingMvId, {
        ...mvEditForm,
        value_input: mvEditForm.value_input ?? mvEditForm.value ?? undefined,
        unit_input_ucum: mvEditForm.unit_input_ucum ?? null,
        datatype_id: tpl?.datatype_id ?? undefined,
        medical_value_group_id: tpl?.medical_value_group_id ?? mvEditForm.medical_value_group_id ?? userCapturedGroupId,
      });
      setEditingMvId(null);
      await refreshPatient();
    } finally {
      setMvSaving(false);
    }
  };

  const resolveDt = (templateId?: number | null, datatypeId?: number | null): Code | null => {
    if (templateId) {
      const tpl = mvTemplates.find((t) => t.id === templateId);
      if (tpl?.datatype) return tpl.datatype;
      if (tpl) return datatypeCodes.find((c) => c.id === tpl.datatype_id) ?? null;
    }
    if (datatypeId) return datatypeCodes.find((c) => c.id === datatypeId) ?? null;
    return null;
  };

  const resolveDatatypeMetadata = (templateId?: number | null, datatypeId?: number | null): DatatypeDefinition | null => {
    if (templateId) {
      const tpl = mvTemplates.find((t) => t.id === templateId);
      if (tpl?.datatype_definition) return tpl.datatype_definition;
      if (tpl?.datatype_def_id) return null;
    }
    if (datatypeId) {
      const tpl = mvTemplates.find((entry) => entry.datatype_id === datatypeId && entry.datatype_definition);
      if (tpl?.datatype_definition) return tpl.datatype_definition;
    }
    return null;
  };

  const renderValueInput = (
    value: string,
    dt: Code | null,
    onChange: (v: string) => void,
    className: string,
    unitValue?: string | null,
    onUnitChange?: (unit: string | null) => void,
  ) => {
    const cfg = getConfigFromMetadata(dt, resolveDatatypeMetadata(undefined, dt?.id ?? null));
    const unitSelect = cfg.inputType === 'number' && onUnitChange && cfg.allowedUnitsUcum && cfg.allowedUnitsUcum.length > 0
      ? createElement(
          'select',
          {
            className,
            value: unitValue ?? cfg.canonicalUnitUcum ?? cfg.allowedUnitsUcum[0] ?? '',
            onChange: (e: Event) => onUnitChange((e.target as HTMLSelectElement).value || null),
          },
          ...cfg.allowedUnitsUcum.map((unit) => createElement('option', { key: unit, value: unit }, unit)),
        )
      : null;

    if (cfg.inputType === 'catalogue') {
      const catType = getCatalogueType(dt);
      const entries = catalogueCache[catType] ?? [];
      const input = createElement(
        'select',
        { className, value, onChange: (e: Event) => onChange((e.target as HTMLSelectElement).value) },
        createElement('option', { value: '' }, '-'),
        ...entries.map((c) => createElement('option', { key: c.id, value: c.key }, c.name_default)),
      );
      return unitSelect ? createElement('div', { className: 'mv-input-with-unit' }, input, unitSelect) : input;
    }
    if (cfg.inputType === 'boolean') {
      const input = createElement(
        'select',
        { className, value, onChange: (e: Event) => onChange((e.target as HTMLSelectElement).value) },
        createElement('option', { value: '' }, '-'),
        createElement('option', { value: 'true' }, 'Yes'),
        createElement('option', { value: 'false' }, 'No'),
      );
      return unitSelect ? createElement('div', { className: 'mv-input-with-unit' }, input, unitSelect) : input;
    }
    const input = createElement('input', {
      className,
      type: cfg.inputType === 'number'
        ? 'number'
        : cfg.inputType === 'date'
          ? 'date'
          : cfg.inputType === 'datetime'
            ? 'datetime-local'
            : 'text',
      step: cfg.step,
      placeholder: cfg.placeholder,
      value,
      onChange: (e: Event) => onChange((e.target as HTMLInputElement).value),
    });
    return unitSelect ? createElement('div', { className: 'mv-input-with-unit' }, input, unitSelect) : input;
  };

  const toggleMvSort = (key: 'pos' | 'name' | 'renew_date') => {
    if (mvSortKey === key) {
      setMvSortAsc((prev) => !prev);
    } else {
      setMvSortKey(key);
      setMvSortAsc(true);
    }
  };

  const mvSortIndicator = (key: 'pos' | 'name' | 'renew_date') =>
    mvSortKey === key ? (mvSortAsc ? ' ▲' : ' ▼') : '';

  const sortedMedicalValues = patient?.medical_values
    ? [...patient.medical_values].sort((a, b) => {
      let cmp = 0;
      if (mvSortKey === 'pos') {
        cmp = (a.pos ?? 0) - (b.pos ?? 0);
      } else if (mvSortKey === 'name') {
        cmp = (a.name || '').localeCompare(b.name || '');
      } else if (mvSortKey === 'renew_date') {
        const aHas = a.renew_date ? 0 : 1;
        const bHas = b.renew_date ? 0 : 1;
        if (aHas !== bHas) {
          cmp = aHas - bHas;
          return mvSortAsc ? cmp : -cmp;
        }
        cmp = (a.renew_date ?? '').localeCompare(b.renew_date ?? '');
      }
      return mvSortAsc ? cmp : -cmp;
    })
    : [];

  const groupedMedicalValues = useMemo(() => {
    const byId = new Map<number, { group: MedicalValueGroup; values: MedicalValue[] }>();
    for (const group of medicalValueGroups) {
      byId.set(group.id, { group, values: [] });
    }
    const fallback = medicalValueGroups.find((group) => group.key === 'UNGROUPED') ?? null;
    for (const mv of sortedMedicalValues) {
      const group = resolveMvGroup(mv) ?? fallback;
      if (!group) continue;
      if (!byId.has(group.id)) byId.set(group.id, { group, values: [] });
      byId.get(group.id)?.values.push(mv);
    }
    return [...byId.values()]
      .map((entry) => ({
        ...entry,
        values: [...entry.values].sort((a, b) => {
          const aMain = a.medical_value_template?.is_main ? 1 : 0;
          const bMain = b.medical_value_template?.is_main ? 1 : 0;
          if (aMain !== bMain) return bMain - aMain;
          return 0;
        }),
      }))
      .filter((entry) => entry.values.length > 0 || entry.group.key === 'USER_CAPTURED')
      .sort((a, b) => (a.group.pos ?? 0) - (b.group.pos ?? 0) || a.group.name_default.localeCompare(b.group.name_default));
  }, [medicalValueGroups, sortedMedicalValues]);

  const startEditingGroupRenew = (group: MedicalValueGroup) => {
    setEditingGroupRenewId(group.id);
    setGroupRenewDraft(group.renew_date ?? '');
  };

  const cancelEditingGroupRenew = () => {
    setEditingGroupRenewId(null);
    setGroupRenewDraft('');
  };

  const saveGroupRenewDate = async (groupId: number) => {
    setMvSaving(true);
    try {
      await api.updateMedicalValueGroup(groupId, { renew_date: groupRenewDraft || null });
      const refreshed = await api.listMedicalValueGroups();
      setMedicalValueGroups(refreshed);
      cancelEditingGroupRenew();
    } finally {
      setMvSaving(false);
    }
  };

  const handleMvDrop = async (targetId: number) => {
    if (!patient || mvDragId === null || mvDragId === targetId) {
      setMvDragId(null);
      setMvDragOverId(null);
      return;
    }
    const ordered = [...sortedMedicalValues];
    const fromIdx = ordered.findIndex((mv) => mv.id === mvDragId);
    const toIdx = ordered.findIndex((mv) => mv.id === targetId);
    const fromItem = ordered[fromIdx];
    const targetItem = ordered[toIdx];
    const fromGroupId = resolveMvGroup(fromItem)?.id ?? null;
    const targetGroupId = resolveMvGroup(targetItem)?.id ?? null;
    if (fromGroupId !== targetGroupId) {
      setMvDragId(null);
      setMvDragOverId(null);
      return;
    }
    if (fromIdx === -1 || toIdx === -1) {
      setMvDragId(null);
      setMvDragOverId(null);
      return;
    }
    const [moved] = ordered.splice(fromIdx, 1);
    ordered.splice(toIdx, 0, moved);
    setMvDragId(null);
    setMvDragOverId(null);
    setMvSaving(true);
    try {
      for (let i = 0; i < ordered.length; i++) {
        const newPos = i + 1;
        if (ordered[i].pos !== newPos) {
          await api.updateMedicalValue(patient.id, ordered[i].id, { pos: newPos });
        }
      }
      await refreshPatient();
      setMvSortKey('pos');
      setMvSortAsc(true);
    } finally {
      setMvSaving(false);
    }
  };

  return {
    mvTemplates,
    datatypeCodes,
    addingMv,
    setAddingMv,
    mvAddMode,
    setMvAddMode,
    mvSaving,
    mvForm,
    setMvForm,
    confirmDeleteMvId,
    setConfirmDeleteMvId,
    editingMvId,
    mvEditForm,
    setMvEditForm,
    catalogueCache,
    mvSortKey,
    mvSortAsc,
    mvDragId,
    mvDragOverId,
    setMvDragId,
    setMvDragOverId,
    sortedMedicalValues,
    groupedMedicalValues,
    medicalValueGroups,
    editingGroupRenewId,
    groupRenewDraft,
    setGroupRenewDraft,
    handleAddAllMv,
    handleAddMv,
    handleDeleteMv,
    startEditingMv,
    cancelEditingMv,
    handleSaveMv,
    resolveDt,
    resolveDatatypeMetadata,
    renderValueInput,
    toggleMvSort,
    mvSortIndicator,
    handleMvDrop,
    startEditingGroupRenew,
    cancelEditingGroupRenew,
    saveGroupRenewDate,
    validateValue,
    formatValue,
    getCatalogueType,
  };
}
