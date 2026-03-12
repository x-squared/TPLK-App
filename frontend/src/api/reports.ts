import { request } from './core';

export type ReportSourceKey = 'PATIENT' | 'EPISODE' | 'MEDICAL_VALUE' | 'COORDINATION';
export type ReportValueType = 'string' | 'number' | 'date' | 'datetime' | 'boolean';
export type ReportOperatorKey = 'eq' | 'contains' | 'gte' | 'lte';
export type ReportSortDirection = 'asc' | 'desc';

export interface ReportFieldOption {
  key: string;
  label: string;
  value_type: ReportValueType;
  operators: ReportOperatorKey[];
}

export interface ReportJoinOption {
  key: string;
  label: string;
  fields: ReportFieldOption[];
}

export interface ReportSourceOption {
  key: ReportSourceKey;
  label: string;
  fields: ReportFieldOption[];
  joins: ReportJoinOption[];
}

export interface ReportMetadataResponse {
  sources: ReportSourceOption[];
}

export interface ReportFilterInput {
  field: string;
  operator: ReportOperatorKey;
  value: string;
}

export interface ReportSortInput {
  field: string;
  direction: ReportSortDirection;
}

export interface ReportExecuteRequest {
  source: ReportSourceKey;
  select: string[];
  joins: string[];
  filters: ReportFilterInput[];
  sort: ReportSortInput[];
  limit: number;
}

export interface ReportColumn {
  key: string;
  label: string;
}

export interface ReportExecuteResponse {
  source: ReportSourceKey;
  columns: ReportColumn[];
  rows: Record<string, string>[];
  row_count: number;
}

export const reportsApi = {
  getReportMetadata: () => request<ReportMetadataResponse>('/reports/metadata'),
  executeReport: (payload: ReportExecuteRequest) =>
    request<ReportExecuteResponse>('/reports/execute', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
