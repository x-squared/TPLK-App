import './MedicalDataTab.css';
import DiagnosesSection from './medical/DiagnosesSection';
import MedicalValuesSection from './medical/MedicalValuesSection';
import type { MedicalDataTabProps } from './medical/types';

export default function MedicalDataTab(props: MedicalDataTabProps) {
  const { patient, formatDate, diagnoses, medicalValues } = props;

  return (
    <>
      <DiagnosesSection
        patient={patient}
        addingDiag={diagnoses.addingDiag}
        setAddingDiag={diagnoses.setAddingDiag}
        diagCodes={diagnoses.diagCodes}
        diagForm={diagnoses.diagForm}
        setDiagForm={diagnoses.setDiagForm}
        diagSaving={diagnoses.diagSaving}
        handleAddDiag={diagnoses.handleAddDiag}
        editingDiagId={diagnoses.editingDiagId}
        diagEditForm={diagnoses.diagEditForm}
        setDiagEditForm={diagnoses.setDiagEditForm}
        handleSaveDiag={diagnoses.handleSaveDiag}
        cancelEditingDiag={diagnoses.cancelEditingDiag}
        startEditingDiag={diagnoses.startEditingDiag}
        confirmDeleteDiagId={diagnoses.confirmDeleteDiagId}
        setConfirmDeleteDiagId={diagnoses.setConfirmDeleteDiagId}
        handleDeleteDiag={diagnoses.handleDeleteDiag}
        formatDate={formatDate}
      />

      <MedicalValuesSection
        addingMv={medicalValues.addingMv}
        setAddingMv={medicalValues.setAddingMv}
        handleAddAllMv={medicalValues.handleAddAllMv}
        mvSaving={medicalValues.mvSaving}
        sortedMedicalValues={medicalValues.sortedMedicalValues}
        groupedMedicalValues={medicalValues.groupedMedicalValues}
        medicalValueGroups={medicalValues.medicalValueGroups}
        toggleMvSort={medicalValues.toggleMvSort}
        mvSortIndicator={medicalValues.mvSortIndicator}
        editingMvId={medicalValues.editingMvId}
        mvEditForm={medicalValues.mvEditForm}
        setMvEditForm={medicalValues.setMvEditForm}
        mvTemplates={medicalValues.mvTemplates}
        renderValueInput={medicalValues.renderValueInput}
        resolveDt={medicalValues.resolveDt}
        handleSaveMv={medicalValues.handleSaveMv}
        cancelEditingMv={medicalValues.cancelEditingMv}
        validateValue={medicalValues.validateValue}
        confirmDeleteMvId={medicalValues.confirmDeleteMvId}
        setConfirmDeleteMvId={medicalValues.setConfirmDeleteMvId}
        handleDeleteMv={medicalValues.handleDeleteMv}
        startEditingMv={medicalValues.startEditingMv}
        mvSortKey={medicalValues.mvSortKey}
        mvSortAsc={medicalValues.mvSortAsc}
        mvDragId={medicalValues.mvDragId}
        mvDragOverId={medicalValues.mvDragOverId}
        setMvDragId={medicalValues.setMvDragId}
        setMvDragOverId={medicalValues.setMvDragOverId}
        handleMvDrop={medicalValues.handleMvDrop}
        formatValue={medicalValues.formatValue}
        formatDate={formatDate}
        catalogueCache={medicalValues.catalogueCache}
        getCatalogueType={medicalValues.getCatalogueType}
        mvAddMode={medicalValues.mvAddMode}
        setMvAddMode={medicalValues.setMvAddMode}
        mvForm={medicalValues.mvForm}
        setMvForm={medicalValues.setMvForm}
        datatypeCodes={medicalValues.datatypeCodes}
        handleAddMv={medicalValues.handleAddMv}
        editingGroupRenewId={medicalValues.editingGroupRenewId}
        groupRenewDraft={medicalValues.groupRenewDraft}
        setGroupRenewDraft={medicalValues.setGroupRenewDraft}
        startEditingGroupRenew={medicalValues.startEditingGroupRenew}
        cancelEditingGroupRenew={medicalValues.cancelEditingGroupRenew}
        saveGroupRenewDate={medicalValues.saveGroupRenewDate}
      />
    </>
  );
}
