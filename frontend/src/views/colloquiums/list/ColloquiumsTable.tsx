import { Fragment } from 'react';
import type { Colloqium, ColloqiumAgenda } from '../../../api';
import { translateCodeLabel } from '../../../i18n/codeTranslations';
import { useI18n } from '../../../i18n/i18n';

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

interface Props {
  rows: Colloqium[];
  expandedAgendaColloqiumId: number | null;
  agendasByColloqium: Record<number, ColloqiumAgenda[]>;
  loadingAgendasByColloqium: Record<number, boolean>;
  onOpenColloqium: (colloqiumId: number) => void;
  onToggleAgenda: (colloqiumId: number) => void;
}

function agendaEpisodeSummary(agendas: ColloqiumAgenda[], emptyText: string): string {
  if (agendas.length === 0) return emptyText;
  return agendas
    .map((agenda) => agenda.episode?.fall_nr || `#${agenda.episode_id}`)
    .join(', ');
}

export default function ColloquiumsTable({
  rows,
  expandedAgendaColloqiumId,
  agendasByColloqium,
  loadingAgendasByColloqium,
  onOpenColloqium,
  onToggleAgenda,
}: Props) {
  const { t } = useI18n();
  return (
    <div className="patients-table-wrap ui-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th className="open-col"></th>
            <th>{t('colloquiums.table.type', 'Type')}</th>
            <th>{t('colloquiums.table.name', 'Name')}</th>
            <th>{t('colloquiums.table.date', 'Date')}</th>
            <th>{t('colloquiums.table.agenda', 'Agenda')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => {
            const isAgendaExpanded = expandedAgendaColloqiumId === item.id;
            const agendas = agendasByColloqium[item.id] ?? [];
            const loadingAgenda = loadingAgendasByColloqium[item.id] === true;
            return (
              <Fragment key={item.id}>
                <tr
                  onDoubleClick={() => onOpenColloqium(item.id)}
                >
                  <td className="open-col">
                    <button
                      className="open-btn"
                      onClick={() => onOpenColloqium(item.id)}
                      title={t('colloquiums.actions.open', 'Open colloquium')}
                    >
                      &#x279C;
                    </button>
                  </td>
                  <td>{translateCodeLabel(t, item.colloqium_type?.organ)}</td>
                  <td>{item.colloqium_type?.name ?? t('common.emptySymbol', '–')}</td>
                  <td>{formatDate(item.date)}</td>
                  <td>
                    <button
                      className="link-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleAgenda(item.id);
                      }}
                    >
                      {isAgendaExpanded ? t('taskBoard.filters.hide', 'Hide') : t('taskBoard.filters.show', 'Show')}
                    </button>
                  </td>
                </tr>
                {isAgendaExpanded && (
                  <tr className="contact-row">
                    <td colSpan={5}>
                      <div className="contact-section">
                        {loadingAgenda ? (
                          <p className="contact-empty">{t('colloquiums.agenda.loading', 'Loading agenda...')}</p>
                        ) : (
                          <p className="contact-empty">{agendaEpisodeSummary(agendas, t('colloquiums.agenda.empty', 'No agenda entries.'))}</p>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

