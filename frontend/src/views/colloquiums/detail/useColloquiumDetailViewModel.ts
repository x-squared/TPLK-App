import { useColloquiumAgendaManager } from './hooks/useColloquiumAgendaManager';
import { useColloquiumGeneralDetails } from './hooks/useColloquiumGeneralDetails';
import { useColloquiumProtocolDraftSync } from './hooks/useColloquiumProtocolDraftSync';
import type { ColloquiumDetailTab } from './colloquiumDetailViewModelTypes';

export function useColloquiumDetailViewModel(colloqiumId: number, initialTab?: ColloquiumDetailTab) {
  const general = useColloquiumGeneralDetails(colloqiumId, initialTab);
  const agendas = useColloquiumAgendaManager(colloqiumId, general.colloqium?.colloqium_type?.organ_id);

  useColloquiumProtocolDraftSync({
    colloqiumId,
    enabled: Boolean(general.colloqium),
    draftName: general.draftName,
    draftDate: general.draftDate,
    draftParticipants: general.draftParticipants,
    agendaDrafts: agendas.agendaDrafts,
    setDraftName: general.syncDraftFromPayload.setDraftName,
    setDraftDate: general.syncDraftFromPayload.setDraftDate,
    setDraftParticipants: general.syncDraftFromPayload.setDraftParticipants,
    setAgendaDrafts: agendas.setAgendaDrafts,
  });

  return {
    colloqium: general.colloqium,
    loading: general.loading,
    tab: general.tab,
    setTab: general.setTab,
    draftName: general.draftName,
    setDraftName: general.setDraftName,
    draftDate: general.draftDate,
    setDraftDate: general.setDraftDate,
    draftParticipants: general.draftParticipants,
    draftParticipantsPeople: general.draftParticipantsPeople,
    setDraftParticipantsPeople: general.setDraftParticipantsPeople,
    generalEditing: general.generalEditing,
    savingGeneral: general.savingGeneral,
    generalSaveError: general.generalSaveError,
    isGeneralDirty: general.isGeneralDirty,
    saveGeneralDetails: general.saveGeneralDetails,
    startGeneralEditing: general.startGeneralEditing,
    cancelGeneralEditing: general.cancelGeneralEditing,
    agendas: agendas.agendas,
    decisionOptions: agendas.decisionOptions,
    loadingAgendas: agendas.loadingAgendas,
    agendaDrafts: agendas.agendaDrafts,
    setAgendaDrafts: agendas.setAgendaDrafts,
    editingAgendaId: agendas.editingAgendaId,
    agendaSaving: agendas.agendaSaving,
    agendaDeletingId: agendas.agendaDeletingId,
    agendaSaveError: agendas.agendaSaveError,
    agendaForm: agendas.agendaForm,
    setAgendaForm: agendas.setAgendaForm,
    pickerOpen: agendas.pickerOpen,
    setPickerOpen: agendas.setPickerOpen,
    pickerLoading: agendas.pickerLoading,
    pickerRows: agendas.pickerRows,
    patientsById: agendas.patientsById,
    selectedEpisodeLabel: agendas.selectedEpisodeLabel,
    selectedEpisodePreviews: agendas.selectedEpisodePreviews,
    pickerNonSelectableEpisodeIds: agendas.pickerNonSelectableEpisodeIds,
    startAddAgenda: agendas.startAddAgenda,
    startEditAgenda: agendas.startEditAgenda,
    cancelEditAgenda: agendas.cancelEditAgenda,
    saveAgenda: agendas.saveAgenda,
    deleteAgenda: agendas.deleteAgenda,
    openEpisodePicker: agendas.openEpisodePicker,
  };
}
