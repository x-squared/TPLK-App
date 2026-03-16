import type { InterfacePatientData } from '../../api';
import { useI18n } from '../../i18n/i18n';
import type { ImportStage } from './usePatientImportFlow';

interface Props {
  open: boolean;
  pid: string;
  setPid: (value: string) => void;
  stage: ImportStage;
  operationId: string | null;
  error: string;
  warning: string;
  importedPatientData: InterfacePatientData | null;
  onStart: () => void;
  onInterrupt: () => void;
  onConfirmCreate: () => void;
  onClose: () => void;
}

export default function PatientsImportDialog({
  open,
  pid,
  setPid,
  stage,
  operationId,
  error,
  warning,
  importedPatientData,
  onStart,
  onInterrupt,
  onConfirmCreate,
  onClose,
}: Props) {
  const { t } = useI18n();

  if (!open) return null;

  return (
    <section className="patients-import-dialog" role="dialog" aria-modal="true">
      <header className="patients-import-header">
        <h2>{t('patients.import.title', 'Import Patient')}</h2>
      </header>
      <div className="patients-import-row">
        <label htmlFor="patients-import-pid">{t('patients.import.pid', 'PID')}</label>
        <input
          id="patients-import-pid"
          type="text"
          value={pid}
          onChange={(event) => setPid(event.target.value)}
          disabled={stage === 'running' || stage === 'creating'}
          placeholder={t('patients.import.pidPlaceholder', 'Enter PID')}
        />
        <button
          className="patients-save-btn"
          onClick={onStart}
          disabled={!pid.trim() || stage === 'running' || stage === 'creating'}
        >
          {stage === 'running'
            ? t('patients.import.running', 'Running...')
            : t('patients.import.start', 'Start import')}
        </button>
        <button
          className="patients-cancel-btn"
          onClick={onInterrupt}
          disabled={stage !== 'running'}
          title={operationId ?? undefined}
        >
          {t('patients.import.interrupt', 'Interrupt')}
        </button>
      </div>

      {stage === 'running' && (
        <p className="status">
          {t('patients.import.runningStatus', 'Patient import is running...')}
        </p>
      )}
      {warning ? <p className="status">{warning}</p> : null}
      {error ? <p className="status">{error}</p> : null}

      {importedPatientData && (
        <div className="patients-import-preview">
          <h3>{t('patients.import.returnData', 'Returned patient data')}</h3>
          <div className="patients-import-grid">
            <span>{t('patients.import.fields.pid', 'PID')}</span>
            <strong>{importedPatientData.id || '–'}</strong>
            <span>{t('patients.import.fields.firstName', 'First name')}</span>
            <strong>{importedPatientData.name || '–'}</strong>
            <span>{t('patients.import.fields.lastName', 'Name')}</span>
            <strong>{importedPatientData.surname || '–'}</strong>
            <span>{t('patients.import.fields.birthdate', 'Birth date')}</span>
            <strong>{importedPatientData.birthdate || '–'}</strong>
            <span>{t('patients.import.fields.ahv', 'AHV number')}</span>
            <strong>{importedPatientData.ahvNumber || '–'}</strong>
          </div>
          <details>
            <summary>{t('patients.import.rawPayload', 'Show raw payload')}</summary>
            <pre>{JSON.stringify(importedPatientData, null, 2)}</pre>
          </details>
        </div>
      )}

      <div className="patients-import-actions">
        <button
          className="patients-save-btn"
          onClick={onConfirmCreate}
          disabled={!importedPatientData || stage === 'creating' || stage === 'running'}
        >
          {stage === 'creating'
            ? t('coordinations.form.saving', 'Saving...')
            : t('patients.import.createFromData', 'Create patient from data')}
        </button>
        <button
          className="patients-cancel-btn"
          onClick={onClose}
          disabled={stage === 'creating'}
        >
          {t('actions.cancel', 'Cancel')}
        </button>
      </div>
    </section>
  );
}
