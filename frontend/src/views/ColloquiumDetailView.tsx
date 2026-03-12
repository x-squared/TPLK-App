import ColloquiumDetailTabs from './colloquiums/detail/ColloquiumDetailTabs';
import type { ColloquiumDetailTab } from './colloquiums/detail/colloquiumDetailViewModelTypes';
import FavoriteButton from './layout/FavoriteButton';
import { useFavoriteToggle } from './layout/useFavoriteToggle';
import { useColloquiumDetailViewModel } from './colloquiums/detail/useColloquiumDetailViewModel';
import './layout/PanelLayout.css';
import './PatientDetailView.css';
import './PatientsView.css';
import './ColloquiumsView.css';

interface Props {
  colloqiumId: number;
  onBack: () => void;
  onOpenEpisode: (patientId: number, episodeId: number) => void;
  initialTab?: ColloquiumDetailTab;
  onTabChange?: (tab: ColloquiumDetailTab) => void;
  standalone?: boolean;
}

export default function ColloquiumDetailView({
  colloqiumId,
  onBack,
  onOpenEpisode,
  initialTab,
  onTabChange,
  standalone = false,
}: Props) {
  const model = useColloquiumDetailViewModel(colloqiumId, initialTab);
  const colloquiumFavorite = useFavoriteToggle(model.colloqium ? {
    favorite_type_key: 'COLLOQUIUM',
    colloqium_id: model.colloqium.id,
    context_json: JSON.stringify({ colloquium_tab: model.tab }),
    name: `${model.colloqium.colloqium_type?.name ?? 'Colloquium'} (${model.colloqium.date})`,
  } : null);

  const openDetachedProtocol = () => {
    const url = `${window.location.origin}${window.location.pathname}?protocol=${colloqiumId}`;
    window.open(url, '_blank', 'popup=yes,width=1200,height=900');
  };

  return (
    <ColloquiumDetailTabs
      loading={model.loading}
      colloqium={model.colloqium}
      tab={model.tab}
      setTab={(tab) => {
        model.setTab(tab);
        onTabChange?.(tab);
      }}
      onBack={onBack}
      standalone={standalone}
      onOpenDetachedProtocol={openDetachedProtocol}
      favoriteControl={(
        <FavoriteButton
          active={colloquiumFavorite.isFavorite}
          disabled={colloquiumFavorite.loading || colloquiumFavorite.saving}
          onClick={() => void colloquiumFavorite.toggle()}
          title={colloquiumFavorite.isFavorite ? 'Remove colloquium from favorites' : 'Add colloquium to favorites'}
        />
      )}
      draftName={model.draftName}
      draftDate={model.draftDate}
      draftParticipants={model.draftParticipants}
      draftParticipantsPeople={model.draftParticipantsPeople}
      loadingAgendas={model.loadingAgendas}
      agendas={model.agendas}
      decisionOptions={model.decisionOptions}
      agendaDrafts={model.agendaDrafts}
      editingAgendaId={model.editingAgendaId}
      agendaSaving={model.agendaSaving}
      agendaDeletingId={model.agendaDeletingId}
      agendaSaveError={model.agendaSaveError}
      agendaForm={model.agendaForm}
      selectedEpisodePreviews={model.selectedEpisodePreviews}
      selectedEpisodeLabel={model.selectedEpisodeLabel}
      pickerOpen={model.pickerOpen}
      pickerRows={model.pickerRows}
      pickerLoading={model.pickerLoading}
      pickerNonSelectableEpisodeIds={model.pickerNonSelectableEpisodeIds}
      patientsById={model.patientsById}
      generalEditing={model.generalEditing}
      savingGeneral={model.savingGeneral}
      isGeneralDirty={model.isGeneralDirty}
      generalSaveError={model.generalSaveError}
      setDraftName={model.setDraftName}
      setDraftDate={model.setDraftDate}
      setDraftParticipantsPeople={model.setDraftParticipantsPeople}
      saveGeneralDetails={model.saveGeneralDetails}
      startGeneralEditing={model.startGeneralEditing}
      cancelGeneralEditing={model.cancelGeneralEditing}
      startAddAgenda={model.startAddAgenda}
      startEditAgenda={model.startEditAgenda}
      cancelEditAgenda={model.cancelEditAgenda}
      saveAgenda={model.saveAgenda}
      deleteAgenda={model.deleteAgenda}
      openEpisodePicker={model.openEpisodePicker}
      onOpenEpisode={onOpenEpisode}
      setPickerOpen={model.setPickerOpen}
      setAgendaForm={model.setAgendaForm}
      setAgendaDrafts={model.setAgendaDrafts}
    />
  );
}

