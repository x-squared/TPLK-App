import { useEffect, useState } from 'react';
import { api, type AppUser, type Code, type Patient, type PatientUpdate } from '../../../api';
import type { PatientDetailTab } from '../PatientDetailTabs';
import type { PatientFormState } from '../PatientDetailTabs';

export function usePatientCore(patientId: number, initialTab: PatientDetailTab = 'patient') {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<PatientDetailTab>(initialTab);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [languages, setLanguages] = useState<Code[]>([]);
  const [sexCodes, setSexCodes] = useState<Code[]>([]);
  const [coordUsers, setCoordUsers] = useState<AppUser[]>([]);

  const [form, setForm] = useState<PatientFormState>({
    pid: '',
    first_name: '',
    name: '',
    date_of_birth: '',
    date_of_death: '',
    ahv_nr: '',
    lang: '',
    sex_id: null as number | null,
    resp_coord_id: null as number | null,
    translate: false,
  });

  const refreshPatient = () => api.getPatient(patientId).then(setPatient);

  useEffect(() => {
    api.getPatient(patientId)
      .then(setPatient)
      .finally(() => setLoading(false));
    api.listCatalogues('LANGUAGE').then(setLanguages);
    api.listCodes('SEX').then(setSexCodes);
    api.listUsers('KOORD').then(setCoordUsers);
  }, [patientId]);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab, patientId]);

  const startEditing = () => {
    if (!patient) return;
    setForm({
      pid: patient.pid ?? '',
      first_name: patient.first_name ?? '',
      name: patient.name ?? '',
      date_of_birth: patient.date_of_birth ?? '',
      date_of_death: patient.date_of_death ?? '',
      ahv_nr: patient.ahv_nr ?? '',
      lang: patient.lang ?? '',
      sex_id: patient.sex_id ?? null,
      resp_coord_id: patient.resp_coord_id ?? null,
      translate: patient.translate ?? false,
    });
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
  };

  const handleSave = async () => {
    if (!patient) return;
    setSaving(true);
    try {
      const update: PatientUpdate = {
        pid: form.pid,
        first_name: form.first_name,
        name: form.name,
        date_of_birth: form.date_of_birth || null,
        date_of_death: form.date_of_death || null,
        ahv_nr: form.ahv_nr,
        lang: form.lang,
        sex_id: form.sex_id,
        resp_coord_id: form.resp_coord_id,
        translate: form.translate,
      };
      const updated = await api.updatePatient(patient.id, update);
      setPatient(updated);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const setField = (key: keyof PatientFormState, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return {
    patient,
    loading,
    tab,
    setTab,
    editing,
    saving,
    languages,
    sexCodes,
    coordUsers,
    form,
    setForm,
    setField,
    refreshPatient,
    startEditing,
    cancelEditing,
    handleSave,
  };
}
