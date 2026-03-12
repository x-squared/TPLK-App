import type { PatientDetailTab } from './patient-detail/PatientDetailTabs';
import { useI18n } from '../i18n/i18n';
import PatientDetailTabs from './patient-detail/PatientDetailTabs';
import { formatPatientFavoriteName } from './layout/episodeDisplay';
import FavoriteButton from './layout/FavoriteButton';
import { useFavoriteToggle } from './layout/useFavoriteToggle';
import { usePatientDetailViewModel } from './patient-detail/usePatientDetailViewModel';
import './layout/PanelLayout.css';
import './PatientDetailView.css';

interface Props {
  patientId: number;
  onBack: () => void;
  initialTab?: PatientDetailTab;
  initialEpisodeId?: number | null;
  onOpenColloqium: (colloqiumId: number) => void;
  onTabChange?: (tab: PatientDetailTab) => void;
}

export default function PatientDetailView({
  patientId,
  onBack,
  initialTab,
  initialEpisodeId,
  onOpenColloqium,
  onTabChange,
}: Props) {
  const { t } = useI18n();
  const model = usePatientDetailViewModel(patientId, initialTab, initialEpisodeId ?? null, onOpenColloqium);
  const patientFavorite = useFavoriteToggle(model.patient ? {
    favorite_type_key: 'PATIENT',
    patient_id: model.patient.id,
    context_json: JSON.stringify({ patient_tab: model.tabsProps?.tab ?? 'patient' }),
    name: formatPatientFavoriteName({
      fullName: `${model.patient.first_name} ${model.patient.name}`.trim(),
      birthDate: model.patient.date_of_birth,
      pid: model.patient.pid,
    }),
  } : null);

  if (model.loading) {
    return <p className="status">{t('common.loading', 'Loading...')}</p>;
  }

  if (!model.patient || !model.tabsProps) {
    return <p className="status">{t('patientDetail.notFound', 'Patient not found.')}</p>;
  }

  const tabsProps = {
    ...model.tabsProps,
    setTab: (tab: PatientDetailTab) => {
      model.tabsProps?.setTab(tab);
      onTabChange?.(tab);
    },
  };

  return (
    <div className="patient-detail">
      <div className="ui-detail-heading">
        <button className="ui-back-btn" onClick={onBack} title={t('common.backToList', 'Back to list')}>&larr;</button>
        <div className="ui-heading-title-with-favorite">
          <h1>{model.patient.first_name} {model.patient.name}</h1>
          <FavoriteButton
            active={patientFavorite.isFavorite}
            disabled={patientFavorite.loading || patientFavorite.saving}
            onClick={() => void patientFavorite.toggle()}
            title={patientFavorite.isFavorite
              ? t('patientDetail.favorites.removePatient', 'Remove patient from favorites')
              : t('patientDetail.favorites.addPatient', 'Add patient to favorites')}
          />
        </div>
      </div>
      <PatientDetailTabs {...tabsProps} />
    </div>
  );
}
