import type { Colloqium, ColloqiumAgenda } from '../../../api';
import { useI18n } from '../../../i18n/i18n';
import ColloquiumsFilters from './ColloquiumsFilters';
import ColloquiumsTable from './ColloquiumsTable';
import type { ColloquiumsListRangeFilterState } from './listTypes';

interface Props {
  loading: boolean;
  rows: Colloqium[];
  filters: ColloquiumsListRangeFilterState;
  onChangeFilters: (next: ColloquiumsListRangeFilterState) => void;
  expandedAgendaColloqiumId: number | null;
  agendasByColloqium: Record<number, ColloqiumAgenda[]>;
  loadingAgendasByColloqium: Record<number, boolean>;
  onOpenColloqium: (id: number) => void;
  onToggleAgenda: (id: number) => void;
}

export default function ColloquiumsListView({
  loading,
  rows,
  filters,
  onChangeFilters,
  expandedAgendaColloqiumId,
  agendasByColloqium,
  loadingAgendasByColloqium,
  onOpenColloqium,
  onToggleAgenda,
}: Props) {
  const { t } = useI18n();
  return (
    <>
      <ColloquiumsFilters filters={filters} onChange={onChangeFilters} />
      {loading ? (
        <p className="status">{t('common.loading', 'Loading...')}</p>
      ) : rows.length === 0 ? (
        <p className="status">{t('colloquiums.emptyFiltered', 'No colloquiums match the filter.')}</p>
      ) : (
        <ColloquiumsTable
          rows={rows}
          expandedAgendaColloqiumId={expandedAgendaColloqiumId}
          agendasByColloqium={agendasByColloqium}
          loadingAgendasByColloqium={loadingAgendasByColloqium}
          onOpenColloqium={onOpenColloqium}
          onToggleAgenda={onToggleAgenda}
        />
      )}
    </>
  );
}
