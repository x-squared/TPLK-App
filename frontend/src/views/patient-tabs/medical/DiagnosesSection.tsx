import { useMemo } from 'react';
import type { Patient } from '../../../api';
import { useI18n } from '../../../i18n/i18n';
import type { PatientDiagnosesModel } from '../../patient-detail/PatientDetailTabs';
import InlineDeleteActions from '../../layout/InlineDeleteActions';

type DiagnosesSectionProps = {
  patient: Patient;
  formatDate: (iso: string | null) => string;
} & PatientDiagnosesModel;

export default function DiagnosesSection({
  patient,
  addingDiag,
  setAddingDiag,
  diagCodes,
  diagForm,
  setDiagForm,
  diagSaving,
  handleAddDiag,
  editingDiagId,
  diagEditForm,
  setDiagEditForm,
  handleSaveDiag,
  cancelEditingDiag,
  startEditingDiag,
  confirmDeleteDiagId,
  setConfirmDeleteDiagId,
  handleDeleteDiag,
  formatDate,
}: DiagnosesSectionProps) {
  const { t } = useI18n();
  const hasDiagnoses = Boolean(patient.diagnoses && patient.diagnoses.length > 0);
  const sortedDiagnoses = useMemo(() => {
    return [...(patient.diagnoses ?? [])].sort((a, b) => {
      if ((a.is_main ?? false) !== (b.is_main ?? false)) {
        return (a.is_main ?? false) ? -1 : 1;
      }
      const aLabel = a.catalogue?.name_default ?? a.catalogue?.key ?? '';
      const bLabel = b.catalogue?.name_default ?? b.catalogue?.key ?? '';
      const byLabel = aLabel.localeCompare(bLabel, undefined, { sensitivity: 'base' });
      if (byLabel !== 0) return byLabel;
      return a.id - b.id;
    });
  }, [patient.diagnoses]);

  return (
    <section className="detail-section" style={{ marginTop: '1.5rem' }}>
      <div className="detail-section-heading">
        <h2>{t('patient.diagnoses.title', 'Diagnoses')}</h2>
        {!addingDiag && (
          <button className="ci-add-btn" onClick={() => setAddingDiag(true)}>{t('information.actions.add', '+ Add')}</button>
        )}
      </div>
      {hasDiagnoses ? (
        <table className="detail-contact-table diagnosis-table">
          <thead>
            <tr>
              <th>{t('patients.contact.main', 'Main')}</th>
              <th>{t('coordinations.donorData.diagnosis', 'Diagnosis')}</th>
              <th>{t('taskBoard.columns.comment', 'Comment')}</th>
              <th>{t('colloquiums.table.date', 'Date')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sortedDiagnoses.map((d) => (
              editingDiagId === d.id ? (
                <tr key={d.id} className="ci-editing-row">
                  <td className="diag-main">
                    <label className="detail-checkbox">
                      <input
                        type="checkbox"
                        checked={diagEditForm.is_main ?? false}
                        onChange={(e) => setDiagEditForm((f) => ({ ...f, is_main: e.target.checked }))}
                      />
                    </label>
                  </td>
                  <td className="diag-code">
                    <select
                      className="detail-input ci-inline-input"
                      value={diagEditForm.catalogue_id}
                      onChange={(e) => setDiagEditForm((f) => ({ ...f, catalogue_id: Number(e.target.value) }))}
                    >
                      {diagCodes.map((c) => (
                        <option key={c.id} value={c.id}>{c.key} – {c.name_default}</option>
                      ))}
                    </select>
                  </td>
                  <td className="diag-comment">
                    <input
                      className="detail-input ci-inline-input"
                      value={diagEditForm.comment ?? ''}
                      onChange={(e) => setDiagEditForm((f) => ({ ...f, comment: e.target.value }))}
                    />
                  </td>
                  <td className="diag-date">{formatDate(d.updated_at ?? d.created_at)}</td>
                  <td className="detail-ci-actions">
                    <button className="ci-save-inline" onClick={handleSaveDiag} disabled={diagSaving}>✓</button>
                    <button className="ci-cancel-inline" onClick={cancelEditingDiag} disabled={diagSaving}>✕</button>
                  </td>
                </tr>
              ) : (
                <tr
                  key={d.id}
                  onDoubleClick={() =>
                    startEditingDiag({ id: d.id, catalogue_id: d.catalogue_id, comment: d.comment ?? '', is_main: d.is_main ?? false })
                  }
                >
                  <td className="diag-main">
                    {d.is_main && <span className="diag-main-badge">{t('patients.contact.main', 'Main')}</span>}
                  </td>
                  <td className="diag-code">{d.catalogue ? `${d.catalogue.key} – ${d.catalogue.name_default}` : t('common.emptySymbol', '–')}</td>
                  <td className="diag-comment">{d.comment || ''}</td>
                  <td className="diag-date">{formatDate(d.updated_at ?? d.created_at)}</td>
                  <td className="detail-ci-actions">
                    <InlineDeleteActions
                      confirming={confirmDeleteDiagId === d.id}
                      onEdit={() =>
                        startEditingDiag({
                          id: d.id,
                          catalogue_id: d.catalogue_id,
                          comment: d.comment ?? '',
                          is_main: d.is_main ?? false,
                        })
                      }
                      onRequestDelete={() => setConfirmDeleteDiagId(d.id)}
                      onConfirmDelete={() => handleDeleteDiag(d.id)}
                      onCancelDelete={() => setConfirmDeleteDiagId(null)}
                    />
                  </td>
                </tr>
              )
            ))}
          </tbody>
        </table>
      ) : (
        <p className="detail-empty">{t('patient.diagnoses.empty', 'No diagnoses.')}</p>
      )}

      {addingDiag && (
        <div className="ci-add-form">
          <select
            className="detail-input"
            value={diagForm.catalogue_id}
            onChange={(e) => setDiagForm((f) => ({ ...f, catalogue_id: Number(e.target.value) }))}
          >
            {diagCodes.map((c) => (
              <option key={c.id} value={c.id}>{c.key} – {c.name_default}</option>
            ))}
          </select>
          <input
            className="detail-input"
            placeholder={t('taskBoard.columns.comment', 'Comment')}
            value={diagForm.comment}
            onChange={(e) => setDiagForm((f) => ({ ...f, comment: e.target.value }))}
          />
          <label className="detail-checkbox ci-main-check">
            <input
              type="checkbox"
              checked={diagForm.is_main ?? false}
              onChange={(e) => setDiagForm((f) => ({ ...f, is_main: e.target.checked }))}
              disabled={!hasDiagnoses}
            />
            {t('patients.contact.main', 'Main')}
          </label>
          {!hasDiagnoses && (
            <span className="diag-main-hint">{t('patient.diagnoses.firstIsMain', 'First diagnosis is always main.')}</span>
          )}
          <div className="ci-add-actions">
            <button className="save-btn" onClick={handleAddDiag} disabled={diagSaving || !diagForm.catalogue_id}>
              {diagSaving ? t('coordinations.form.saving', 'Saving...') : t('actions.save', 'Save')}
            </button>
            <button className="cancel-btn" onClick={() => setAddingDiag(false)} disabled={diagSaving}>{t('actions.cancel', 'Cancel')}</button>
          </div>
        </div>
      )}
    </section>
  );
}
