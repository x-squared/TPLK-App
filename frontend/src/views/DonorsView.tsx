import { useI18n } from '../i18n/i18n';
import './DonorsView.css';

export default function DonorsView() {
  const { t } = useI18n();
  return (
    <section className="detail-section ui-panel-section">
      <header className="donors-view-header">
        <h1>{t('donors.title', 'Donors!')}</h1>
        <p className="subtitle">{t('donors.notImplemented', 'This view is not implemented yet.')}</p>
        <div className="donors-view-smile" aria-hidden="true">😊</div>
      </header>
    </section>
  );
}
