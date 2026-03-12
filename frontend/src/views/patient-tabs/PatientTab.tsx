import './PatientTab.css';
import AbsencesSection from './patient/AbsencesSection';
import ContactsSection from './patient/ContactsSection';
import PatientDataSection from './patient/PatientDataSection';
import type { PatientTabProps } from './patient/types';

export default function PatientTab(props: PatientTabProps) {
  const { patient, formatDate, core, contacts, absences } = props;

  return (
    <div className="detail-tab-content">
      <PatientDataSection
        patient={patient}
        editing={core.editing}
        startEditing={core.startEditing}
        saving={core.saving}
        handleSave={core.handleSave}
        cancelEditing={core.cancelEditing}
        form={core.form}
        setForm={core.setForm}
        setField={core.setField}
        formatDate={formatDate}
        languages={core.languages}
        sexCodes={core.sexCodes}
        coordUsers={core.coordUsers}
      />

      <ContactsSection
        addingContact={contacts.addingContact}
        setAddingContact={contacts.setAddingContact}
        sortedContactInfos={contacts.sortedContactInfos}
        editingCiId={contacts.editingCiId}
        ciEditForm={contacts.ciEditForm}
        setCiEditForm={contacts.setCiEditForm}
        ciSaving={contacts.ciSaving}
        handleSaveCi={contacts.handleSaveCi}
        cancelEditingCi={contacts.cancelEditingCi}
        ciDragId={contacts.ciDragId}
        ciDragOverId={contacts.ciDragOverId}
        setCiDragId={contacts.setCiDragId}
        setCiDragOverId={contacts.setCiDragOverId}
        handleCiDrop={contacts.handleCiDrop}
        startEditingCi={contacts.startEditingCi}
        confirmDeleteId={contacts.confirmDeleteId}
        setConfirmDeleteId={contacts.setConfirmDeleteId}
        handleDeleteContact={contacts.handleDeleteContact}
        contactTypes={contacts.contactTypes}
        ciForm={contacts.ciForm}
        setCiForm={contacts.setCiForm}
        handleAddContact={contacts.handleAddContact}
      />

      <AbsencesSection
        addingAbsence={absences.addingAbsence}
        setAddingAbsence={absences.setAddingAbsence}
        sortedAbsences={absences.sortedAbsences}
        editingAbId={absences.editingAbId}
        abEditForm={absences.abEditForm}
        setAbEditForm={absences.setAbEditForm}
        abSaving={absences.abSaving}
        handleSaveAb={absences.handleSaveAb}
        cancelEditingAb={absences.cancelEditingAb}
        startEditingAb={absences.startEditingAb}
        confirmDeleteAbId={absences.confirmDeleteAbId}
        setConfirmDeleteAbId={absences.setConfirmDeleteAbId}
        handleDeleteAbsence={absences.handleDeleteAbsence}
        abForm={absences.abForm}
        setAbForm={absences.setAbForm}
        handleAddAbsence={absences.handleAddAbsence}
        formatDate={formatDate}
      />
    </div>
  );
}
