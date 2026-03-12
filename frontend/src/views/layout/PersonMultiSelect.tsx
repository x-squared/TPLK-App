import { useEffect, useMemo, useState } from 'react';

import { api, type Person } from '../../api';
import { toUserErrorMessage } from '../../api/error';
import { useI18n } from '../../i18n/i18n';
import ErrorBanner from './ErrorBanner';

interface PersonMultiSelectProps {
  selectedPeople: Person[];
  onChange: (next: Person[]) => void;
  disabled?: boolean;
  disableAdd?: boolean;
}

export default function PersonMultiSelect({
  selectedPeople,
  onChange,
  disabled = false,
  disableAdd = false,
}: PersonMultiSelectProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Person[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createFirstName, setCreateFirstName] = useState('');
  const [createSurname, setCreateSurname] = useState('');
  const [createUserId, setCreateUserId] = useState('');

  const selectedById = useMemo(() => new Set(selectedPeople.map((person) => person.id)), [selectedPeople]);
  const availableSuggestions = useMemo(
    () => suggestions.filter((person) => !selectedById.has(person.id)),
    [selectedById, suggestions],
  );

  useEffect(() => {
    let active = true;
    const normalized = query.trim();
    if (!normalized) {
      setSuggestions([]);
      return () => {
        active = false;
      };
    }
    setLoading(true);
    setError('');
    api.searchPersons(normalized)
      .then((rows) => {
        if (!active) return;
        setSuggestions(rows);
      })
      .catch((err) => {
        if (!active) return;
        setError(toUserErrorMessage(err, t('personMultiSelect.errors.search', 'Could not search people.')));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [query]);

  const addPerson = (person: Person) => {
    if (selectedById.has(person.id)) {
      setQuery('');
      return;
    }
    onChange([...selectedPeople, person]);
    setQuery('');
    setSuggestions([]);
    setError('');
  };

  const removePerson = (personId: number) => {
    onChange(selectedPeople.filter((person) => person.id !== personId));
  };

  const canCreate = createFirstName.trim().length > 0 && createSurname.trim().length > 0;
  const addDisabled = disabled || disableAdd;

  const createPerson = async () => {
    if (!canCreate || addDisabled) return;
    setError('');
    try {
      const created = await api.createPerson({
        first_name: createFirstName.trim(),
        surname: createSurname.trim(),
        user_id: createUserId.trim() || null,
      });
      addPerson(created);
      setCreateFirstName('');
      setCreateSurname('');
      setCreateUserId('');
    } catch (err) {
      setError(toUserErrorMessage(err, t('personMultiSelect.errors.create', 'Could not create person.')));
    }
  };

  return (
    <div className="person-multi-select">
      <div className="person-pill-list">
        {selectedPeople.length === 0 ? (
          <span className="detail-value">{t('common.emptySymbol', '–')}</span>
        ) : (
          selectedPeople.map((person) => (
            <span key={person.id} className="person-pill">
              {`${person.first_name} ${person.surname}`.trim()}
              <button
                type="button"
                className="person-pill-remove"
                onClick={() => removePerson(person.id)}
                disabled={disabled}
                title={t('actions.remove', 'Remove')}
              >
                ×
              </button>
            </span>
          ))
        )}
      </div>

      <input
        className="detail-input"
        type="text"
        placeholder={t('personMultiSelect.searchPlaceholder', 'Search by first name, surname, or user ID')}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Tab' && availableSuggestions.length > 0) {
            event.preventDefault();
            addPerson(availableSuggestions[0]);
          }
        }}
        disabled={addDisabled}
      />

      {query.trim() && (
        <div className="person-suggestion-list">
          {loading ? (
            <div className="status">{t('personMultiSelect.searching', 'Searching...')}</div>
          ) : availableSuggestions.length > 0 ? (
            availableSuggestions.map((person) => (
              <button
                key={person.id}
                type="button"
                className="person-suggestion-item"
                onClick={() => addPerson(person)}
                disabled={addDisabled}
              >
                <strong>{`${person.first_name} ${person.surname}`.trim()}</strong>
                <span>{person.user_id || t('personMultiSelect.noUserId', 'no user ID')}</span>
              </button>
            ))
          ) : (
            <div className="person-create-box">
              <div className="status">{t('personMultiSelect.noMatchCreate', 'No match found. Create new person:')}</div>
              <div className="person-create-grid">
                <input
                  className="detail-input"
                  type="text"
                  placeholder={t('patients.addForm.firstNameRequired', 'First name *')}
                  value={createFirstName}
                  onChange={(event) => setCreateFirstName(event.target.value)}
                  disabled={addDisabled}
                />
                <input
                  className="detail-input"
                  type="text"
                  placeholder={t('personMultiSelect.surnameRequired', 'Surname *')}
                  value={createSurname}
                  onChange={(event) => setCreateSurname(event.target.value)}
                  disabled={addDisabled}
                />
                <input
                  className="detail-input"
                  type="text"
                  placeholder={t('personMultiSelect.userIdOptional', 'User ID (optional, up to 12 chars)')}
                  maxLength={12}
                  value={createUserId}
                  onChange={(event) => setCreateUserId(event.target.value)}
                  disabled={addDisabled}
                />
                <button type="button" className="patients-save-btn" onClick={() => void createPerson()} disabled={!canCreate || addDisabled}>
                  {t('personMultiSelect.createAndAdd', 'Create & Add')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <ErrorBanner message={error} />
    </div>
  );
}
