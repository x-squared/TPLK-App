import type { Person } from '../../../api';

export interface ColloquiumsFilterState {
  typeId: string;
  anchorDate: string;
  rangeDays: number;
}

export interface ColloquiumsListRangeFilterState {
  anchorDate: string;
  rangeDays: number;
}

export interface ColloquiumCreateFormState {
  colloqium_type_id: string;
  date: string;
  participant_ids: number[];
  participants_people: Person[];
}

