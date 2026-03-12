import type React from 'react';
import type {
  CoordinationProcurementFlex,
  CoordinationProcurementValue,
  Person,
  PersonTeam,
} from '../../../../api';
import { getConfigFromMetadata } from '../../../../utils/datatypeFramework';
import PersonMultiSelect from '../../../layout/PersonMultiSelect';
import type { DraftsByField } from './helpers';

const FORCED_DATETIME_FIELD_KEYS = new Set([
  'COLD_PERFUSION',
  'COLD_PERFUSION_ABDOMINAL',
]);
const FORCED_BOOLEAN_FIELD_KEYS = new Set([
  'NMP_USED',
  'EVLP_USED',
  'HOPE_USED',
  'LIFEPORT_USED',
]);

interface CoordinationProtocolFieldValueControlProps {
  field: CoordinationProcurementFlex['field_templates'][number];
  valueRow: CoordinationProcurementValue | null;
  stateClass: 'pending' | 'committed' | 'editing';
  savingFieldId: number | null;
  teams: PersonTeam[];
  drafts: DraftsByField;
  setDrafts: React.Dispatch<React.SetStateAction<DraftsByField>>;
  saveValue: (
    fieldId: number,
    payload: { value?: string; person_ids?: number[]; team_ids?: number[]; episode_id?: number | null },
  ) => Promise<void>;
  t: (key: string, fallback: string) => string;
}

