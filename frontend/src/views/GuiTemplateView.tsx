import { useState } from 'react'
import { templateViewGuidance } from '@appstack/guiTemplateGuidance'
import { templateRecipientRows } from '@appstack/guiTemplateData'
import { useI18n } from '../i18n/i18n'
import './GuiTemplateView.css'

type TemplateTab = 'sections' | 'tables' | 'forms' | 'detail-tabs' | 'async-states' | 'action-bars' | 'dialogs' | 'i18n-patterns'

export default function GuiTemplateView() {
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState<TemplateTab>('sections')

  return (
    <>
      <header className="patients-header">
        <h1>{t('navigation.dev.guiTemplate', 'GUI Template')}</h1>
      </header>
      <section className="gui-template-card">
        <h2>{t('guiTemplate.intro.heading', 'Template Usage')}</h2>
        <p>{t('guiTemplate.intro.body', 'Use this template as first reference before implementing concrete GUI features.')}</p>
        <ul>
          {templateViewGuidance.view.map((item, index) => (
            <li key={item}>{t(`guiTemplate.guidance.view.${index}`, item)}</li>
          ))}
        </ul>
      </section>

      <nav className="gui-template-tabs" aria-label={t('guiTemplate.tabs.aria', 'Template tabs')}>
        <button
          type="button"
          className={activeTab === 'sections' ? 'active' : ''}
          onClick={() => setActiveTab('sections')}
        >
          {t('guiTemplate.tabs.sections', 'Sections')}
        </button>
        <button
          type="button"
          className={activeTab === 'tables' ? 'active' : ''}
          onClick={() => setActiveTab('tables')}
        >
          {t('guiTemplate.tabs.tables', 'Tables')}
        </button>
        <button
          type="button"
          className={activeTab === 'forms' ? 'active' : ''}
          onClick={() => setActiveTab('forms')}
        >
          {t('guiTemplate.tabs.forms', 'Forms')}
        </button>
        <button
          type="button"
          className={activeTab === 'detail-tabs' ? 'active' : ''}
          onClick={() => setActiveTab('detail-tabs')}
        >
          {t('guiTemplate.tabs.detailTabs', 'DetailTabs')}
        </button>
        <button
          type="button"
          className={activeTab === 'async-states' ? 'active' : ''}
          onClick={() => setActiveTab('async-states')}
        >
          {t('guiTemplate.tabs.asyncStates', 'AsyncStates')}
        </button>
        <button
          type="button"
          className={activeTab === 'action-bars' ? 'active' : ''}
          onClick={() => setActiveTab('action-bars')}
        >
          {t('guiTemplate.tabs.actionBars', 'ActionBars')}
        </button>
        <button
          type="button"
          className={activeTab === 'dialogs' ? 'active' : ''}
          onClick={() => setActiveTab('dialogs')}
        >
          {t('guiTemplate.tabs.dialogs', 'Dialogs')}
        </button>
        <button
          type="button"
          className={activeTab === 'i18n-patterns' ? 'active' : ''}
          onClick={() => setActiveTab('i18n-patterns')}
        >
          {t('guiTemplate.tabs.i18nPatterns', 'i18nTextPatterns')}
        </button>
      </nav>

      {activeTab === 'sections' ? (
        <section className="gui-template-card">
          <h3>{t('guiTemplate.sections.heading', 'How Sections are built')}</h3>
          <p>{t('guiTemplate.sections.body', 'A section should own one concern and keep behavior in the related view-model hook.')}</p>
          <ul>
            {templateViewGuidance.sections.map((item, index) => (
              <li key={item}>{t(`guiTemplate.guidance.sections.${index}`, item)}</li>
            ))}
          </ul>
          <div className="gui-template-example-strip">
            <div>{t('guiTemplate.sections.example.header', 'Example: Header + Actions')}</div>
            <div>{t('guiTemplate.sections.example.filters', 'Example: Filter section')}</div>
            <div>{t('guiTemplate.sections.example.detail', 'Example: Detail section')}</div>
          </div>
        </section>
      ) : null}

      {activeTab === 'tables' ? (
        <section className="gui-template-card">
          <h3>{t('guiTemplate.tables.heading', 'How Tables are built')}</h3>
          <p>{t('guiTemplate.tables.body', 'Use stable columns, explicit empty states, and a dedicated action column.')}</p>
          <ul>
            {templateViewGuidance.tables.map((item, index) => (
              <li key={item}>{t(`guiTemplate.guidance.tables.${index}`, item)}</li>
            ))}
          </ul>
          <div className="gui-template-table-wrap">
            <table className="gui-template-table">
              <thead>
                <tr>
                  <th>{t('guiTemplate.tables.column.pid', 'PID')}</th>
                  <th>{t('guiTemplate.tables.column.firstName', 'First name')}</th>
                  <th>{t('guiTemplate.tables.column.lastName', 'Last name')}</th>
                  <th>{t('guiTemplate.tables.column.bloodType', 'Blood type')}</th>
                  <th>{t('guiTemplate.tables.column.status', 'Status')}</th>
                  <th aria-label={t('guiTemplate.tables.column.action', 'Action')} />
                </tr>
              </thead>
              <tbody>
                {templateRecipientRows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.pid}</td>
                    <td>{row.firstName}</td>
                    <td>{row.lastName}</td>
                    <td>{row.bloodType}</td>
                    <td>{row.status}</td>
                    <td>
                      <button type="button" className="open-btn" disabled>{t('common.open', 'Open')}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {activeTab === 'forms' ? (
        <section className="gui-template-card">
          <h3>{t('guiTemplate.forms.heading', 'Form Template')}</h3>
          <p>{t('guiTemplate.forms.body', 'Reference: recipients add form and preferences save/cancel flow.')}</p>
          <ul>
            {templateViewGuidance.forms.map((item, index) => (
              <li key={item}>{t(`guiTemplate.guidance.forms.${index}`, item)}</li>
            ))}
          </ul>
          <div className="gui-template-form-grid">
            <label>
              {t('guiTemplate.forms.field.pid', 'PID *')}
              <input type="text" value="P-240100" readOnly />
            </label>
            <label>
              {t('guiTemplate.forms.field.firstName', 'First name *')}
              <input type="text" value="Erika" readOnly />
            </label>
            <label>
              {t('guiTemplate.forms.field.lastName', 'Last name *')}
              <input type="text" value="Kunz" readOnly />
            </label>
            <label>
              {t('guiTemplate.forms.field.birthDate', 'Birth date *')}
              <input type="date" value="1988-07-18" readOnly />
            </label>
          </div>
          <div className="gui-template-action-row">
            <button type="button" className="save-btn" disabled>{t('actions.save', 'Save')}</button>
            <button type="button" className="cancel-btn" disabled>{t('actions.cancel', 'Cancel')}</button>
          </div>
          <p className="gui-template-reference">
            {t('guiTemplate.reference.forms', 'TPLK reference: PatientsAddForm + PreferencesView section header pattern.')}
          </p>
        </section>
      ) : null}

      {activeTab === 'detail-tabs' ? (
        <section className="gui-template-card">
          <h3>{t('guiTemplate.detailTabs.heading', 'Detail Tabs Template')}</h3>
          <p>{t('guiTemplate.detailTabs.body', 'Reference: PatientDetailTabs and CoordinationDetailTabs tab composition.')}</p>
          <ul>
            {templateViewGuidance.detailTabs.map((item, index) => (
              <li key={item}>{t(`guiTemplate.guidance.detailTabs.${index}`, item)}</li>
            ))}
          </ul>
          <nav className="detail-tabs">
            <button type="button" className="detail-tab active">{t('guiTemplate.detailTabs.example.tabA', 'Patient')}</button>
            <button type="button" className="detail-tab">{t('guiTemplate.detailTabs.example.tabB', 'Episodes')}</button>
            <button type="button" className="detail-tab">{t('guiTemplate.detailTabs.example.tabC', 'Medical')}</button>
          </nav>
          <div className="gui-template-tab-preview">
            {t('guiTemplate.detailTabs.example.preview', 'Active tab renders one focused panel composition.')}
          </div>
        </section>
      ) : null}

      {activeTab === 'async-states' ? (
        <section className="gui-template-card">
          <h3>{t('guiTemplate.asyncStates.heading', 'Async State Template')}</h3>
          <p>{t('guiTemplate.asyncStates.body', 'Reference: list/detail screens with loading, empty, error and ready states.')}</p>
          <ul>
            {templateViewGuidance.asyncStates.map((item, index) => (
              <li key={item}>{t(`guiTemplate.guidance.asyncStates.${index}`, item)}</li>
            ))}
          </ul>
          <div className="gui-template-state-grid">
            <div><strong>{t('guiTemplate.asyncStates.loading', 'Loading')}</strong><p>{t('common.loading', 'Loading...')}</p></div>
            <div><strong>{t('guiTemplate.asyncStates.empty', 'Empty')}</strong><p>{t('patients.emptyFiltered', 'No patients match the filter.')}</p></div>
            <div><strong>{t('guiTemplate.asyncStates.error', 'Error')}</strong><p>{t('guiTemplate.asyncStates.errorText', 'Could not load data. Please retry.')}</p></div>
            <div><strong>{t('guiTemplate.asyncStates.ready', 'Ready')}</strong><p>{t('guiTemplate.asyncStates.readyText', 'Data loaded and actions enabled.')}</p></div>
          </div>
        </section>
      ) : null}

      {activeTab === 'action-bars' ? (
        <section className="gui-template-card">
          <h3>{t('guiTemplate.actionBars.heading', 'Action Bar Template')}</h3>
          <p>{t('guiTemplate.actionBars.body', 'Reference: patients header actions and toolbar-style grouped actions.')}</p>
          <ul>
            {templateViewGuidance.actionBars.map((item, index) => (
              <li key={item}>{t(`guiTemplate.guidance.actionBars.${index}`, item)}</li>
            ))}
          </ul>
          <div className="gui-template-action-row">
            <button type="button" className="patients-add-btn">{t('guiTemplate.actionBars.primary', '+ Primary action')}</button>
            <button type="button" className="patients-add-btn">{t('guiTemplate.actionBars.secondary', 'Secondary action')}</button>
            <button type="button" className="patients-add-btn" disabled>{t('guiTemplate.actionBars.disabled', 'Disabled while saving')}</button>
          </div>
        </section>
      ) : null}

      {activeTab === 'dialogs' ? (
        <section className="gui-template-card">
          <h3>{t('guiTemplate.dialogs.heading', 'Dialog Template')}</h3>
          <p>{t('guiTemplate.dialogs.body', 'Reference: PatientsImportDialog and read-only detail dialogs in DEV workflows.')}</p>
          <ul>
            {templateViewGuidance.dialogs.map((item, index) => (
              <li key={item}>{t(`guiTemplate.guidance.dialogs.${index}`, item)}</li>
            ))}
          </ul>
          <section className="patients-import-dialog gui-template-dialog-preview" role="dialog" aria-modal="true">
            <header className="patients-import-header">
              <h2>{t('guiTemplate.dialogs.preview.title', 'Preview dialog')}</h2>
            </header>
            <p>{t('guiTemplate.dialogs.preview.body', 'Dialogs should show context, action intent, and safe cancel path.')}</p>
            <div className="patients-import-actions">
              <button type="button" className="patients-save-btn" disabled>{t('actions.save', 'Save')}</button>
              <button type="button" className="patients-cancel-btn" disabled>{t('actions.cancel', 'Cancel')}</button>
            </div>
          </section>
        </section>
      ) : null}

      {activeTab === 'i18n-patterns' ? (
        <section className="gui-template-card">
          <h3>{t('guiTemplate.i18n.heading', 'i18n Text Pattern Template')}</h3>
          <p>{t('guiTemplate.i18n.body', 'Reference: all visible text must use t(key, englishDefault).')}</p>
          <ul>
            {templateViewGuidance.i18nTextPatterns.map((item, index) => (
              <li key={item}>{t(`guiTemplate.guidance.i18n.${index}`, item)}</li>
            ))}
          </ul>
          <pre className="gui-template-code">
{`// preferred
<h1>{t('patients.title', 'Patients')}</h1>

// avoid
<h1>Patients</h1>`}
          </pre>
        </section>
      ) : null}
    </>
  )
}
