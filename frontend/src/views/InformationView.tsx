import InformationRowsSection from './information/InformationRowsSection';
import { useInformationViewModel } from './information/useInformationViewModel';
import { useI18n } from '../i18n/i18n';
import './layout/PanelLayout.css';
import './InformationView.css';

export default function InformationView() {
  const { t } = useI18n();
  const model = useInformationViewModel();

  return (
    <>
      <header className="patients-header">
        <h1>{t('information.title', 'Information')}</h1>
      </header>
      <InformationRowsSection model={model} />
    </>
  );
}