export default function CoordinationProtocolFieldValueControl({
  field,
  valueRow,
  stateClass,
  savingFieldId,
  teams,
  drafts,
  setDrafts,
  saveValue,
  t,
}: CoordinationProtocolFieldValueControlProps) {
  const isImplantTeamField = field.key === 'IMPLANT_TEAM';
  if (field.value_mode === 'PERSON_SINGLE') {
    const selected = [...(valueRow?.persons ?? [])]
      .sort((a, b) => a.pos - b.pos)
      .map((entry) => entry.person)
      .filter((entry): entry is Person => !!entry)
      .slice(0, 1);
    return (
      <div className="detail-field coord-proc-field-wide">
        <span className="detail-label">{t(`coordinations.protocolData.fieldsByKey.${field.key}`, field.name_default)}</span>
        <div className={`coord-protocol-data-control ${stateClass}`}>
          <PersonMultiSelect
            selectedPeople={selected}
            onChange={(next) => {
              const single = next.slice(0, 1);
              void saveValue(field.id, { person_ids: single.map((person) => person.id), value: '' });
            }}
            disabled={savingFieldId === field.id}
            disableAdd={selected.length > 0}
          />
        </div>
      </div>
    );
  }
  if (field.value_mode === 'PERSON_LIST') {
    const selected = [...(valueRow?.persons ?? [])]
      .sort((a, b) => a.pos - b.pos)
      .map((entry) => entry.person)
      .filter((entry): entry is Person => !!entry);
    return (
      <div className="detail-field coord-proc-field-wide">
        <span className="detail-label">{t(`coordinations.protocolData.fieldsByKey.${field.key}`, field.name_default)}</span>
        <div className={`coord-protocol-data-control ${stateClass}`}>
          <PersonMultiSelect
            selectedPeople={selected}
            onChange={(next) => {
              void saveValue(field.id, { person_ids: next.map((person) => person.id), value: '' });
            }}
            disabled={savingFieldId === field.id}
          />
        </div>
      </div>
    );
  }
  if (field.value_mode === 'TEAM_LIST' && !isImplantTeamField) {
    const selectedTeams = [...(valueRow?.teams ?? [])]
      .sort((a, b) => a.pos - b.pos)
      .map((entry) => entry.team)
      .filter((entry): entry is PersonTeam => !!entry);
    const selectedTeamIds = new Set(selectedTeams.map((team) => team.id));
    return (
      <div className="detail-field coord-proc-field-wide">
        <span className="detail-label">{t(`coordinations.protocolData.fieldsByKey.${field.key}`, field.name_default)}</span>
        <div className={`coord-proc-team-picker coord-protocol-data-control ${stateClass}`}>
          <div className="person-pill-list">
            {selectedTeams.length === 0 ? (
              <span className="detail-value">{t('common.emptySymbol', '–')}</span>
            ) : (
              selectedTeams.map((team) => (
                <span key={team.id} className="person-pill">
                  {team.name}
                  <button
                    type="button"
                    className="person-pill-remove"
                    onClick={() => {
                      const nextIds = selectedTeams.filter((entry) => entry.id !== team.id).map((entry) => entry.id);
                      void saveValue(field.id, { team_ids: nextIds, value: '' });
                    }}
                    disabled={savingFieldId === field.id}
                    title={t('actions.remove', 'Remove')}
                  >
                    ×
                  </button>
                </span>
              ))
            )}
          </div>
          <select
            className="detail-input"
            defaultValue=""
            onChange={(event) => {
              const nextId = Number(event.target.value);
              if (!nextId || selectedTeamIds.has(nextId)) return;
              const nextIds = [...selectedTeams.map((team) => team.id), nextId];
              void saveValue(field.id, { team_ids: nextIds, value: '' });
              event.currentTarget.value = '';
            }}
            disabled={savingFieldId === field.id}
          >
            <option value="">{t('coordinations.protocolData.team.addTeam', 'Add team...')}</option>
            {teams
              .filter((team) => !selectedTeamIds.has(team.id))
              .map((team) => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
          </select>
        </div>
      </div>
    );
  }
  if (field.value_mode === 'TEAM_SINGLE' || isImplantTeamField) {
    const selectedTeams = [...(valueRow?.teams ?? [])]
      .sort((a, b) => a.pos - b.pos)
      .map((entry) => entry.team)
      .filter((entry): entry is PersonTeam => !!entry)
      .slice(0, 1);
    const selectedTeamIds = new Set(selectedTeams.map((team) => team.id));
    return (
      <div className="detail-field coord-proc-field-wide">
        <span className="detail-label">{t(`coordinations.protocolData.fieldsByKey.${field.key}`, field.name_default)}</span>
        <div className={`coord-proc-team-picker coord-protocol-data-control ${stateClass}`}>
          <div className="person-pill-list">
            {selectedTeams.length === 0 ? (
              <span className="detail-value">{t('common.emptySymbol', '–')}</span>
            ) : (
              selectedTeams.map((team) => (
                <span key={team.id} className="person-pill">
                  {team.name}
                  <button
                    type="button"
                    className="person-pill-remove"
                    onClick={() => {
                      void saveValue(field.id, { team_ids: [], value: '' });
                    }}
                    disabled={savingFieldId === field.id}
                    title={t('actions.remove', 'Remove')}
                  >
                    ×
                  </button>
                </span>
              ))
            )}
          </div>
          <select
            className="detail-input"
            value=""
            onChange={(event) => {
              const nextId = Number(event.target.value);
              if (!nextId) return;
              void saveValue(field.id, { team_ids: [nextId], value: '' });
            }}
            disabled={savingFieldId === field.id}
          >
            <option value="">{t('coordinations.protocolData.team.selectTeam', 'Select team...')}</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id} disabled={selectedTeamIds.has(team.id)}>
                {team.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  }
  const cfg = getConfigFromMetadata(null, field.datatype_definition);
  const isTimestampField = field.key.endsWith('_TIME') || FORCED_DATETIME_FIELD_KEYS.has(field.key);
  const draftValue = drafts[field.id] ?? valueRow?.value ?? '';
  const isBooleanField = !isTimestampField && (cfg.inputType === 'boolean' || FORCED_BOOLEAN_FIELD_KEYS.has(field.key));
  if (isBooleanField) {
    return (
      <div className="detail-field">
        <span className="detail-label">{t(`coordinations.protocolData.fieldsByKey.${field.key}`, field.name_default)}</span>
        <div className={`coord-protocol-data-control coord-protocol-boolean-control ${stateClass}`}>
          <select
            className="detail-input"
            value={draftValue}
            disabled={savingFieldId === field.id}
            onChange={(event) => {
              const nextValue = event.target.value;
              setDrafts((prev) => ({ ...prev, [field.id]: nextValue }));
              if ((valueRow?.value ?? '') === nextValue) return;
              void saveValue(field.id, { value: nextValue, person_ids: [], team_ids: [] });
            }}
          >
            <option value="">{t('common.notSet', 'Not set')}</option>
            <option value="true">{t('common.yes', 'Yes')}</option>
            <option value="false">{t('common.no', 'No')}</option>
          </select>
        </div>
      </div>
    );
  }
  const inputType = isTimestampField
    ? 'datetime-local'
    : cfg.inputType === 'number'
      ? 'number'
      : cfg.inputType === 'date'
        ? 'date'
        : cfg.inputType === 'datetime'
          ? 'datetime-local'
          : 'text';
  return (
    <div className="detail-field">
      <span className="detail-label">{t(`coordinations.protocolData.fieldsByKey.${field.key}`, field.name_default)}</span>
      <input
        type={inputType}
        className={`detail-input coord-protocol-data-input ${stateClass}`}
        value={draftValue}
        step={cfg.step}
        placeholder={cfg.placeholder}
        onChange={(event) => setDrafts((prev) => ({ ...prev, [field.id]: event.target.value }))}
        onBlur={(event) => {
          const nextValue = event.currentTarget.value;
          if ((valueRow?.value ?? '') === nextValue) return;
          void saveValue(field.id, { value: nextValue, person_ids: [], team_ids: [] });
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            event.currentTarget.blur();
          }
        }}
      />
    </div>
  );
}
