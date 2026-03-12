import type { ColloqiumType } from '../../../api';
import { useI18n } from '../../../i18n/i18n';
import ErrorBanner from '../../layout/ErrorBanner';
import PersonMultiSelect from '../../layout/PersonMultiSelect';
import type { ColloquiumCreateFormState } from './listTypes';

interface Props {
  form: ColloquiumCreateFormState;
  types: ColloqiumType[];
  creating: boolean;
  error: string;
  onChange: (next: ColloquiumCreateFormState) => void;
  onSave: () => void;
  onCancel: () => void;
}

export default function ColloquiumsAddForm({
  form,
  types,
  creating,
  error,
  onChange,
  onSave,
  onCancel,
}: Props) {
  const { t } = useI18n();
  const canSave = !!form.colloqium_type_id && !!form.date && !creating;
  const selectedNames = form.participants_people
    .map((person) => `${person.first_name} ${person.surname}`.trim())
    .filter((name) => name.length > 0)
    .join(', ');

  return (
    <div className="patients-add-form colloquiums-add-form">
      <div className="colloquiums-add-row colloquiums-add-row-primary">
        <select
          className="filter-select"
          value={form.colloqium_type_id}
          onChange={(e) => {
            const value = e.target.value;
            const selectedType = types.find((type) => String(type.id) === value);
            onChange({
              ...form,
              colloqium_type_id: value,
              participant_ids: selectedType?.participant_ids ?? [],
              participants_people: selectedType?.participants_people ?? [],
            });
          }}
        >
          <option value="">Type *</option>
          {types.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={form.date}
          onChange={(e) => onChange({ ...form, date: e.target.value })}
        />
        <div className="patients-add-actions">
          <button className="patients-save-btn" onClick={onSave} disabled={!canSave}>
            {creating ? 'Saving...' : 'Save'}
          </button>
          <button className="patients-cancel-btn" onClick={onCancel} disabled={creating}>
            Cancel
          </button>
        </div>
      </div>
      <div className="colloquiums-add-row colloquiums-add-row-secondary">
        <div className="colloquiums-add-names-picker">
          <PersonMultiSelect
            selectedPeople={form.participants_people}
            onChange={(next) => onChange({
              ...form,
              participant_ids: next.map((person) => person.id),
              participants_people: next,
            })}
            disabled={creating}
          />
        </div>
        <div className="colloquiums-add-selected-names">
          {selectedNames || t('common.emptySymbol', '–')}
        </div>
      </div>
      <ErrorBanner message={error} />
    </div>
  );
}

