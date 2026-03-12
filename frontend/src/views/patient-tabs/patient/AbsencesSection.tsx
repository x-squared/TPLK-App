import type { PatientAbsencesModel } from '../../patient-detail/PatientDetailTabs';
import { useI18n } from '../../../i18n/i18n';
import InlineDeleteActions from '../../layout/InlineDeleteActions';

type AbsencesSectionProps = PatientAbsencesModel & {
  formatDate: (iso: string | null) => string;
};

export default function AbsencesSection({
  addingAbsence,
  setAddingAbsence,
  sortedAbsences,
  editingAbId,
  abEditForm,
  setAbEditForm,
  abSaving,
  handleSaveAb,
  cancelEditingAb,
  startEditingAb,
  confirmDeleteAbId,
  setConfirmDeleteAbId,
  handleDeleteAbsence,
  abForm,
  setAbForm,
  handleAddAbsence,
  formatDate,
}: AbsencesSectionProps) {
  const { t } = useI18n();
  return (
    <section className="detail-section">
      <div className="detail-section-heading">
        <h2>{t('patient.absences.title', 'Absences')}</h2>
        {!addingAbsence && (
          <button className="ci-add-btn" onClick={() => setAddingAbsence(true)}>{t('information.actions.add', '+ Add')}</button>
        )}
      </div>
      {sortedAbsences.length > 0 ? (
        <table className="detail-contact-table">
          <tbody>
            {sortedAbsences.map((ab) => (
              editingAbId === ab.id ? (
                <tr key={ab.id} className="ci-editing-row">
                  <td className="ab-date">
                    <input
                      className="detail-input ci-inline-input"
                      type="date"
                      value={abEditForm.start ?? ''}
                      onChange={(e) => setAbEditForm((f) => ({ ...f, start: e.target.value }))}
                    />
                  </td>
                  <td className="ab-date">
                    <input
                      className="detail-input ci-inline-input"
                      type="date"
                      value={abEditForm.end ?? ''}
                      onChange={(e) => setAbEditForm((f) => ({ ...f, end: e.target.value }))}
                    />
                  </td>
                  <td className="ab-comment">
                    <input
                      className="detail-input ci-inline-input"
                      value={abEditForm.comment ?? ''}
                      onChange={(e) => setAbEditForm((f) => ({ ...f, comment: e.target.value }))}
                    />
                  </td>
                  <td className="detail-ci-actions">
                    <button className="ci-save-inline" onClick={handleSaveAb} disabled={abSaving || !abEditForm.start || !abEditForm.end || abEditForm.end < abEditForm.start}>✓</button>
                    <button className="ci-cancel-inline" onClick={cancelEditingAb} disabled={abSaving}>✕</button>
                  </td>
                </tr>
              ) : (
                <tr key={ab.id} onDoubleClick={() => startEditingAb(ab)}>
                  <td className="ab-date">{formatDate(ab.start)}</td>
                  <td className="ab-date">{formatDate(ab.end)}</td>
                  <td className="ab-comment">{ab.comment || ''}</td>
                  <td className="detail-ci-actions">
                    <InlineDeleteActions
                      confirming={confirmDeleteAbId === ab.id}
                      onEdit={() => startEditingAb(ab)}
                      onRequestDelete={() => setConfirmDeleteAbId(ab.id)}
                      onConfirmDelete={() => handleDeleteAbsence(ab.id)}
                      onCancelDelete={() => setConfirmDeleteAbId(null)}
                    />
                  </td>
                </tr>
              )
            ))}
          </tbody>
        </table>
      ) : (
        <p className="detail-empty">{t('patient.absences.empty', 'No absences.')}</p>
      )}

      {addingAbsence && (
        <div className="ci-add-form">
          <input
            className="detail-input"
            type="date"
            value={abForm.start}
            onChange={(e) => setAbForm((f) => ({ ...f, start: e.target.value }))}
          />
          <input
            className="detail-input"
            type="date"
            value={abForm.end}
            onChange={(e) => setAbForm((f) => ({ ...f, end: e.target.value }))}
          />
          <input
            className="detail-input"
            placeholder={t('taskBoard.columns.comment', 'Comment')}
            value={abForm.comment}
            onChange={(e) => setAbForm((f) => ({ ...f, comment: e.target.value }))}
          />
          <div className="ci-add-actions">
            <button className="save-btn" onClick={handleAddAbsence} disabled={abSaving || !abForm.start || !abForm.end || abForm.end < abForm.start}>
              {abSaving ? t('coordinations.form.saving', 'Saving...') : t('actions.save', 'Save')}
            </button>
            <button className="cancel-btn" onClick={() => setAddingAbsence(false)} disabled={abSaving}>{t('actions.cancel', 'Cancel')}</button>
          </div>
        </div>
      )}
    </section>
  );
}
