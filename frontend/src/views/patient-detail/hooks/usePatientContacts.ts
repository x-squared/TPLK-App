import { useEffect, useState } from 'react';
import { api, type Code, type ContactInfoCreate, type ContactInfoUpdate, type Patient } from '../../../api';

function normalizeCodeType(value: string | null | undefined): string {
  return (value ?? '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

function resolveContactUseCodes(explicitUseCodes: Code[], allCodes: Code[]): Code[] {
  if (explicitUseCodes.length > 0) return explicitUseCodes;
  return allCodes.filter((code) => {
    const normalized = normalizeCodeType(code.type);
    return normalized === 'CONTACTUSE' || normalized === 'CONTACTUSAGE';
  });
}

export function usePatientContacts(patientId: number, patient: Patient | null, refreshPatient: () => Promise<void>) {
  const [contactTypes, setContactTypes] = useState<Code[]>([]);
  const [contactUseTypes, setContactUseTypes] = useState<Code[]>([]);
  const [addingContact, setAddingContact] = useState(false);
  const [ciSaving, setCiSaving] = useState(false);
  const [ciForm, setCiForm] = useState<ContactInfoCreate>({
    type_id: 0,
    use_id: null,
    data: '',
    comment: '',
    main: false,
  });
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [editingCiId, setEditingCiId] = useState<number | null>(null);
  const [ciEditForm, setCiEditForm] = useState<ContactInfoUpdate>({});
  const [ciDragId, setCiDragId] = useState<number | null>(null);
  const [ciDragOverId, setCiDragOverId] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([api.listCodes('CONTACT'), api.listCodes('CONTACT_USE'), api.listCodes()]).then(
      ([typeCodes, useCodes, allCodes]) => {
        const resolvedTypeCodes =
          typeCodes.length > 0
            ? typeCodes
            : allCodes.filter((code) => normalizeCodeType(code.type) === 'CONTACT');
        const resolvedUseCodes = resolveContactUseCodes(useCodes, allCodes);
        setContactTypes(resolvedTypeCodes);
        setContactUseTypes(resolvedUseCodes);
        if (resolvedTypeCodes.length > 0) {
          setCiForm((f) => ({ ...f, type_id: resolvedTypeCodes[0].id }));
        }
      },
    );
  }, [patientId]);

  const sortedContactInfos = patient?.contact_infos
    ? [...patient.contact_infos].sort((a, b) => (a.pos ?? 0) - (b.pos ?? 0))
    : [];

  const handleAddContact = async () => {
    if (!patient || !ciForm.type_id || !ciForm.data.trim()) return;
    setCiSaving(true);
    try {
      await api.createContactInfo(patient.id, ciForm);
      await refreshPatient();
      setCiForm({
        type_id: contactTypes[0]?.id ?? 0,
        use_id: null,
        data: '',
        comment: '',
        main: false,
      });
      setAddingContact(false);
    } finally {
      setCiSaving(false);
    }
  };

  const handleDeleteContact = async (contactId: number) => {
    if (!patient) return;
    await api.deleteContactInfo(patient.id, contactId);
    setConfirmDeleteId(null);
    await refreshPatient();
  };

  const startEditingCi = (ci: { id: number; type_id: number; use_id: number | null; data: string; comment: string; main: boolean }) => {
    setEditingCiId(ci.id);
    setCiEditForm({ type_id: ci.type_id, use_id: ci.use_id, data: ci.data, comment: ci.comment, main: ci.main });
    setConfirmDeleteId(null);
  };

  const cancelEditingCi = () => {
    setEditingCiId(null);
  };

  const handleSaveCi = async () => {
    if (!patient || editingCiId === null) return;
    setCiSaving(true);
    try {
      await api.updateContactInfo(patient.id, editingCiId, ciEditForm);
      setEditingCiId(null);
      await refreshPatient();
    } finally {
      setCiSaving(false);
    }
  };

  const handleCiDrop = async (targetId: number) => {
    if (!patient || ciDragId === null || ciDragId === targetId) {
      setCiDragId(null);
      setCiDragOverId(null);
      return;
    }
    const ordered = [...sortedContactInfos];
    const fromIdx = ordered.findIndex((ci) => ci.id === ciDragId);
    const toIdx = ordered.findIndex((ci) => ci.id === targetId);
    if (fromIdx === -1 || toIdx === -1) {
      setCiDragId(null);
      setCiDragOverId(null);
      return;
    }
    const [moved] = ordered.splice(fromIdx, 1);
    ordered.splice(toIdx, 0, moved);
    setCiDragId(null);
    setCiDragOverId(null);
    setCiSaving(true);
    try {
      for (let i = 0; i < ordered.length; i++) {
        const newPos = i + 1;
        if (ordered[i].pos !== newPos) {
          await api.updateContactInfo(patient.id, ordered[i].id, { pos: newPos });
        }
      }
      await refreshPatient();
    } finally {
      setCiSaving(false);
    }
  };

  return {
    contactTypes,
    contactUseTypes,
    addingContact,
    setAddingContact,
    ciSaving,
    ciForm,
    setCiForm,
    confirmDeleteId,
    setConfirmDeleteId,
    editingCiId,
    ciEditForm,
    setCiEditForm,
    ciDragId,
    ciDragOverId,
    setCiDragId,
    setCiDragOverId,
    sortedContactInfos,
    handleAddContact,
    handleDeleteContact,
    startEditingCi,
    cancelEditingCi,
    handleSaveCi,
    handleCiDrop,
  };
}
