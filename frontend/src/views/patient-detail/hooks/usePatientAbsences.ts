import { useState } from 'react';
import { api, type AbsenceCreate, type AbsenceUpdate, type Patient } from '../../../api';

export function usePatientAbsences(patient: Patient | null, refreshPatient: () => Promise<void>) {
  const [addingAbsence, setAddingAbsence] = useState(false);
  const [abSaving, setAbSaving] = useState(false);
  const [abForm, setAbForm] = useState<AbsenceCreate>({ start: '', end: '', comment: '' });
  const [confirmDeleteAbId, setConfirmDeleteAbId] = useState<number | null>(null);
  const [editingAbId, setEditingAbId] = useState<number | null>(null);
  const [abEditForm, setAbEditForm] = useState<AbsenceUpdate>({});

  const sortedAbsences = patient?.absences
    ? [...patient.absences].sort((a, b) => b.end.localeCompare(a.end))
    : [];

  const handleAddAbsence = async () => {
    if (!patient || !abForm.start || !abForm.end) return;
    setAbSaving(true);
    try {
      await api.createAbsence(patient.id, abForm);
      await refreshPatient();
      setAbForm({ start: '', end: '', comment: '' });
      setAddingAbsence(false);
    } finally {
      setAbSaving(false);
    }
  };

  const handleDeleteAbsence = async (id: number) => {
    if (!patient) return;
    await api.deleteAbsence(patient.id, id);
    setConfirmDeleteAbId(null);
    await refreshPatient();
  };

  const startEditingAb = (ab: { id: number; start: string; end: string; comment: string }) => {
    setEditingAbId(ab.id);
    setAbEditForm({ start: ab.start, end: ab.end, comment: ab.comment });
    setConfirmDeleteAbId(null);
  };

  const cancelEditingAb = () => {
    setEditingAbId(null);
  };

  const handleSaveAb = async () => {
    if (!patient || editingAbId === null) return;
    setAbSaving(true);
    try {
      await api.updateAbsence(patient.id, editingAbId, abEditForm);
      setEditingAbId(null);
      await refreshPatient();
    } finally {
      setAbSaving(false);
    }
  };

  return {
    addingAbsence,
    setAddingAbsence,
    abSaving,
    abForm,
    setAbForm,
    confirmDeleteAbId,
    setConfirmDeleteAbId,
    editingAbId,
    abEditForm,
    setAbEditForm,
    sortedAbsences,
    handleAddAbsence,
    handleDeleteAbsence,
    startEditingAb,
    cancelEditingAb,
    handleSaveAb,
  };
}
