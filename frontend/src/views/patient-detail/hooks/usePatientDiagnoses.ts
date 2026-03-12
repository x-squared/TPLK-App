import { useEffect, useState } from 'react';
import { api, type Code, type DiagnosisCreate, type DiagnosisUpdate, type Patient } from '../../../api';

export function usePatientDiagnoses(patientId: number, patient: Patient | null, refreshPatient: () => Promise<void>) {
  const [diagCodes, setDiagCodes] = useState<Code[]>([]);
  const [addingDiag, setAddingDiag] = useState(false);
  const [diagSaving, setDiagSaving] = useState(false);
  const [diagForm, setDiagForm] = useState<DiagnosisCreate>({ catalogue_id: 0, comment: '', is_main: false });
  const [confirmDeleteDiagId, setConfirmDeleteDiagId] = useState<number | null>(null);
  const [editingDiagId, setEditingDiagId] = useState<number | null>(null);
  const [diagEditForm, setDiagEditForm] = useState<DiagnosisUpdate>({});

  useEffect(() => {
    api.listCatalogues('DIAGNOSIS').then((codes) => {
      setDiagCodes(codes);
      if (codes.length > 0) {
        setDiagForm((f) => ({
          ...f,
          catalogue_id: codes[0].id,
          is_main: patient?.diagnoses?.length ? f.is_main ?? false : true,
        }));
      }
    });
  }, [patient?.diagnoses?.length, patientId]);

  const handleAddDiag = async () => {
    if (!patient || !diagForm.catalogue_id) return;
    setDiagSaving(true);
    try {
      await api.createDiagnosis(patient.id, diagForm);
      await refreshPatient();
      setDiagForm({ catalogue_id: diagCodes[0]?.id ?? 0, comment: '', is_main: false });
      setAddingDiag(false);
    } finally {
      setDiagSaving(false);
    }
  };

  const handleDeleteDiag = async (id: number) => {
    if (!patient) return;
    await api.deleteDiagnosis(patient.id, id);
    setConfirmDeleteDiagId(null);
    await refreshPatient();
  };

  const startEditingDiag = (d: { id: number; catalogue_id: number; comment: string; is_main: boolean }) => {
    setEditingDiagId(d.id);
    setDiagEditForm({ catalogue_id: d.catalogue_id, comment: d.comment, is_main: d.is_main });
    setConfirmDeleteDiagId(null);
  };

  const cancelEditingDiag = () => {
    setEditingDiagId(null);
  };

  const handleSaveDiag = async () => {
    if (!patient || editingDiagId === null) return;
    setDiagSaving(true);
    try {
      await api.updateDiagnosis(patient.id, editingDiagId, diagEditForm);
      setEditingDiagId(null);
      await refreshPatient();
    } finally {
      setDiagSaving(false);
    }
  };

  return {
    diagCodes,
    addingDiag,
    setAddingDiag,
    diagSaving,
    diagForm,
    setDiagForm,
    confirmDeleteDiagId,
    setConfirmDeleteDiagId,
    editingDiagId,
    diagEditForm,
    setDiagEditForm,
    handleAddDiag,
    handleDeleteDiag,
    startEditingDiag,
    cancelEditingDiag,
    handleSaveDiag,
  };
}
