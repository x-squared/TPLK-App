import { useRef, useState } from 'react';
import {
  api,
  type InterfacePatientData,
  type InterfacePendingOperation,
  type PatientCreate,
  type PatientListItem,
} from '../../api';
import { toUserErrorMessage } from '../../api/error';
import { runPollingStateMachine } from '@appstack/pollingStateMachine';

export type ImportStage = 'idle' | 'running' | 'ready' | 'creating';

interface UsePatientImportFlowArgs {
  patients: PatientListItem[];
  refreshPatients: () => Promise<PatientListItem[]>;
}

function isPendingInterfaceOperation(
  response: InterfacePatientData | InterfacePendingOperation,
): response is InterfacePendingOperation {
  return (response as InterfacePendingOperation).status === 'pending';
}

function normalizeBirthDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  const year = String(parsed.getUTCFullYear()).padStart(4, '0');
  const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
  const day = String(parsed.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function usePatientImportFlow({ patients, refreshPatients }: UsePatientImportFlowArgs) {
  const [open, setOpen] = useState(false);
  const [pid, setPid] = useState('');
  const [stage, setStage] = useState<ImportStage>('idle');
  const [operationId, setOperationId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [importedPatientData, setImportedPatientData] = useState<InterfacePatientData | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const doesPidExist = (candidatePid: string, list: PatientListItem[] = patients): boolean => {
    const normalized = candidatePid.trim().toLowerCase();
    return list.some((entry) => entry.pid.trim().toLowerCase() === normalized);
  };

  const reset = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setStage('idle');
    setOperationId(null);
    setError('');
    setWarning('');
    setImportedPatientData(null);
  };

  const close = () => {
    reset();
    setOpen(false);
    setPid('');
  };

  const runImport = async () => {
    const normalizedPid = pid.trim();
    if (!normalizedPid) {
      setError('PID is required.');
      return;
    }
    setError('');
    setWarning('');
    setImportedPatientData(null);
    let latestPatients: PatientListItem[];
    try {
      latestPatients = await refreshPatients();
    } catch (err) {
      setError(toUserErrorMessage(err, 'Could not validate existing PID.'));
      return;
    }
    if (doesPidExist(normalizedPid, latestPatients)) {
      setWarning('A patient with this PID already exists.');
      return;
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setStage('running');
    try {
      const importedData = await runPollingStateMachine<InterfacePatientData>({
        signal: controller.signal,
        requestStep: async (signal) => {
          const response = await api.getInterfacePatient(normalizedPid, signal);
          if (isPendingInterfaceOperation(response)) {
            return {
              kind: 'pending',
              operationId: response.operation_id,
              retryAfterMs: Math.max(1, response.retry_after_seconds || 3) * 1000,
            };
          }
          return { kind: 'ready', data: response };
        },
        onPending: (step) => {
          setOperationId(step.operationId ?? null);
        },
        defaultRetryMs: 3000,
      });
      setOperationId(null);
      setImportedPatientData(importedData);
      setStage('ready');
      abortControllerRef.current = null;
    } catch (err) {
      abortControllerRef.current = null;
      const message = err instanceof Error && err.name === 'AbortError'
        ? 'Import interrupted.'
        : toUserErrorMessage(err, 'Could not import patient.');
      setError(message);
      setStage('idle');
    }
  };

  const interruptImport = async () => {
    const opId = operationId;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    if (opId) {
      try {
        await api.cancelInterfaceOperation(opId);
      } catch {
        // best-effort cancellation
      }
    }
    setStage('idle');
    setOperationId(null);
    setWarning('');
    setError('Import interrupted.');
  };

  const confirmCreate = async () => {
    if (!importedPatientData) return;
    const resolvedPid = importedPatientData.id?.trim() || pid.trim();
    if (!resolvedPid) {
      setError('Imported patient has no PID.');
      return;
    }
    let latestPatients: PatientListItem[];
    try {
      latestPatients = await refreshPatients();
    } catch (err) {
      setError(toUserErrorMessage(err, 'Could not validate existing PID.'));
      return;
    }
    if (doesPidExist(resolvedPid, latestPatients)) {
      setWarning('A patient with this PID already exists.');
      return;
    }
    const mappedPayload: PatientCreate = {
      pid: resolvedPid,
      first_name: (importedPatientData.name ?? '').trim(),
      name: (importedPatientData.surname ?? '').trim(),
      date_of_birth: normalizeBirthDate(importedPatientData.birthdate),
      ahv_nr: (importedPatientData.ahvNumber ?? '').trim() || undefined,
    };
    if (!mappedPayload.first_name || !mappedPayload.name) {
      setError('Imported patient data is incomplete (first name or surname missing).');
      return;
    }
    setStage('creating');
    setError('');
    setWarning('');
    try {
      await api.createPatient(mappedPayload);
      await refreshPatients();
      close();
    } catch (err) {
      setError(toUserErrorMessage(err, 'Could not create patient from imported data.'));
      setStage('ready');
    }
  };

  return {
    open,
    setOpen,
    pid,
    setPid,
    stage,
    operationId,
    error,
    warning,
    importedPatientData,
    close,
    runImport,
    interruptImport,
    confirmCreate,
  };
}
