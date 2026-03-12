import { useI18n } from '../../../i18n/i18n';
import type { ColloquiumsListRangeFilterState } from './listTypes';

interface Props {
  filters: ColloquiumsListRangeFilterState;
  onChange: (next: ColloquiumsListRangeFilterState) => void;
}

export default function ColloquiumsFilters({ filters, onChange }: Props) {
  const { t } = useI18n();
  return (
    <div className="filter-bar colloquiums-filter-bar">
      <label className="colloquiums-filter-field">
        {t('colloquiums.filters.anchorDate', 'Anchor Date')}
        <input
          className="colloquiums-filter-control"
          type="date"
          value={filters.anchorDate}
          onChange={(e) => onChange({ ...filters, anchorDate: e.target.value })}
        />
      </label>
      <label className="colloquiums-filter-field">
        {t('colloquiums.filters.rangeDays', 'Range (days)')}
        <input
          className="colloquiums-filter-control"
          type="number"
          min={0}
          value={filters.rangeDays}
          onChange={(e) => onChange({ ...filters, rangeDays: Number(e.target.value || 0) })}
          placeholder="0"
        />
      </label>
    </div>
  );
}

