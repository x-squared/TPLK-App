import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../../../i18n/i18n';

export interface CoordinationEpisodePickerRow {
  episodeId: number;
  patientName: string;
  patientPid: string;
  patientDateOfBirth: string | null;
  episodeLabel: string;
  statusLabel: string;
  organsLabel: string;
  basicValuesByColumn: Record<string, string>;
  detailValuesByColumn: Record<string, string>;
}

interface CoordinationEpisodePickerDialogProps {
  open: boolean;
  loading: boolean;
  organLabel: string;
  rows: CoordinationEpisodePickerRow[];
  basicColumns: string[];
  detailColumns: string[];
  selectedEpisodeId: number | null;
  onClose: () => void;
  onSelect: (episodeId: number) => void;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '–';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}.${m}.${y}`;
}

export default function CoordinationEpisodePickerDialog({
  open,
  loading,
  organLabel,
  rows,
  basicColumns,
  detailColumns,
  selectedEpisodeId,
  onClose,
  onSelect,
}: CoordinationEpisodePickerDialogProps) {
  const { t } = useI18n();
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (open) setSearch('');
  }, [open]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) => {
      const searchParts = [
        row.patientName,
        row.patientPid,
        row.patientDateOfBirth ?? '',
        row.episodeLabel,
        row.organsLabel,
        ...basicColumns.map((column) => row.basicValuesByColumn[column] ?? ''),
        ...detailColumns.map((column) => row.detailValuesByColumn[column] ?? ''),
      ];
      return searchParts.join(' ').toLowerCase().includes(query);
    });
  }, [rows, search]);

  if (!open) return null;

  return (
    <div className="coord-episode-picker-overlay" role="dialog" aria-modal="true" aria-label={t('coordinations.protocolData.episodePicker.title', 'Select recipient episode')}>
      <div className="coord-episode-picker-dialog">
        <header className="coord-episode-picker-header">
          <h3>{t('coordinations.protocolData.episodePicker.title', 'Select recipient episode')} ({organLabel})</h3>
          <button type="button" className="patients-cancel-btn" onClick={onClose}>
            {t('actions.close', 'Close')}
          </button>
        </header>

        <div className="coord-episode-picker-toolbar">
          <input
            type="text"
            className="detail-input"
            placeholder={t('coordinations.protocolData.episodePicker.searchPlaceholder', 'Search across all visible columns')}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="coord-episode-picker-body">
          {loading ? (
            <p className="status">{t('coordinations.protocolData.episodePicker.loading', 'Loading eligible patients and medical data...')}</p>
          ) : filteredRows.length === 0 ? (
            <p className="status">{t('coordinations.protocolData.episodePicker.empty', 'No matching eligible patients found.')}</p>
          ) : (
            <div className="coord-episode-picker-table-wrap ui-table-wrap">
              <table className="data-table coord-episode-picker-table">
                <thead>
                  <tr>
                    <th>{t('coordinations.protocolData.episodePicker.columns.select', 'Select')}</th>
                    <th>{t('patients.table.name', 'Name')}</th>
                    <th>{t('patients.table.pid', 'PID')}</th>
                    <th>{t('patients.table.dateOfBirth', 'Date of Birth')}</th>
                    <th>{t('episodePicker.episode', 'Episode')}</th>
                    <th>{t('coordinations.table.status', 'Status')}</th>
                    <th>{t('coordinations.protocolData.episodePicker.columns.organs', 'Organs')}</th>
                    {basicColumns.map((column) => (
                      <th key={`basic-${column}`}>{column}</th>
                    ))}
                    {detailColumns.map((column) => (
                      <th key={`rest-${column}`}>{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => {
                    const isSelected = row.episodeId === selectedEpisodeId;
                    return (
                      <tr key={row.episodeId} className={isSelected ? 'row-expanded' : ''}>
                        <td>
                          <button
                            type="button"
                            className="patients-save-btn coord-episode-picker-select-btn"
                            onClick={() => onSelect(row.episodeId)}
                            title={t('coordinations.protocolData.episodePicker.selectAction', 'Select episode')}
                          >
                            {t('coordinations.protocolData.episodePicker.selectActionShort', '->')}
                          </button>
                        </td>
                        <td>{row.patientName || t('common.emptySymbol', '–')}</td>
                        <td>{row.patientPid || t('common.emptySymbol', '–')}</td>
                        <td>{formatDate(row.patientDateOfBirth)}</td>
                        <td>{row.episodeLabel || t('common.emptySymbol', '–')}</td>
                        <td>{row.statusLabel || t('common.emptySymbol', '–')}</td>
                        <td>{row.organsLabel || t('common.emptySymbol', '–')}</td>
                        {basicColumns.map((column) => (
                          <td key={`b-${row.episodeId}-${column}`}>{row.basicValuesByColumn[column] ?? t('common.emptySymbol', '–')}</td>
                        ))}
                        {detailColumns.map((column) => (
                          <td key={`r-${row.episodeId}-${column}`}>{row.detailValuesByColumn[column] ?? t('common.emptySymbol', '–')}</td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

