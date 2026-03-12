import { useEffect, useState } from 'react';
import { api, type Code, type Patient, type PatientCreate, type PatientListItem } from '../../api';
import { toUserErrorMessage } from '../../api/error';
import { formatDate, matchesFilter, matchesWildcardFlexible } from './patientsViewUtils';

export function usePatientsViewModel() {
  const [patients, setPatients] = useState<PatientListItem[]>([]);
  const [patientDetails, setPatientDetails] = useState<Record<number, Patient>>({});
  const [loadingDetails, setLoadingDetails] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);

  const [filterPid, setFilterPid] = useState('');
  const [filterFirstName, setFilterFirstName] = useState('');
  const [filterName, setFilterName] = useState('');
  const [filterDob, setFilterDob] = useState('');
  const [filterAny, setFilterAny] = useState('');
  const [filterOrgan, setFilterOrgan] = useState('');
  const [filterOpenOnly, setFilterOpenOnly] = useState(false);
  const [organCodes, setOrganCodes] = useState<Code[]>([]);

  const [expandedContacts, setExpandedContacts] = useState<number | null>(null);
  const [expandedEpisodes, setExpandedEpisodes] = useState<number | null>(null);
  const [expandedMedical, setExpandedMedical] = useState<number | null>(null);
  const [addingPatient, setAddingPatient] = useState(false);
  const [creatingPatient, setCreatingPatient] = useState(false);
  const [createPatientError, setCreatePatientError] = useState('');
  const [selectedTaskPatientId, setSelectedTaskPatientId] = useState<number | null>(null);
  const [newPatient, setNewPatient] = useState<PatientCreate>({
    pid: '',
    first_name: '',
    name: '',
    date_of_birth: '',
  });

  const fetchPatients = async () => {
    try {
      const data = await api.listPatients();
      setPatients(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchPatients();
    api.listCodes('ORGAN').then(setOrganCodes);
  }, []);

  const ensurePatientDetails = async (id: number) => {
    if (patientDetails[id] || loadingDetails[id]) return;
    setLoadingDetails((prev) => ({ ...prev, [id]: true }));
    try {
      const detail = await api.getPatient(id);
      setPatientDetails((prev) => ({ ...prev, [id]: detail }));
    } finally {
      setLoadingDetails((prev) => ({ ...prev, [id]: false }));
    }
  };

  const toggleContacts = (id: number) => {
    setExpandedContacts(expandedContacts === id ? null : id);
    setExpandedEpisodes(null);
    setExpandedMedical(null);
    if (expandedContacts !== id) {
      void ensurePatientDetails(id);
    }
  };

  const toggleEpisodes = (id: number) => {
    setExpandedEpisodes(expandedEpisodes === id ? null : id);
    setExpandedContacts(null);
    setExpandedMedical(null);
    if (expandedEpisodes !== id) {
      void ensurePatientDetails(id);
    }
  };

  const toggleMedical = (id: number) => {
    setExpandedMedical(expandedMedical === id ? null : id);
    setExpandedContacts(null);
    setExpandedEpisodes(null);
    if (expandedMedical !== id) {
      void ensurePatientDetails(id);
    }
  };

  const handleCreatePatient = async () => {
    if (!newPatient.pid?.trim() || !newPatient.first_name?.trim() || !newPatient.name?.trim() || !newPatient.date_of_birth) return;
    setCreatingPatient(true);
    setCreatePatientError('');
    try {
      await api.createPatient({
        pid: newPatient.pid.trim(),
        first_name: newPatient.first_name.trim(),
        name: newPatient.name.trim(),
        date_of_birth: newPatient.date_of_birth,
      });
      await fetchPatients();
      setNewPatient({ pid: '', first_name: '', name: '', date_of_birth: '' });
      setAddingPatient(false);
    } catch (err) {
      setCreatePatientError(toUserErrorMessage(err, 'Could not create patient.'));
    } finally {
      setCreatingPatient(false);
    }
  };

  const filteredPatients = patients.filter((p) => {
    if (filterAny.trim()) {
      const detail = patientDetails[p.id];
      const blob = detail
        ? JSON.stringify({ patient: p, details: detail })
        : JSON.stringify(p);
      if (!matchesWildcardFlexible(blob, filterAny)) {
        if (!detail || loadingDetails[p.id]) return true;
        return false;
      }
    }
    if (!matchesFilter(p.pid, filterPid)) return false;
    if (!matchesFilter(p.first_name, filterFirstName)) return false;
    if (!matchesFilter(p.name, filterName)) return false;
    if (filterDob) {
      const formatted = formatDate(p.date_of_birth);
      if (!matchesFilter(formatted, filterDob)) return false;
    }
    if (filterOrgan || filterOpenOnly) {
      const organId = filterOrgan ? Number(filterOrgan) : null;
      if (filterOpenOnly && organId !== null) {
        if (!p.open_episode_organ_ids.includes(organId)) return false;
      } else if (filterOpenOnly) {
        if (p.open_episode_count === 0) return false;
      } else if (organId !== null) {
        if (!p.episode_organ_ids.includes(organId)) return false;
      }
    }
    return true;
  });

  useEffect(() => {
    if (!filterAny.trim() || patients.length === 0) return;
    const missingIds = patients
      .map((p) => p.id)
      .filter((id) => !patientDetails[id] && !loadingDetails[id]);
    if (missingIds.length === 0) return;
    missingIds.forEach((id) => {
      void ensurePatientDetails(id);
    });
  }, [filterAny, patients, patientDetails, loadingDetails]);

  return {
    patients,
    patientDetails,
    loadingDetails,
    loading,
    filterPid,
    setFilterPid,
    filterFirstName,
    setFilterFirstName,
    filterName,
    setFilterName,
    filterDob,
    setFilterDob,
    filterAny,
    setFilterAny,
    filterOrgan,
    setFilterOrgan,
    filterOpenOnly,
    setFilterOpenOnly,
    organCodes,
    expandedContacts,
    expandedEpisodes,
    expandedMedical,
    addingPatient,
    setAddingPatient,
    creatingPatient,
    createPatientError,
    setCreatePatientError,
    selectedTaskPatientId,
    setSelectedTaskPatientId,
    newPatient,
    setNewPatient,
    ensurePatientDetails,
    toggleContacts,
    toggleEpisodes,
    toggleMedical,
    handleCreatePatient,
    filteredPatients,
  };
}
