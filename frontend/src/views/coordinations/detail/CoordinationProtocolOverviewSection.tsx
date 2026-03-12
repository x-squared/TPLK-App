import type { Code } from '../../../api';
import { translateCodeLabel } from '../../../i18n/codeTranslations';
import { useI18n } from '../../../i18n/i18n';

export interface ProtocolOverviewEntry {
  id: number;
  patientId: number | null;
  episodeId: number | null;
  assignmentSlotLabel: string;
  expectedOrganIds: number[];
  isOrganRejected: boolean;
  recipientName: string;
  fallNr: string;
  birthDate: string;
  mainDiagnosis: string;
  rsNr: string;
  tplDate: string;
  procurementTeam: string;
  perfusionDone: boolean;
  perfusionApplied: string;
}

interface ProtocolOverviewGroup {
  organ: Code;
  entries: ProtocolOverviewEntry[];
}

interface Props {
  groups: ProtocolOverviewGroup[];
  onOpenPatientEpisode: (patientId: number, episodeId: number) => void;
}

export default function CoordinationProtocolOverviewSection({ groups, onOpenPatientEpisode }: Props) {
  const { t } = useI18n();
  const getOrganLabel = (organ: Code): string => translateCodeLabel(t, organ);
  return (
    <section className="detail-section ui-panel-section">
      <div className="detail-section-heading">
        <h2>{t('coordinations.protocolOverview.title', 'Protocol Overview')}</h2>
      </div>
      <div className="coord-protocol-overview">
        {groups.length === 0 ? (
          <p className="detail-empty">{t('coordinations.protocolOverview.noOrgans', 'No organs found.')}</p>
        ) : (
          groups.map(({ organ, entries }) => (
            <fieldset key={organ.id} className="coord-protocol-organ-box">
              <legend>{getOrganLabel(organ)}</legend>
              {entries.length === 0 ? (
                <p className="detail-empty">{t('coordinations.protocolOverview.noDataForOrgan', 'No protocol data for this organ.')}</p>
              ) : (
                entries.map((entry) => (
                  <div key={entry.id} className="coord-protocol-entry">
                    <div className="coord-protocol-entry-actions">
                      <button
                        className="coord-protocol-open-btn"
                        onClick={() => {
                          if (entry.patientId != null && entry.episodeId != null) {
                            onOpenPatientEpisode(entry.patientId, entry.episodeId);
                          }
                        }}
                        disabled={entry.patientId == null || entry.episodeId == null}
                        title={t('coordinations.protocolOverview.openLinkedEpisode', 'Open linked episode')}
                      >
                        {t('coordinations.protocolOverview.open', 'Open')}
                      </button>
                    </div>
                    <div className="coord-protocol-entry-grid">
                      <div className="detail-field">
                        <span className="detail-label">{t('coordinations.protocolOverview.recipientFullName', 'Recipient full name')}</span>
                        <span className="detail-value">{entry.recipientName}</span>
                      </div>
                      <div className="detail-field">
                        <span className="detail-label">{t('coordinations.protocolOverview.assignmentSlot', 'Assignment slot')}</span>
                        <span className="detail-value">{entry.assignmentSlotLabel}</span>
                      </div>
                      <div className="detail-field">
                        <span className="detail-label">{t('coordinations.protocolOverview.fallNumber', 'Fallnummer')}</span>
                        <span className="detail-value">{entry.fallNr}</span>
                      </div>
                      <div className="detail-field">
                        <span className="detail-label">{t('coordinations.table.dateOfBirth', 'Date of Birth')}</span>
                        <span className="detail-value">{entry.birthDate}</span>
                      </div>
                      <div className="detail-field">
                        <span className="detail-label">{t('coordinations.protocolOverview.mainDiagnosis', 'Diagnosis (main)')}</span>
                        <span className="detail-value">{entry.mainDiagnosis}</span>
                      </div>
                      <div className="detail-field">
                        <span className="detail-label">{t('coordinations.protocolOverview.rsNumber', 'RS-nr')}</span>
                        <span className="detail-value">{entry.rsNr}</span>
                      </div>
                      <div className="detail-field">
                        <span className="detail-label">{t('coordinations.protocolOverview.tplDate', 'TPL date')}</span>
                        <span className="detail-value">{entry.tplDate}</span>
                      </div>
                      <div className="detail-field">
                        <span className="detail-label">{t('coordinations.protocolOverview.procurementTeam', 'Procurement team')}</span>
                        <span className="detail-value">{entry.procurementTeam}</span>
                      </div>
                      <div className="detail-field">
                        <span className="detail-label">{t('coordinations.protocolOverview.perfusionApplied', 'Perfusion applied')}</span>
                        <span className="detail-value">
                          {entry.perfusionApplied}
                          {entry.perfusionDone ? (
                            <span className="coord-protocol-badge" title={t('coordinations.protocolOverview.perfusionApplied', 'Perfusion applied')}>
                              {t('coordinations.protocolOverview.perfusion', 'Perfusion')}
                            </span>
                          ) : null}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </fieldset>
          ))
        )}
      </div>
    </section>
  );
}
