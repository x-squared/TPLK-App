import { useI18n } from '../i18n/i18n';
import { formatDate } from './patients/patientsViewUtils';
import { useDonorsViewModel } from './donors/useDonorsViewModel';
import './DonorsView.css';

export default function DonorsView() {
  const { t } = useI18n();
  const {
    loading,
    error,
    rows,
    selected,
    selectedId,
    setSelectedId,
    filterAny,
    setFilterAny,
    recipientOptions,
    patients,
    organCodes,
    relationCodes,
    statusCodes,
    addingProcess,
    setAddingProcess,
    savingProcess,
    processError,
    donorError,
    createForm,
    setCreateForm,
    editForm,
    setEditForm,
    newDonorForm,
    setNewDonorForm,
    closeDateInput,
    setCloseDateInput,
    toggleOrgan,
    createProcess,
    saveOverview,
    closeProcess,
    addDonor,
    updateDonor,
    statusOptionsForDonor,
  } = useDonorsViewModel(t);

  return (
    <>
      <header className="patients-header">
        <h1>{t('donors.title', 'Donors???')}</h1>
        <button
          className="patients-add-btn"
          onClick={() => setAddingProcess((prev) => !prev)}
          disabled={savingProcess}
        >
          {addingProcess
            ? t('actions.cancel', 'Cancel')
            : t('donors.actions.addProcess', '+ Add process')}
        </button>
      </header>

      <div className="filter-bar">
        <input
          type="text"
          value={filterAny}
          onChange={(event) => setFilterAny(event.target.value)}
          placeholder={t('donors.filters.search', 'Search by recipient, donor, organ, status')}
        />
      </div>

      {addingProcess && (
        <section className="patients-add-form">
          <label>
            {t('donors.fields.recipientEpisode', 'Recipient episode')}
            <select
              className="filter-select"
              value={createForm.recipient_episode_id}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, recipient_episode_id: event.target.value }))}
            >
              <option value="">{t('taskBoard.filters.all', 'All')}</option>
              {recipientOptions.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.patient ? `${entry.patient.first_name} ${entry.patient.name} (${entry.patient.pid})` : `#${entry.id}`}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('donors.fields.startDate', 'Start date')}
            <input
              type="date"
              value={createForm.start}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, start: event.target.value }))}
            />
          </label>
          <label className="donors-organs-group">
            <span>{t('donors.fields.organs', 'Donation organs')}</span>
            <div className="donors-organs-options">
              {organCodes.map((organ) => (
                <label key={organ.id}>
                  <input
                    type="checkbox"
                    checked={createForm.organ_ids.includes(organ.id)}
                    onChange={() => toggleOrgan(organ.id, 'create')}
                  />
                  {organ.name_default}
                </label>
              ))}
            </div>
          </label>
          <label className="donors-comment-field">
            {t('donors.fields.comment', 'Comment')}
            <input
              type="text"
              value={createForm.comment}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, comment: event.target.value }))}
            />
          </label>
          <div className="patients-add-actions">
            <button className="patients-save-btn" onClick={() => void createProcess()} disabled={savingProcess}>
              {t('actions.save', 'Save')}
            </button>
          </div>
          {processError && <p className="patients-add-error">{processError}</p>}
        </section>
      )}

      {loading ? (
        <p className="status">{t('common.loading', 'Loading...')}</p>
      ) : error ? (
        <p className="status">{error}</p>
      ) : rows.length === 0 ? (
        <p className="status">{t('donors.empty', 'No living donation processes found.')}</p>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('donors.table.recipient', 'Recipient')}</th>
                <th>{t('donors.table.organs', 'Organs')}</th>
                <th>{t('donors.table.donors', 'Donors')}</th>
                <th>{t('donors.table.start', 'Start')}</th>
                <th>{t('donors.table.end', 'End')}</th>
                <th className="open-col" aria-label={t('common.open', 'Open')} />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const recipientLabel = row.recipient_episode?.patient
                  ? `${row.recipient_episode.patient.first_name} ${row.recipient_episode.patient.name} (${row.recipient_episode.patient.pid})`
                  : t('donors.table.noRecipient', 'No recipient episode');
                return (
                  <tr key={row.id} className={selectedId === row.id ? 'row-expanded' : ''}>
                    <td>{recipientLabel}</td>
                    <td>{row.organs.map((entry) => entry.name_default).join(', ') || '–'}</td>
                    <td>
                      <details>
                        <summary>
                          {t('donors.table.donorCount', '{{count}} donor(s)').replace('{{count}}', String(row.donors.length))}
                        </summary>
                        <ul className="donors-inline-list">
                          {row.donors.map((donor) => (
                            <li key={donor.id}>
                              {(donor.donor_patient
                                ? `${donor.donor_patient.first_name} ${donor.donor_patient.name} (${donor.donor_patient.pid})`
                                : `#${donor.donor_patient_id}`)}
                              {' - '}
                              {donor.status?.name_default ?? '–'}
                            </li>
                          ))}
                        </ul>
                      </details>
                    </td>
                    <td>{formatDate(row.start)}</td>
                    <td>{formatDate(row.end)}</td>
                    <td className="open-col">
                      <button className="open-btn" onClick={() => setSelectedId(row.id)} aria-label={t('common.open', 'Open')}>
                        {selectedId === row.id ? '▾' : '▸'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <section className="detail-section donors-detail-section">
          <div className="detail-section-heading">
            <h2>{t('donors.detail.title', 'Living donation process details')}</h2>
          </div>
          <div className="donors-detail-grid">
            <label>
              {t('donors.fields.recipientEpisode', 'Recipient episode')}
              <select
                className="filter-select"
                value={editForm.recipient_episode_id}
                onChange={(event) => setEditForm((prev) => ({ ...prev, recipient_episode_id: event.target.value }))}
                disabled={savingProcess}
              >
                <option value="">{t('taskBoard.filters.all', 'All')}</option>
                {recipientOptions.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.patient ? `${entry.patient.first_name} ${entry.patient.name} (${entry.patient.pid})` : `#${entry.id}`}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('donors.fields.startDate', 'Start date')}
              <input
                type="date"
                value={editForm.start}
                onChange={(event) => setEditForm((prev) => ({ ...prev, start: event.target.value }))}
                disabled={savingProcess}
              />
            </label>
            <label>
              {t('donors.fields.endDate', 'End date')}
              <input type="date" value={selected.end ?? ''} disabled />
            </label>
            <label className="donors-organs-group">
              <span>{t('donors.fields.organs', 'Donation organs')}</span>
              <div className="donors-organs-options">
                {organCodes.map((organ) => (
                  <label key={organ.id}>
                    <input
                      type="checkbox"
                      checked={editForm.organ_ids.includes(organ.id)}
                      onChange={() => toggleOrgan(organ.id, 'edit')}
                      disabled={savingProcess}
                    />
                    {organ.name_default}
                  </label>
                ))}
              </div>
            </label>
            <label className="donors-comment-field">
              {t('donors.fields.comment', 'Comment')}
              <input
                type="text"
                value={editForm.comment}
                onChange={(event) => setEditForm((prev) => ({ ...prev, comment: event.target.value }))}
                disabled={savingProcess}
              />
            </label>
          </div>
          <div className="patients-add-actions donors-detail-actions">
            <button className="patients-save-btn" onClick={() => void saveOverview()} disabled={savingProcess}>
              {t('actions.save', 'Save')}
            </button>
          </div>
          <div className="donors-close-row">
            <label>
              {t('donors.fields.closeDate', 'Close date')}
              <input
                type="date"
                value={closeDateInput}
                onChange={(event) => setCloseDateInput(event.target.value)}
                disabled={savingProcess}
              />
            </label>
            <button
              className="patients-cancel-btn"
              onClick={() => void closeProcess()}
              disabled={savingProcess || !closeDateInput}
            >
              {t('donors.actions.closeProcess', 'Close process')}
            </button>
          </div>
          {processError && <p className="patients-add-error">{processError}</p>}

          <h3>{t('donors.detail.donors', 'Donors')}</h3>
          {selected.donors.length === 0 ? (
            <p className="status">{t('donors.detail.noDonors', 'No donors linked yet.')}</p>
          ) : (
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('donors.table.donor', 'Donor')}</th>
                    <th>{t('donors.table.relation', 'Relation')}</th>
                    <th>{t('donors.table.status', 'Status')}</th>
                    <th>{t('donors.table.comment', 'Comment')}</th>
                    <th>{t('actions.save', 'Save')}</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.donors.map((donor) => {
                    const donorRelationValue = donor.relation_id ? String(donor.relation_id) : '';
                    const donorStatusValue = String(donor.status_id);
                    return (
                      <tr key={donor.id}>
                        <td>
                          {donor.donor_patient
                            ? `${donor.donor_patient.first_name} ${donor.donor_patient.name} (${donor.donor_patient.pid})`
                            : `#${donor.donor_patient_id}`}
                        </td>
                        <td>
                          <select
                            className="filter-select"
                            defaultValue={donorRelationValue}
                            onChange={(event) => {
                              const relationId = event.target.value ? Number(event.target.value) : null;
                              void updateDonor(donor, { relation_id: relationId });
                            }}
                            disabled={savingProcess}
                          >
                            <option value="">{t('donors.relation.none', 'No relation')}</option>
                            {relationCodes.map((code) => (
                              <option key={code.id} value={code.id}>{code.name_default}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select
                            className="filter-select"
                            defaultValue={donorStatusValue}
                            onChange={(event) => void updateDonor(donor, { status_id: Number(event.target.value) })}
                            disabled={savingProcess}
                          >
                            {statusOptionsForDonor(donor).map((code) => (
                              <option key={code.id} value={code.id}>{code.name_default}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            type="text"
                            defaultValue={donor.comment}
                            onBlur={(event) => void updateDonor(donor, { comment: event.target.value })}
                            disabled={savingProcess}
                          />
                        </td>
                        <td>✓</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <section className="patients-add-form donors-add-donor-form">
            <label>
              {t('donors.fields.donorPatient', 'Donor patient')}
              <select
                className="filter-select"
                value={newDonorForm.donor_patient_id}
                onChange={(event) => setNewDonorForm((prev) => ({ ...prev, donor_patient_id: event.target.value }))}
              >
                <option value="">{t('donors.actions.selectDonorPatient', 'Select donor patient')}</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.first_name} {patient.name} ({patient.pid})
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('donors.table.relation', 'Relation')}
              <select
                className="filter-select"
                value={newDonorForm.relation_id}
                onChange={(event) => setNewDonorForm((prev) => ({ ...prev, relation_id: event.target.value }))}
              >
                <option value="">{t('donors.relation.none', 'No relation')}</option>
                {relationCodes.map((code) => (
                  <option key={code.id} value={code.id}>{code.name_default}</option>
                ))}
              </select>
            </label>
            <label>
              {t('donors.table.status', 'Status')}
              <select
                className="filter-select"
                value={newDonorForm.status_id}
                onChange={(event) => setNewDonorForm((prev) => ({ ...prev, status_id: event.target.value }))}
              >
                <option value="">{t('donors.actions.defaultRegistered', 'Default: Registered')}</option>
                {statusCodes
                  .filter((code) => code.key === 'REGISTERED')
                  .map((code) => (
                    <option key={code.id} value={code.id}>{code.name_default}</option>
                  ))}
              </select>
            </label>
            <label>
              {t('donors.fields.comment', 'Comment')}
              <input
                type="text"
                value={newDonorForm.comment}
                onChange={(event) => setNewDonorForm((prev) => ({ ...prev, comment: event.target.value }))}
              />
            </label>
            <button
              className="patients-save-btn"
              onClick={() => void addDonor()}
              disabled={savingProcess || !newDonorForm.donor_patient_id}
            >
              {t('donors.actions.addDonor', 'Add donor')}
            </button>
          </section>
          {donorError && <p className="patients-add-error">{donorError}</p>}
        </section>
      )}
    </>
  );
}
