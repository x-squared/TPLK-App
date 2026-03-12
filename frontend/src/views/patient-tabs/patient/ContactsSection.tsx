import type { PatientContactsModel } from '../../patient-detail/PatientDetailTabs';
import { translateCodeLabel } from '../../../i18n/codeTranslations';
import { useI18n } from '../../../i18n/i18n';
import InlineDeleteActions from '../../layout/InlineDeleteActions';

type ContactsSectionProps = PatientContactsModel;

export default function ContactsSection({
  addingContact,
  setAddingContact,
  sortedContactInfos,
  editingCiId,
  ciEditForm,
  setCiEditForm,
  ciSaving,
  handleSaveCi,
  cancelEditingCi,
  ciDragId,
  ciDragOverId,
  setCiDragId,
  setCiDragOverId,
  handleCiDrop,
  startEditingCi,
  confirmDeleteId,
  setConfirmDeleteId,
  handleDeleteContact,
  contactTypes,
  ciForm,
  setCiForm,
  handleAddContact,
}: ContactsSectionProps) {
  const { t } = useI18n();
  return (
    <section className="detail-section">
      <div className="detail-section-heading">
        <h2>{t('patient.contacts.title', 'Contact Information')}</h2>
        {!addingContact && (
          <button className="ci-add-btn" onClick={() => setAddingContact(true)}>{t('information.actions.add', '+ Add')}</button>
        )}
      </div>
      {sortedContactInfos.length > 0 ? (
        <table className="detail-contact-table">
          <tbody>
            {sortedContactInfos.map((ci) => (
              editingCiId === ci.id ? (
                <tr key={ci.id} className="ci-editing-row">
                  <td className="detail-ci-main">
                    <label className="detail-checkbox">
                      <input
                        type="checkbox"
                        checked={ciEditForm.main ?? false}
                        onChange={(e) => setCiEditForm((f) => ({ ...f, main: e.target.checked }))}
                      />
                    </label>
                  </td>
                  <td className="detail-ci-type">
                    <select
                      className="detail-input ci-inline-input"
                      value={ciEditForm.type_id}
                        onChange={(e) => setCiEditForm((f) => ({ ...f, type_id: Number(e.target.value) }))}
                    >
                      {contactTypes.map((c: any) => (
                        <option key={c.id} value={c.id}>{translateCodeLabel(t, c)}</option>
                      ))}
                    </select>
                  </td>
                  <td className="detail-ci-data">
                    <input
                      className="detail-input ci-inline-input"
                      value={ciEditForm.data ?? ''}
                        onChange={(e) => setCiEditForm((f) => ({ ...f, data: e.target.value }))}
                    />
                  </td>
                  <td className="detail-ci-comment">
                    <input
                      className="detail-input ci-inline-input"
                      value={ciEditForm.comment ?? ''}
                        onChange={(e) => setCiEditForm((f) => ({ ...f, comment: e.target.value }))}
                    />
                  </td>
                  <td className="detail-ci-actions">
                    <button className="ci-save-inline" onClick={handleSaveCi} disabled={ciSaving}>✓</button>
                    <button className="ci-cancel-inline" onClick={cancelEditingCi} disabled={ciSaving}>✕</button>
                  </td>
                </tr>
              ) : (
                <tr
                  key={ci.id}
                  draggable={editingCiId === null}
                  onDragStart={() => setCiDragId(ci.id)}
                  onDragOver={(e) => { e.preventDefault(); setCiDragOverId(ci.id); }}
                  onDragLeave={() => setCiDragOverId((prev) => prev === ci.id ? null : prev)}
                  onDrop={() => handleCiDrop(ci.id)}
                  onDragEnd={() => { setCiDragId(null); setCiDragOverId(null); }}
                  onDoubleClick={() => startEditingCi(ci)}
                  className={ciDragId === ci.id ? 'ci-dragging' : ciDragOverId === ci.id ? 'ci-drag-over' : ''}
                >
                  <td className="detail-ci-main">
                    {ci.main && <span className="main-badge">{t('patients.contact.main', 'Main')}</span>}
                  </td>
                  <td className="detail-ci-type">{translateCodeLabel(t, ci.type)}</td>
                  <td className="detail-ci-data">{ci.data}</td>
                  <td className="detail-ci-comment">{ci.comment || ''}</td>
                  <td className="detail-ci-actions">
                    <InlineDeleteActions
                      confirming={confirmDeleteId === ci.id}
                      onEdit={() => startEditingCi(ci)}
                      onRequestDelete={() => setConfirmDeleteId(ci.id)}
                      onConfirmDelete={() => handleDeleteContact(ci.id)}
                      onCancelDelete={() => setConfirmDeleteId(null)}
                    />
                  </td>
                </tr>
              )
            ))}
          </tbody>
        </table>
      ) : (
        <p className="detail-empty">{t('patients.contact.empty', 'No contact information.')}</p>
      )}

      {addingContact && (
        <div className="ci-add-form">
          <select
            className="detail-input"
            value={ciForm.type_id}
            onChange={(e) => setCiForm((f) => ({ ...f, type_id: Number(e.target.value) }))}
          >
            {contactTypes.map((c: any) => (
              <option key={c.id} value={c.id}>{translateCodeLabel(t, c)}</option>
            ))}
          </select>
          <input
            className="detail-input"
            placeholder={t('patient.contacts.data', 'Data')}
            value={ciForm.data}
            onChange={(e) => setCiForm((f) => ({ ...f, data: e.target.value }))}
          />
          <input
            className="detail-input"
            placeholder={t('taskBoard.columns.comment', 'Comment')}
            value={ciForm.comment}
            onChange={(e) => setCiForm((f) => ({ ...f, comment: e.target.value }))}
          />
          <label className="detail-checkbox ci-main-check">
            <input
              type="checkbox"
              checked={ciForm.main}
              onChange={(e) => setCiForm((f) => ({ ...f, main: e.target.checked }))}
            />
            {t('patients.contact.main', 'Main')}
          </label>
          <div className="ci-add-actions">
            <button className="save-btn" onClick={handleAddContact} disabled={ciSaving || !ciForm.data.trim()}>
              {ciSaving ? t('coordinations.form.saving', 'Saving...') : t('actions.save', 'Save')}
            </button>
            <button className="cancel-btn" onClick={() => setAddingContact(false)} disabled={ciSaving}>{t('actions.cancel', 'Cancel')}</button>
          </div>
        </div>
      )}
    </section>
  );
}
