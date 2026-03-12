import { formatEpisodeDetailValue, isDateField, toFieldLabel } from './episodeDetailUtils';
import type { EpisodeDetailForm } from './types';

type Entry = readonly [string, unknown];

interface EpisodeDetailGridProps {
  entries: Entry[];
  labelPrefix?: string;
  editing: boolean;
  detailForm: EpisodeDetailForm;
  setDetailForm: React.Dispatch<React.SetStateAction<EpisodeDetailForm>>;
  formatDate: (iso: string | null) => string;
}

export default function EpisodeDetailGrid({
  entries,
  labelPrefix,
  editing,
  detailForm,
  setDetailForm,
  formatDate,
}: EpisodeDetailGridProps) {
  return (
    <div className="episode-detail-grid">
      {entries.map(([key, value]) => (
        <div key={key} className="episode-detail-field">
          <span className="episode-detail-label">{toFieldLabel(key, labelPrefix)}</span>
          {editing ? (
            typeof value === 'boolean' ? (
              <label className="detail-checkbox">
                <input
                  type="checkbox"
                  checked={Boolean(detailForm[key])}
                  onChange={(e) => setDetailForm((f) => ({ ...f, [key]: e.target.checked }))}
                />
              </label>
            ) : (
              <input
                className="detail-input"
                type={isDateField(key) ? 'date' : 'text'}
                value={String(detailForm[key] ?? '')}
                onChange={(e) =>
                  setDetailForm((f) => ({
                    ...f,
                    [key]: isDateField(key) ? (e.target.value || null) : e.target.value,
                  }))
                }
              />
            )
          ) : (
            <span className="episode-detail-value">{formatEpisodeDetailValue(key, value, formatDate)}</span>
          )}
        </div>
      ))}
    </div>
  );
}
